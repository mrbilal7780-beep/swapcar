import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// We use OpenAI directly for vision analysis (user-provided key, gpt-4o-mini).
// Falls back to Lovable AI Gateway if OPENAI_API_KEY isn't set.
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callOpenAI(body: any) {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`OpenAI ${res.status}: ${t.slice(0, 300)}`);
    }
    return res.json();
  }
  // Fallback: Lovable AI Gateway with equivalent Gemini model
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (!lovableKey) throw new Error("No AI key configured");
  const fallbackBody = { ...body, model: "google/gemini-2.5-flash" };
  const res = await fetch(LOVABLE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(fallbackBody),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI gateway ${res.status}: ${t.slice(0, 300)}`);
  }
  return res.json();
}

export const estimateVehicle = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        brand: z.string().min(1).max(60),
        model: z.string().min(1).max(60),
        year: z.number().int().min(1950).max(2030),
        mileage: z.number().int().min(0).max(2_000_000),
        fuel: z.string().min(1).max(30),
        transmission: z.string().min(1).max(30),
        power_hp: z.number().int().min(0).max(2000).optional(),
        body_type: z.string().max(40).optional(),
        condition: z.string().max(40).optional(),
        description: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const out = await callOpenAI({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Tu es un expert automobile français spécialisé dans la cote Argus et le marché de l'occasion. " +
            "Estime un prix de revente réaliste en euros sur le marché français actuel. " +
            "Tiens compte de la décote annuelle, du kilométrage, de la motorisation et de l'état. " +
            "Réponds UNIQUEMENT via l'outil submit_estimate.",
        },
        {
          role: "user",
          content:
            `${data.brand} ${data.model} (${data.year}) — ${data.mileage.toLocaleString("fr-FR")} km\n` +
            `Carburant: ${data.fuel} • Boîte: ${data.transmission}` +
            (data.power_hp ? ` • ${data.power_hp} ch` : "") +
            (data.body_type ? ` • ${data.body_type}` : "") +
            (data.condition ? ` • État: ${data.condition}` : "") +
            (data.description ? `\nDescription: ${data.description}` : ""),
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "submit_estimate",
            description: "Soumet l'estimation de prix d'occasion",
            parameters: {
              type: "object",
              properties: {
                price_eur: { type: "number" },
                low_eur: { type: "number" },
                high_eur: { type: "number" },
                rationale: { type: "string" },
              },
              required: ["price_eur", "low_eur", "high_eur", "rationale"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "submit_estimate" } },
    });
    const args = JSON.parse(out.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}");
    return args as { price_eur: number; low_eur: number; high_eur: number; rationale: string };
  });

export const analyzePhotos = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        photo_urls: z.array(z.string().url()).min(1).max(10),
        brand: z.string().max(60),
        model: z.string().max(60),
        year: z.number().int().min(1950).max(2030).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const out = await callOpenAI({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Tu es un expert automobile et un technicien carrosserie agréé. " +
            "Tu analyses minutieusement les photos d'un véhicule d'occasion et tu détectes la moindre imperfection : " +
            "rayures, impacts, bosses, oxydation, jeux de carrosserie, éclats de peinture, jantes frottées, " +
            "usure de l'intérieur (sièges, volant, console), état des plastiques, propreté, témoins au tableau de bord, " +
            "état des pneus, équipement visible (sellerie, écran, climatisation). " +
            "Sois honnête, factuel, précis (cite l'emplacement de chaque défaut : aile avant gauche, bas de caisse, etc.). " +
            "Note de 0 à 100 : carrosserie, intérieur, mécanique apparente. " +
            "Réponds UNIQUEMENT via l'outil submit_analysis.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                `Analyse en détail ce ${data.brand} ${data.model}${data.year ? ` ${data.year}` : ""}. ` +
                "Liste TOUTES les imperfections visibles avec leur emplacement et leur gravité.",
            },
            ...data.photo_urls.map((url) => ({ type: "image_url", image_url: { url } })),
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "submit_analysis",
            description: "Soumet l'analyse détaillée du véhicule",
            parameters: {
              type: "object",
              properties: {
                body_score: { type: "integer", minimum: 0, maximum: 100 },
                interior_score: { type: "integer", minimum: 0, maximum: 100 },
                mechanical_score: { type: "integer", minimum: 0, maximum: 100 },
                summary: { type: "string" },
                issues: {
                  type: "array",
                  description: "Liste détaillée des imperfections détectées",
                  items: {
                    type: "object",
                    properties: {
                      area: { type: "string", description: "Zone : Carrosserie, Intérieur, Jantes, Mécanique, Vitres, Pneus" },
                      location: { type: "string", description: "Emplacement précis (ex: aile avant droite)" },
                      issue: { type: "string", description: "Description courte du défaut" },
                      severity: { type: "string", enum: ["mineur", "modéré", "important"] },
                    },
                    required: ["area", "location", "issue", "severity"],
                    additionalProperties: false,
                  },
                },
                strengths: {
                  type: "array",
                  description: "Points positifs notables",
                  items: { type: "string" },
                },
              },
              required: ["body_score", "interior_score", "mechanical_score", "summary", "issues", "strengths"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "submit_analysis" } },
    });
    const args = JSON.parse(out.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}");
    return args as {
      body_score: number;
      interior_score: number;
      mechanical_score: number;
      summary: string;
      issues: { area: string; location: string; issue: string; severity: "mineur" | "modéré" | "important" }[];
      strengths: string[];
    };
  });