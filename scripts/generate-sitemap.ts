/**
 * Generates /public/sitemap.xml from the events data.
 * Run: npx tsx scripts/generate-sitemap.ts
 * Also called automatically by the build script.
 */

import { writeFileSync } from "fs";
import { resolve } from "path";

async function main() {
  const { events } = await import("../src/content/events.js") as { events: Array<{
    slug: string;
    photos: Array<{ src?: string }>;
  }> };

  const siteUrl = "https://vinzryyysaga.com";
  const today = new Date().toISOString().slice(0, 10);

  const urls = [
    `  <url>\n    <loc>${siteUrl}/</loc>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n    <lastmod>${today}</lastmod>\n  </url>`,
    ...events.map((event) =>
      `  <url>\n    <loc>${siteUrl}/events/${event.slug}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n    <lastmod>${today}</lastmod>\n  </url>`
    ),
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  const outPath = resolve(import.meta.dirname, "../public/sitemap.xml");
  writeFileSync(outPath, sitemap, "utf-8");
  console.log(`Sitemap written to ${outPath} (${urls.length} URLs)`);
}

main().catch(console.error);
