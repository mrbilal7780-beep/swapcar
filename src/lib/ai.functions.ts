import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callAI(body: any) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const res = await fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI gateway ${res.status}: ${t.slice(0, 200)}`);
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
        description: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const out = await callAI({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Tu es un expert auto français. Estime le prix d'occasion réaliste d'un véhicule en euros. Réponds via l'outil." },
        { role: "user", content: `${data.brand} ${data.model} ${data.year}, ${data.mileage} km, ${data.fuel}, ${data.transmission}. ${data.description ?? ""}` },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "submit_estimate",
            description: "Soumet l'estimation",
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
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const out = await callAI({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Tu es expert automobile. Analyse les photos du véhicule et note carrosserie, intérieur, mécanique (0-100). Donne un résumé honnête en français." },
        {
          role: "user",
          content: [
            { type: "text", text: `Analyse ce ${data.brand} ${data.model}` },
            ...data.photo_urls.map((url) => ({ type: "image_url", image_url: { url } })),
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "submit_analysis",
            description: "Soumet l'analyse",
            parameters: {
              type: "object",
              properties: {
                body_score: { type: "integer", minimum: 0, maximum: 100 },
                interior_score: { type: "integer", minimum: 0, maximum: 100 },
                mechanical_score: { type: "integer", minimum: 0, maximum: 100 },
                summary: { type: "string" },
              },
              required: ["body_score", "interior_score", "mechanical_score", "summary"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "submit_analysis" } },
    });
    const args = JSON.parse(out.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}");
    return args as { body_score: number; interior_score: number; mechanical_score: number; summary: string };
  });