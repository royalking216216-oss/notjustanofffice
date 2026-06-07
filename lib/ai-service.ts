// ──────────────────────────────────────────────────────────────────────────
// notjustanoffice — Universal multi-model AI routing service
// Routes a single request to OpenAI, Anthropic, Google, or xAI (Grok), or
// falls back to richly-personified mock responses when no key is present.
// ──────────────────────────────────────────────────────────────────────────

export type ModelId = "openai" | "anthropic" | "google" | "xai"

export type TaskMode = "chat" | "write" | "analyze" | "outline"

export interface ModelVariant {
  id: string
  label: string
}

export interface ModelConfig {
  id: ModelId
  /** Short brand name used in chips, e.g. "Claude" */
  brand: string
  /** Full vendor name */
  vendor: string
  /** oklch / hex accent used for the glowing chip + highlights */
  accent: string
  /** Tailwind text color class for icons */
  variants: ModelVariant[]
  baseURL: string
  /** how this model "thinks" — injected into the system prompt */
  persona: string
}

export const MODELS: Record<ModelId, ModelConfig> = {
  openai: {
    id: "openai",
    brand: "ChatGPT",
    vendor: "OpenAI",
    accent: "#10a37f",
    baseURL: "https://api.openai.com/v1/chat/completions",
    variants: [
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "gpt-4o-mini", label: "GPT-4o mini" },
    ],
    persona:
      "You are direct, analytical and highly structured. Prefer crisp headings, numbered logic and unambiguous wording.",
  },
  anthropic: {
    id: "anthropic",
    brand: "Claude",
    vendor: "Anthropic",
    accent: "#d97757",
    baseURL: "https://api.anthropic.com/v1/messages",
    variants: [
      { id: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet" },
      { id: "claude-3-haiku", label: "Claude 3 Haiku" },
    ],
    persona:
      "You write with rich, elegant vocabulary and a strong sense of structural flow. Favor graceful transitions and a warm, considered voice.",
  },
  google: {
    id: "google",
    brand: "Gemini",
    vendor: "Google",
    accent: "#4285f4",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/models",
    variants: [
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
      { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
    ],
    persona:
      "You are comprehensive and ideation-driven. Explore the topic from multiple angles, surface depth, and connect related concepts.",
  },
  xai: {
    id: "xai",
    brand: "Grok",
    vendor: "xAI",
    accent: "#e7e7e7",
    baseURL: "https://api.x.ai/v1/chat/completions",
    variants: [
      { id: "grok-2", label: "Grok 2" },
      { id: "grok-beta", label: "Grok Beta" },
    ],
    persona:
      "You are sharp, witty and refreshingly candid. Cut to the signal, add the occasional dry quip, and never bury the lede.",
  },
}

export const MODEL_ORDER: ModelId[] = ["openai", "anthropic", "google", "xai"]

export type ApiKeys = Record<ModelId, string>

export const EMPTY_KEYS: ApiKeys = {
  openai: "",
  anthropic: "",
  google: "",
  xai: "",
}

export interface SendOptions {
  model: ModelId
  variant: string
  apiKeys: ApiKeys
  mode: TaskMode
  prompt: string
  /** Surrounding document / grid / deck context */
  context?: string
}

function buildSystemPrompt(model: ModelConfig, mode: TaskMode): string {
  const base = `You are the embedded copilot inside "notjustanoffice", a premium cloud productivity suite. ${model.persona}`
  switch (mode) {
    case "write":
      return `${base} You are the document Copilot. Continue or compose prose that fits seamlessly at the cursor. Return only the text to insert, no preamble.`
    case "analyze":
      return `${base} You are the spreadsheet Analyst. Read the provided grid and return a concise breakdown: trends, totals and any suggested formulas (use =SUM / =AVERAGE style).`
    case "outline":
      return `${base} You are the presentation Copilot. Produce a 4-slide corporate deck. Return STRICT JSON: an array of {"title": string, "bullets": string[]} with exactly 4 items.`
    default:
      return base
  }
}

// ── Real provider routing ──────────────────────────────────────────────────
// Each vendor differs in base URL, auth headers and body shape. This is where
// the universal router translates one request into the active vendor's dialect.
async function callProvider(opts: SendOptions, system: string): Promise<string> {
  const model = MODELS[opts.model]
  const key = opts.apiKeys[opts.model]
  const userContent = opts.context
    ? `${opts.prompt}\n\n--- CONTEXT ---\n${opts.context}`
    : opts.prompt

  if (opts.model === "anthropic") {
    const res = await fetch(model.baseURL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: opts.variant,
        max_tokens: 1024,
        system,
        messages: [{ role: "user", content: userContent }],
      }),
    })
    const data = await res.json()
    return data?.content?.[0]?.text ?? ""
  }

  if (opts.model === "google") {
    const url = `${model.baseURL}/${opts.variant}:generateContent?key=${key}`
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: userContent }] }],
      }),
    })
    const data = await res.json()
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
  }

  // OpenAI + xAI share the OpenAI chat-completions dialect
  const res = await fetch(model.baseURL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: opts.variant,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
    }),
  })
  const data = await res.json()
  return data?.choices?.[0]?.message?.content ?? ""
}

