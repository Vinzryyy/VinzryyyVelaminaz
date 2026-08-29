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

async function callAI(prompt: string, temperature = 0.7): Promise<string> {
  const provider = getProvider();
  const key = getApiKey(provider);
  if (!key) throw new Error(`No API key set for ${provider}. Add it in the Export tab.`);

  const res = await fetch(ENDPOINTS[provider], {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODELS[provider],
      messages: [{ role: "user", content: prompt }],
      temperature,
      max_tokens: 400,
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
