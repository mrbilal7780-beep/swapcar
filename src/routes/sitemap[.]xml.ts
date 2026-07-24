import { createFileRoute } from "@tanstack/react-router";

const BASE_URL = "https://swapcar.mr-bilal-7780.workers.dev";

export const Route = createFileRoute("/sitemap.xml")({
  component: () => null,
  loader: async () => {
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${BASE_URL}/</loc><priority>1.0</priority></url>
  <url><loc>${BASE_URL}/feed</loc><priority>0.9</priority></url>
  <url><loc>${BASE_URL}/explore</loc><priority>0.8</priority></url>
  <url><loc>${BASE_URL}/map</loc><priority>0.8</priority></url>
  <url><loc>${BASE_URL}/login</loc><priority>0.5</priority></url>
</urlset>`;
    return new Response(sitemap, {
      headers: { "Content-Type": "application/xml" },
    });
  },
});