// ── Mock responses with matching model personalities ───────────────────────
function mockResponse(opts: SendOptions): string {
  const m = MODELS[opts.model]
  const p = opts.prompt.trim() || "your topic"
  const topic = p.replace(/^(write|draft|create|generate|make|about|on)\s+/i, "")

  if (opts.mode === "outline") {
    const themes: Record<ModelId, string[]> = {
      openai: ["Executive Summary", "The Problem", "Our Solution", "Next Steps"],
      anthropic: ["The Opportunity", "A Considered Approach", "What Sets Us Apart", "The Path Forward"],
      google: ["Market Landscape", "Strategic Pillars", "Implementation Roadmap", "Measuring Impact"],
      xai: ["The Real Problem", "Why Now", "How We Win", "The Ask"],
    }
    const titles = themes[opts.model]
    const slides = titles.map((title, i) => ({
      title,
      bullets: [
        `${topic}: ${["framing the context", "core insight", "the differentiator", "clear call to action"][i]}`,
        `${m.brand}-styled point reinforcing ${["the why", "the what", "the how", "the when"][i]}`,
        i === 3 ? "Recommended owner, timeline and success metric" : `Supporting evidence and a memorable takeaway`,
      ],
    }))
    return JSON.stringify(slides)
  }

  if (opts.mode === "analyze") {
    const flavor: Record<ModelId, string> = {
      openai: "Structured read of the grid:",
      anthropic: "Here is a considered look at the figures:",
      google: "A multi-angle analysis of the data:",
      xai: "Straight talk on these numbers:",
    }
    return `${flavor[opts.model]}
• Detected ${opts.context ? opts.context.split("\n").length : "several"} populated rows.
• Suggested total: =SUM(B2:B100) to roll up the primary metric.
• Suggested average: =AVERAGE(B2:B100) for the per-row mean.
• Trend: values appear to grow steadily — flag any cell that deviates >20% from the running mean.
• Tip: add a "% of total" column with =B2/SUM($B$2:$B$100).`
  }

  if (opts.mode === "write") {
    const intros: Record<ModelId, string> = {
      openai: `Here is a structured take on ${topic}. First, the core thesis: it matters because the fundamentals align with where the market is heading. `,
      anthropic: `There is a quiet elegance to ${topic} — one that rewards a closer look. Consider how each element folds gently into the next, building a narrative that feels both inevitable and earned. `,
      google: `Let's explore ${topic} from several vantage points. Economically, it reshapes incentives; operationally, it streamlines effort; and culturally, it shifts how teams collaborate day to day. `,
      xai: `Let's be honest about ${topic}: most takes overcomplicate it. The signal is simple — it works, it scales, and the people who move first tend to win. `,
    }
    return (
      intros[opts.model] +
      `This draft was composed by ${m.brand} (${labelFor(opts.model, opts.variant)}) in mock mode — add your ${m.vendor} API key in Settings to stream live generations.`
    )
  }

  // chat
  return `${m.brand} here (${labelFor(opts.model, opts.variant)}). I read your note about "${p}". In mock mode I respond in ${m.brand}'s voice — drop a ${m.vendor} API key into Settings to go live.`
}

