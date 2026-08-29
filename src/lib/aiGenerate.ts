/* ── AI Description Generator ──────────────────────────────────── */

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

interface GenerateResult {
  subtitle: string;
  description: string;
}

export async function generateDescription(ctx: {
  title: string;
  group: string;
  date: string;
  location: string;
  gear: string;
  photoCount: number;
  existingSubtitle?: string;
  existingDescription?: string;
}): Promise<GenerateResult> {
  const provider = getProvider();
  const key = getApiKey(provider);
  if (!key) throw new Error(`No API key set for ${provider}. Add it in the Export tab.`);

  const prompt = `You are writing copy for a photography event gallery website called VinzryyySaga. The tone is cinematic, concise, and slightly poetic — like a photographer's journal. Never use generic filler.

Generate a subtitle (one sentence, under 80 chars) and a description (2-3 sentences, ~40-60 words) for this event:

- Title: ${ctx.title}
- Group/Artist: ${ctx.group || "unknown"}
- Date: ${ctx.date || "unknown"}
- Location: ${ctx.location || "unknown"}
- Camera: ${ctx.gear || "unknown"}
- Photo count: ${ctx.photoCount}
${ctx.existingSubtitle ? `- Current subtitle (improve or rewrite): ${ctx.existingSubtitle}` : ""}
${ctx.existingDescription ? `- Current description (improve or rewrite): ${ctx.existingDescription}` : ""}

Reply ONLY with valid JSON, no markdown:
{"subtitle": "...", "description": "..."}`;

  const res = await fetch(ENDPOINTS[provider], {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODELS[provider],
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 300,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${provider} API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const text: string = data.choices?.[0]?.message?.content?.trim() ?? "";

  // Parse JSON from response — handle potential markdown wrapping
  const jsonStr = text.replace(/^```json?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    const parsed = JSON.parse(jsonStr) as GenerateResult;
    return {
      subtitle: parsed.subtitle || "",
      description: parsed.description || "",
    };
  } catch {
    throw new Error(`Failed to parse AI response: ${text.slice(0, 200)}`);
  }
}
