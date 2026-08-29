/* ── AI Content Generator ──────────────────────────────────────── */

export const AI_PROVIDER_KEY = "vinzryyy-ai-provider";
export const AI_OPENAI_KEY = "vinzryyy-ai-openai-key";
export const AI_DEEPSEEK_KEY = "vinzryyy-ai-deepseek-key";

export type AIProvider = "openai" | "deepseek";

export function getProvider(): AIProvider {
  return (localStorage.getItem(AI_PROVIDER_KEY) as AIProvider) || "deepseek";
}

export function setProvider(p: AIProvider) {
  localStorage.setItem(AI_PROVIDER_KEY, p);
}

function getApiKey(provider: AIProvider): string | null {
  return localStorage.getItem(
    provider === "openai" ? AI_OPENAI_KEY : AI_DEEPSEEK_KEY,
  );
}

const ENDPOINTS: Record<AIProvider, string> = {
  openai: "https://api.openai.com/v1/chat/completions",
  deepseek: "https://api.deepseek.com/chat/completions",
};

const MODELS: Record<AIProvider, string> = {
  openai: "gpt-4o-mini",
  deepseek: "deepseek-chat",
};

/* ── Slug generator (no AI) ───────────────────────────────────── */

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/* ── Shared API caller ─────────────────────────────────────────── */