export function labelFor(model: ModelId, variant: string): string {
  return MODELS[model].variants.find((v) => v.id === variant)?.label ?? variant
}

export function hasKey(model: ModelId, keys: ApiKeys): boolean {
  return Boolean(keys[model]?.trim())
}

// ── Public entry point: streams chunks to onChunk, resolves with full text ──
export async function streamMessage(
  opts: SendOptions,
  onChunk?: (full: string, delta: string) => void,
): Promise<string> {
  const model = MODELS[opts.model]
  const system = buildSystemPrompt(model, opts.mode)

  let full: string
  try {
    if (hasKey(opts.model, opts.apiKeys)) {
      full = await callProvider(opts, system)
      if (!full) full = mockResponse(opts)
    } else {
      full = mockResponse(opts)
    }
  } catch {
    full = mockResponse(opts)
  }

  if (!onChunk) return full

  // Simulated token streaming for a live, typewriter feel.
  const tokens = full.split(/(\s+)/)
  let acc = ""
  for (const t of tokens) {
    acc += t
    onChunk(acc, t)
    await new Promise((r) => setTimeout(r, 14))
  }
  return full
}

// Spreadsheet formula evaluation (used by notjustasheet) ──────────────────
export function evalFormula(raw: string, get: (ref: string) => string): string {
  if (!raw.startsWith("=")) return raw
  let expr = raw.slice(1)

  const runRange = (fn: (nums: number[]) => number) => (a: string, b: string) => {
    const nums = expandRange(a, b)
      .map((ref) => parseFloat(get(ref)))
      .filter((n) => !isNaN(n))
    return nums.length ? fn(nums) : 0
  }

  const fns: Record<string, (a: string, b: string) => number> = {
    SUM: runRange((n) => n.reduce((s, x) => s + x, 0)),
    AVERAGE: runRange((n) => n.reduce((s, x) => s + x, 0) / n.length),
    MAX: runRange((n) => Math.max(...n)),
    MIN: runRange((n) => Math.min(...n)),
    COUNT: runRange((n) => n.length),
  }

  expr = expr.replace(/(SUM|AVERAGE|MAX|MIN|COUNT)\(([A-Z]+\d+):([A-Z]+\d+)\)/gi, (_, fn, a, b) =>
    String(fns[fn.toUpperCase()](a, b)),
  )

  // Replace bare cell refs with their numeric value
  expr = expr.replace(/[A-Z]+\d+/g, (ref) => {
    const v = parseFloat(get(ref))
    return isNaN(v) ? "0" : String(v)
  })

  try {
    if (!/^[\d+\-*/.()\s]+$/.test(expr)) return "#ERR"
    // eslint-disable-next-line no-new-func
    const out = Function(`"use strict";return (${expr})`)()
    return typeof out === "number" && isFinite(out) ? String(Math.round(out * 1e6) / 1e6) : "#ERR"
  } catch {
    return "#ERR"
  }
}

function colToIndex(col: string): number {
  let n = 0
  for (const ch of col) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n
}
function indexToCol(n: number): string {
  let s = ""
  while (n > 0) {
    const r = (n - 1) % 26
    s = String.fromCharCode(65 + r) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}
function expandRange(a: string, b: string): string[] {
  const ma = a.match(/([A-Z]+)(\d+)/)!
  const mb = b.match(/([A-Z]+)(\d+)/)!
  const c1 = colToIndex(ma[1])
  const c2 = colToIndex(mb[1])
  const r1 = parseInt(ma[2], 10)
  const r2 = parseInt(mb[2], 10)
  const refs: string[] = []
  for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) {
    for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) {
      refs.push(`${indexToCol(c)}${r}`)
    }
  }
  return refs
}
