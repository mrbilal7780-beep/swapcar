import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/layout/Header";
import { getMapboxToken } from "@/lib/map.functions";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Carte communauté — SwapCars AI" },
      { name: "description", content: "Découvre les véhicules de la communauté SwapCars autour de toi." },
    ],
  }),
  component: MapPage,
});

type V = {
  id: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  city: string | null;
  photos: string[];
  latitude: number;
  longitude: number;
};

function MapPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const getToken = useServerFn(getMapboxToken);
  const [vehicles, setVehicles] = useState<V[]>([]);
  const [selected, setSelected] = useState<V | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ token }, vRes] = await Promise.all([
          getToken(),
          supabase
            .from("vehicles")
            .select("id, brand, model, year, price, city, photos, latitude, longitude")
            .eq("status", "published")
            .not("latitude", "is", null)
            .not("longitude", "is", null)
            .limit(500),
        ]);
        if (cancelled) return;
        const data = ((vRes.data ?? []) as any[]).filter(
          (v) => typeof v.latitude === "number" && typeof v.longitude === "number",
        ) as V[];
        setVehicles(data);

        mapboxgl.accessToken = token;
        if (!containerRef.current) return;
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/dark-v11",
          center: [2.35, 46.8],
          zoom: 4.5,
          attributionControl: true,
        });
        mapRef.current = map;
        map.addControl(new mapboxgl.NavigationControl(), "top-right");
        map.addControl(new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }), "top-right");

        map.on("load", () => {
          for (const v of data) {
            const el = document.createElement("div");
            el.className =
              "w-9 h-9 rounded-full bg-primary border-2 border-background shadow-lg cursor-pointer flex items-center justify-center text-[10px] font-bold text-primary-foreground";
            el.textContent = "€";
            el.title = `${v.brand} ${v.model}`;
            new mapboxgl.Marker(el)
              .setLngLat([v.longitude, v.latitude])
              .addTo(map);
            el.addEventListener("click", () => setSelected(v));
          }
          if (data.length > 0) {
            const bounds = new mapboxgl.LngLatBounds();
            data.forEach((v) => bounds.extend([v.longitude, v.latitude]));
            map.fitBounds(bounds, { padding: 80, maxZoom: 10, duration: 0 });
          }
        });
      } catch (e: any) {
        setError(e.message);
      }
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PageShell>
      <section className="max-w-7xl mx-auto px-6 md:px-8 py-8">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight">
          Carte <span className="text-gradient">communauté</span>
        </h1>
        <p className="text-muted-foreground mt-2">
          {vehicles.length} véhicule{vehicles.length > 1 ? "s" : ""} géolocalisé{vehicles.length > 1 ? "s" : ""} dans la communauté.
        </p>

        <div className="mt-8 relative rounded-3xl overflow-hidden border border-white/10" style={{ height: "70vh" }}>
          <div ref={containerRef} className="absolute inset-0" />
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 text-sm text-destructive p-6 text-center">
              {error}
            </div>
          )}

          {selected && (
            <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 glass rounded-2xl p-4 shadow-2xl">
              <button
                onClick={() => setSelected(null)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 text-xs"
                aria-label="Fermer"
              >
                ✕
              </button>
              {selected.photos?.[0] && (
                <img
                  src={selected.photos[0]}
                  alt={`${selected.brand} ${selected.model}`}
                  className="w-full h-32 object-cover rounded-xl mb-3"
                />
              )}
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{selected.city ?? "—"}</div>
              <div className="font-bold mt-1">
                {selected.brand} {selected.model}{" "}
                <span className="text-muted-foreground font-normal">{selected.year}</span>
              </div>
              <div className="text-gradient text-xl font-black mt-1">
                {Number(selected.price).toLocaleString("fr-FR")} €
              </div>
              <Link
                to="/vehicle/$id"
                params={{ id: selected.id }}
                className="mt-3 inline-block bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold"
              >
                Voir l'annonce →
              </Link>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}