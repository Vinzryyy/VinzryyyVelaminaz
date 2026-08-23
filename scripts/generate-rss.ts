/**
 * Generates /public/rss.xml from the events data.
 * Run: npx tsx scripts/generate-rss.ts
 * Also called automatically by the build script.
 */

import { writeFileSync } from "fs";
import { resolve } from "path";

// Dynamic import of the events data
async function main() {
  // We need to handle the @ alias manually
  const { events } = await import("../src/content/events.js") as { events: Array<{
    slug: string;
    title: string;
    date: string;
    location: string;
    subtitle: string;
    description: string;
    group?: string;
    cover?: string;
    photos: Array<{ src?: string }>;
  }> };

  const siteUrl = "https://vinzryyysaga.com";
  const now = new Date().toUTCString();

  const items = events
    .map((event) => {
      const link = `${siteUrl}/events/${event.slug}`;
      const cover = event.cover ?? event.photos[0]?.src;
      const imageTag = cover
        ? `<enclosure url="${siteUrl}${cover}" type="image/jpeg" length="0" />`
        : "";

      return `    <item>
      <title><![CDATA[${event.title}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description><![CDATA[${event.subtitle}]]></description>
      <category>${event.group ?? "Event"}</category>
      ${imageTag}
    </item>`;
    })
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>VinzryyySaga</title>
    <link>${siteUrl}</link>
    <description>Event photography by Vinzryyy — live performance, fan meetings, and visual storytelling.</description>
    <language>en</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  const outPath = resolve(import.meta.dirname, "../public/rss.xml");
  writeFileSync(outPath, rss, "utf-8");
  console.log(`RSS feed written to ${outPath} (${events.length} items)`);
}

main().catch(console.error);