type Message = { role: "user"; content: string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" } }> };

async function callAI(prompt: string | Message[], temperature = 0.7, maxTokens = 400): Promise<string> {
  const provider = getProvider();
  const key = getApiKey(provider);
  if (!key) throw new Error(`No API key set for ${provider}. Add it in the Export tab.`);

  const messages: Message[] = typeof prompt === "string"
    ? [{ role: "user", content: prompt }]
    : prompt;

  const res = await fetch(ENDPOINTS[provider], {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODELS[provider],
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${provider} API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const text: string = data.choices?.[0]?.message?.content?.trim() ?? "";
  return text.replace(/^```json?\s*/i, "").replace(/\s*```$/, "").trim();
}

function parseJSON<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Failed to parse AI response: ${text.slice(0, 200)}`);
  }
}

/* ── Event context helper ─────────────────────────────────────── */

function eventContext(ctx: EventContext): string {
  return [
    `- Title: ${ctx.title}`,
    `- Group/Artist: ${ctx.group || "unknown"}`,
    `- Date: ${ctx.date || "unknown"}`,
    `- Location: ${ctx.location || "unknown"}`,
    `- Camera: ${ctx.gear || "unknown"}`,
    `- Photo count: ${ctx.photoCount}`,
  ].join("\n");
}

interface EventContext {
  title: string;
  group: string;
  date: string;
  location: string;
  gear: string;
  photoCount: number;
  userContext?: string;  // free-form notes from the user to guide AI
}

function userContextBlock(ctx: { userContext?: string }): string {
  return ctx.userContext ? `\nAdditional context from the photographer (use this to inform your writing):\n${ctx.userContext}\n` : "";
}

/* ── Generate Description ─────────────────────────────────────── */

interface DescriptionResult {
  subtitle: string;
  description: string;
}

export async function generateDescription(ctx: EventContext & {
  existingSubtitle?: string;
  existingDescription?: string;
}): Promise<DescriptionResult> {
  const prompt = `You are writing copy for a photography event gallery website called VinzryyySaga. The tone is cinematic, concise, and slightly poetic — like a photographer's journal. Never use generic filler.

Generate a subtitle (one sentence, under 80 chars) and a description (2-3 sentences, ~40-60 words) for this event:

${eventContext(ctx)}
${ctx.existingSubtitle ? `- Current subtitle (improve or rewrite): ${ctx.existingSubtitle}` : ""}
${ctx.existingDescription ? `- Current description (improve or rewrite): ${ctx.existingDescription}` : ""}
${userContextBlock(ctx)}
Reply ONLY with valid JSON, no markdown:
{"subtitle": "...", "description": "..."}`;

  const raw = await callAI(prompt);
  return parseJSON<DescriptionResult>(raw);
}

/* ── Generate Tate Text ───────────────────────────────────────── */

export async function generateTateText(ctx: EventContext & {
  eventIndex: number;
  existingTateText?: string;
}): Promise<string> {
  const prompt = `You are generating a short Japanese vertical decorative label (tateText) for a photography event gallery called VinzryyySaga.

The format is: 第X巻 · [theme kanji]
Where X is the volume number and the theme is 1-2 kanji describing the event's essence.

Existing examples from the site:
- 第一巻 · 舞台 (stage performance)
- 第三巻 · 縁 (bond/connection, fan meetings)
- 第四巻 · 街 (street/city, outdoor events)
- 第八巻 · 空港 (airport, send-offs)

Event details:
${eventContext(ctx)}
- Volume number: ${ctx.eventIndex + 1}
${ctx.existingTateText ? `- Current tateText (improve or rewrite): ${ctx.existingTateText}` : ""}

Pick a theme kanji that fits the event. Use 舞台 for stage/concerts, 縁 for fan events/meetings, 街 for outdoor/street, or create a new fitting theme if none match.
${userContextBlock(ctx)}
Reply ONLY with valid JSON, no markdown:
{"tateText": "第X巻 · ..."}`;

  const raw = await callAI(prompt, 0.5);
  const parsed = parseJSON<{ tateText: string }>(raw);
  return parsed.tateText || "";
}

/* ── Generate SEO Meta ────────────────────────────────────────── */

interface SEOResult {
  seoTitle: string;
  seoDescription: string;
}

export async function generateSEO(ctx: EventContext & {
  subtitle?: string;
  description?: string;
}): Promise<SEOResult> {
  const prompt = `You are generating SEO metadata for a photography event page on VinzryyySaga (a photography portfolio site by Vinzryyy).

Generate an optimized page title and meta description for search engines:
- seoTitle: Under 60 chars. Format: "[Event] — [Group] | VinzryyySaga". Must include the event name and be compelling for search results.
- seoDescription: 120-155 chars. Summarize the event for Google search snippets. Include the group name, location, and what makes this gallery special. Must read naturally.

Event details:
${eventContext(ctx)}
${ctx.subtitle ? `- Subtitle: ${ctx.subtitle}` : ""}
${ctx.description ? `- Description: ${ctx.description}` : ""}
${userContextBlock(ctx)}
Reply ONLY with valid JSON, no markdown:
{"seoTitle": "...", "seoDescription": "..."}`;

  const raw = await callAI(prompt, 0.5);
  return parseJSON<SEOResult>(raw);
}

/* ── Batch Photo Descriptions ─────────────────────────────────── */

interface PhotoStory {
  index: number;
  title: string;
  story: string;
}

export async function batchDescribePhotos(ctx: EventContext & {
  photos: { title: string; sequence?: string; src?: string }[];
}): Promise<PhotoStory[]> {
  if (ctx.photos.length === 0) return [];

  // Process in chunks of 20 to stay within token limits
  const CHUNK = 20;
  const results: PhotoStory[] = [];

  for (let start = 0; start < ctx.photos.length; start += CHUNK) {
    const chunk = ctx.photos.slice(start, start + CHUNK);
    const photoList = chunk
      .map((p, i) => {
        const idx = start + i;
        const seq = p.sequence ? ` [sequence: ${p.sequence}]` : "";
        return `  ${idx + 1}. "${p.title}"${seq}`;
      })
      .join("\n");

    const prompt = `You are writing short photo stories for a photography event gallery called VinzryyySaga. The tone is cinematic, intimate, and observational — like margin notes in a photographer's journal.

Event context:
${eventContext(ctx)}

For each photo below, generate:
- A cleaned-up title (remove file extensions, underscores, timestamps — make it human-readable, keep it short)
- A story (1-2 sentences, 15-30 words, evocative and specific to the moment)

Photos:
${photoList}

Reply ONLY with valid JSON array, no markdown:
[{"index": 1, "title": "...", "story": "..."}, ...]`;

    const raw = await callAI(prompt, 0.7);
    const parsed = parseJSON<PhotoStory[]>(raw);
    results.push(...parsed.map((p) => ({ ...p, index: p.index - 1 })));
  }

  return results;
}

/* ── Translation ──────────────────────────────────────────────── */

export type TranslationLang = "ja" | "ms";

interface TranslationResult {
  subtitle: string;
  description: string;
}

const LANG_NAMES: Record<TranslationLang, string> = {
  ja: "Japanese",
  ms: "Malay",
};

export async function translateContent(ctx: {
  subtitle: string;
  description: string;
  lang: TranslationLang;
}): Promise<TranslationResult> {
  const langName = LANG_NAMES[ctx.lang];

  const prompt = `Translate the following photography event text into ${langName}. Keep the tone cinematic, poetic, and concise. Do not add or remove meaning — just translate naturally.

Subtitle (translate this):
${ctx.subtitle}

Description (translate this):
${ctx.description}

Reply ONLY with valid JSON, no markdown:
{"subtitle": "...", "description": "..."}`;

  const raw = await callAI(prompt, 0.3);
  return parseJSON<TranslationResult>(raw);
}

/* ── Rewrite Tone ─────────────────────────────────────────────── */

export type WritingTone = "formal" | "casual" | "poetic";

const TONE_INSTRUCTIONS: Record<WritingTone, string> = {
  formal: "Rewrite in a formal, professional tone — clean, authoritative, and polished. Suitable for a press release or portfolio presentation.",
  casual: "Rewrite in a casual, conversational tone — relaxed, friendly, and approachable. Like talking to a friend about the shoot.",
  poetic: "Rewrite in a cinematic, poetic tone — evocative, atmospheric, and lyrical. Like a photographer's journal entry at 2am.",
};

export async function rewriteTone(ctx: {
  subtitle: string;
  description: string;
  tone: WritingTone;
  userContext?: string;
}): Promise<{ subtitle: string; description: string }> {
  const prompt = `${TONE_INSTRUCTIONS[ctx.tone]}

Keep the same meaning and facts. Do not add new information. Match the original length roughly.

Subtitle:
${ctx.subtitle}

Description:
${ctx.description}
${userContextBlock(ctx)}
Reply ONLY with valid JSON, no markdown:
{"subtitle": "...", "description": "..."}`;

  const raw = await callAI(prompt, 0.6);
  return parseJSON<{ subtitle: string; description: string }>(raw);
}

/* ── Shorten / Expand ─────────────────────────────────────────── */

export type LengthMode = "shorten" | "expand";

export async function adjustLength(ctx: {
  subtitle: string;
  description: string;
  mode: LengthMode;
  userContext?: string;
}): Promise<{ subtitle: string; description: string }> {
  const instruction = ctx.mode === "shorten"
    ? "Make the text significantly shorter and more concise. Cut filler, merge sentences, keep only the essential meaning. Aim for roughly half the original word count."
    : "Expand the text with more vivid detail, atmosphere, and sensory language. Add context about the moment, the energy, or the setting. Roughly double the word count without adding fabricated facts.";

  const prompt = `${instruction}

Keep the same tone and style. Do not change the core meaning.

Subtitle (${ctx.mode}):
${ctx.subtitle}

Description (${ctx.mode}):
${ctx.description}
${userContextBlock(ctx)}
Reply ONLY with valid JSON, no markdown:
{"subtitle": "...", "description": "..."}`;

  const raw = await callAI(prompt, 0.6);
  return parseJSON<{ subtitle: string; description: string }>(raw);
}

/* ── Vision: Auto-tag photos ──────────────────────────────────── */

export interface PhotoTag {
  index: number;
  tags: string[];  // e.g. ["solo", "stage", "closeup", "crowd", "wide-shot"]
}

export async function autoTagPhotos(ctx: EventContext & {
  photos: { src: string; title: string }[];
}): Promise<PhotoTag[]> {
  if (ctx.photos.length === 0) return [];

  const CHUNK = 8; // vision tokens are expensive, process in small batches
  const results: PhotoTag[] = [];

  for (let start = 0; start < ctx.photos.length; start += CHUNK) {
    const chunk = ctx.photos.slice(start, start + CHUNK);

    const content: Message["content"] = [
      {
        type: "text" as const,
        text: `You are tagging concert/event photos for a photography gallery. For each photo, provide 2-5 short tags from this vocabulary:

Subjects: solo, duo, group, crowd, wide-shot, closeup, portrait, full-body, side-profile, back-shot
Moments: performing, singing, dancing, talking, waving, posing, candid, interaction, entrance, exit
Stage: stage, backstage, audience, venue, lighting, spotlight, silhouette
Mood: energetic, emotional, intimate, dramatic, joyful, intense, serene

Event: ${ctx.title} (${ctx.group || "unknown"})

Analyze each photo and return ONLY valid JSON array:
[{"index": ${start + 1}, "tags": ["tag1", "tag2"]}, ...]`,
      },
      ...chunk.map((p, i) => ([
        { type: "text" as const, text: `Photo ${start + i + 1}: "${p.title}"` },
        { type: "image_url" as const, image_url: { url: p.src, detail: "low" as const } },
      ])).flat(),
    ];

    const raw = await callAI([{ role: "user", content }], 0.3, 600);
    const parsed = parseJSON<PhotoTag[]>(raw);
    results.push(...parsed.map((p) => ({ ...p, index: p.index - 1 })));
  }

  return results;
}

/* ── Vision: Suggest cover ────────────────────────────────────── */

export async function suggestCover(ctx: EventContext & {
  photos: { src: string; title: string; index: number }[];
}): Promise<number> {
  // Send up to 12 photos for comparison (sampled evenly if more)
  const sample = ctx.photos.length <= 12
    ? ctx.photos
    : ctx.photos.filter((_, i) => i % Math.ceil(ctx.photos.length / 12) === 0).slice(0, 12);

  const content: Message["content"] = [
    {
      type: "text" as const,
      text: `You are selecting the best cover photo for a photography event gallery page. Pick the ONE photo with:
- Best composition and visual impact
- Clear subject (not blurry or too dark)
- Works well cropped to 3:4 portrait aspect ratio
- Represents the event well

Event: ${ctx.title} (${ctx.group || "unknown"}) at ${ctx.location || "unknown"}

Return ONLY the photo number as JSON:
{"pick": <number>}`,
    },
    ...sample.map((p) => ([
      { type: "text" as const, text: `Photo ${p.index + 1}: "${p.title}"` },
      { type: "image_url" as const, image_url: { url: p.src, detail: "low" as const } },
    ])).flat(),
  ];

  const raw = await callAI([{ role: "user", content }], 0.2, 100);
  const parsed = parseJSON<{ pick: number }>(raw);
  return parsed.pick - 1; // convert to 0-based
}

/* ── Vision: Auto-group sequences ─────────────────────────────── */

export interface SequenceGroup {
  name: string;
  indices: number[];  // 0-based
}

export async function autoGroupSequences(ctx: EventContext & {
  photos: { src: string; title: string }[];
}): Promise<SequenceGroup[]> {
  if (ctx.photos.length < 3) return [];

  // Send thumbnails in chunks for grouping
  const CHUNK = 16;
  const allGroups: SequenceGroup[] = [];

  for (let start = 0; start < ctx.photos.length; start += CHUNK) {
    const chunk = ctx.photos.slice(start, start + CHUNK);

    const content: Message["content"] = [
      {
        type: "text" as const,
        text: `You are grouping concert/event photos into sequences for a gallery. Photos that are visually similar (same moment, same angle, burst shots, same outfit/pose with slight variations) should be grouped together.

Rules:
- Only group photos that are clearly from the same moment/burst
- A group needs at least 2 photos
- Not every photo needs to be in a group — solo shots should be left ungrouped
- Name each group descriptively (e.g. "Stage Solo", "Crowd Wave", "Encore Bow")
- Use the photo numbers as shown

Event: ${ctx.title} (${ctx.group || "unknown"})

Return ONLY valid JSON array of groups (empty array if no clear groups):
[{"name": "Group Name", "indices": [${start + 1}, ${start + 2}]}, ...]`,
    },
      ...chunk.map((p, i) => ([
        { type: "text" as const, text: `Photo ${start + i + 1}: "${p.title}"` },
        { type: "image_url" as const, image_url: { url: p.src, detail: "low" as const } },
      ])).flat(),
    ];

    const raw = await callAI([{ role: "user", content }], 0.3, 800);
    const parsed = parseJSON<SequenceGroup[]>(raw);
    allGroups.push(...parsed.map((g) => ({
      ...g,
      indices: g.indices.map((i) => i - 1), // convert to 0-based
    })));
  }

  return allGroups;
}

/* ── Photo arrangement helper (no AI) ─────────────────────────── */

export function arrangePhotos(photos: { sequence?: string }[]): number[] {
  // Returns sorted indices: sequenced photos first, then non-sequenced
  const sequenced: number[] = [];
  const regular: number[] = [];
  photos.forEach((p, i) => {
    if (p.sequence) sequenced.push(i);
    else regular.push(i);
  });
  return [...sequenced, ...regular];
}
