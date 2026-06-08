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

// ── Mock content engine ────────────────────────────────────────────────────
// Designed to be genuinely useful offline: it detects intent (titles, rewrite,
// summarize, email, list, blog, essay…) and produces full, on-topic drafts in
// each model's voice — not a placeholder disclaimer.

/** Strip leading command verbs so we get a clean subject. */
function extractTopic(prompt: string): string {
  return (
    prompt
      .replace(
        /^(please\s+)?(write|draft|create|generate|make|compose|give me|help me (write|draft)|can you (write|draft)|produce|prepare|outline)\s+(me\s+)?(a|an|the|some)?\s*/i,
        "",
      )
      .replace(/\b(about|on|regarding|for|titled|called)\b/i, "")
      .replace(/[.?!]+$/, "")
      .trim() || "this topic"
  )
}

/** Pull a few keyword "themes" from the prompt to weave into the body. */
function keywords(prompt: string): string[] {
  const stop = new Set([
    "the","a","an","and","or","but","for","to","of","in","on","with","about","please","write","draft",
    "create","make","me","my","this","that","is","are","be","it","as","at","by","from","into","more",
    "less","very","really","some","give","help","can","you","i","we","our","your",
  ])
  return Array.from(
    new Set(
      prompt
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !stop.has(w)),
    ),
  ).slice(0, 6)
}

const VOICE: Record<ModelId, { open: (t: string) => string; connect: string; close: string }> = {
  openai: {
    open: (t) => `Here is a clear, structured piece on ${t}.`,
    connect: "Critically, the logic holds when you break it down step by step.",
    close: "In short: define the goal, measure what matters, and iterate quickly.",
  },
  anthropic: {
    open: (t) => `There is a quiet elegance to ${t} that rewards a closer look.`,
    connect: "Notice how each idea folds gently into the next, building something that feels earned.",
    close: "What remains is a sense of clarity — the kind that lingers after the last line.",
  },
  google: {
    open: (t) => `Let's explore ${t} from several vantage points at once.`,
    connect: "Economically, operationally, and culturally, the implications compound.",
    close: "Taken together, the threads point toward a single, well-supported conclusion.",
  },
  xai: {
    open: (t) => `Let's be honest about ${t}: most takes overcomplicate it.`,
    connect: "Strip away the noise and the signal is refreshingly simple.",
    close: "Bottom line: move first, stay sharp, and don't bury the lede.",
  },
}

function paragraph(topic: string, kws: string[], model: ModelId, seedWords: string[]): string {
  const v = VOICE[model]
  const detail =
    kws.length > 0
      ? `It touches on ${kws.slice(0, 3).join(", ")}, each of which shapes how ${topic} actually plays out in practice.`
      : `The fundamentals matter more than the buzzwords, and ${topic} is no exception.`
  return `${seedWords.join(" ")} ${detail} ${v.connect}`
}

function mockWrite(opts: SendOptions): string {
  const m = MODELS[opts.model]
  const v = VOICE[opts.model]
  const prompt = opts.prompt.trim()
  const lower = prompt.toLowerCase()
  const topic = extractTopic(prompt)
  const kws = keywords(prompt)

  // Intent: titles / headlines
  if (/\b(title|headline|name|subject line)s?\b/.test(lower)) {
    const styles: Record<ModelId, string[]> = {
      openai: [
        `The Complete Guide to ${cap(topic)}`,
        `${cap(topic)}: What Actually Works`,
        `5 Principles Behind Great ${cap(topic)}`,
        `How to Get ${cap(topic)} Right the First Time`,
        `${cap(topic)}, Explained Simply`,
      ],
      anthropic: [
        `The Quiet Art of ${cap(topic)}`,
        `On ${cap(topic)} and What It Asks of Us`,
        `Notes Toward a Better ${cap(topic)}`,
        `Where ${cap(topic)} Begins`,
        `The Shape of ${cap(topic)}`,
      ],
      google: [
        `${cap(topic)}: A 360° Overview`,
        `Rethinking ${cap(topic)} from First Principles`,
        `The ${cap(topic)} Playbook`,
        `Everything Connected to ${cap(topic)}`,
        `${cap(topic)} in Context`,
      ],
      xai: [
        `${cap(topic)} Without the Fluff`,
        `The Honest Truth About ${cap(topic)}`,
        `${cap(topic)}: Stop Overthinking It`,
        `Why Everyone Gets ${cap(topic)} Wrong`,
        `${cap(topic)}, Straight Up`,
      ],
    }
    return styles[opts.model].map((t, i) => `${i + 1}. ${t}`).join("\n")
  }

  // Intent: email
  if (/\b(email|e-mail|message|note|reply)\b/.test(lower)) {
    return `Subject: ${cap(topic)}

Hi there,

${v.open(topic)} I wanted to reach out about ${topic} and share a few quick thoughts.

${paragraph(topic, kws, opts.model, [`First, the context.`])}

${paragraph(topic, kws, opts.model, [`Here's what I'd suggest as a next step.`])}

${v.close}

Best regards,
[Your name]`
  }

  // Intent: list / bullet points / steps
  if (/\b(list|bullet|points|steps|tips|ways|ideas|checklist)\b/.test(lower)) {
    const verbs = ["Start by clarifying", "Invest early in", "Keep a close eye on", "Don't neglect", "Double down on", "Wrap up by reviewing"]
    const items = (kws.length ? kws : ["the goal", "the audience", "the timeline", "the budget", "the follow-up"]).slice(0, 6)
    const body = items.map((k, i) => `• ${verbs[i % verbs.length]} ${k} — it has outsized impact on ${topic}.`).join("\n")
    return `${v.open(topic)}\n\n${body}\n\n${v.close}`
  }

  // Intent: summary / TL;DR (works on the document context)
  if (/\b(summar|tl;?dr|recap|condense|shorten)/.test(lower) && opts.context) {
    const src = opts.context.replace(/\s+/g, " ").trim()
    const sentences = src.split(/(?<=[.!?])\s+/).filter((s) => s.length > 20)
    const picked = sentences.slice(0, 3).join(" ")
    return `Summary (${m.brand}):\n\n${picked || src.slice(0, 280)}\n\nKey takeaway: ${v.close}`
  }

  // Intent: rewrite / improve / rephrase (works on the document context)
  if (/\b(rewrite|rephrase|improve|polish|edit|revise|formal|casual|tone)\b/.test(lower) && opts.context) {
    const src = opts.context.replace(/\s+/g, " ").trim().slice(-600)
    return `${v.open(`a refreshed version`)}\n\n${src} — reframed for clarity and flow. ${v.connect} ${v.close}`
  }

  // Default: a full multi-paragraph draft
  const seeds = [
    [v.open(topic)],
    [`Why does ${topic} matter?`],
    [`In practice, ${topic} comes down to execution.`],
  ]
  const paras = seeds.map((s) => paragraph(topic, kws, opts.model, s))
  paras.push(v.close)
  return paras.join("\n\n")
}

function mockResponse(opts: SendOptions): string {
  const m = MODELS[opts.model]

  if (opts.mode === "outline") {
    const topic = extractTopic(opts.prompt)
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
        `${cap(topic)}: ${["framing the context", "the core insight", "the differentiator", "a clear call to action"][i]}`,
        `${["Set the stakes and define the audience", "Quantify the pain and its cost", "Show the mechanism and the proof", "State the owner, timeline and metric"][i]}`,
        `${["Open with a memorable hook", "Anchor it with one striking number", "Contrast before vs. after", "End with the single next step"][i]}`,
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
    const rows = opts.context ? opts.context.split("\n").filter((r) => r.trim()).length : 0
    return `${flavor[opts.model]}
• Detected ${rows || "several"} populated rows in the selection.
• Suggested total: =SUM(B2:B100) to roll up the primary metric.
• Suggested average: =AVERAGE(B2:B100) for the per-row mean.
• Range check: =MAX(B2:B100)-MIN(B2:B100) reveals the spread.
• Trend: values appear to grow steadily — flag any cell that deviates >20% from the running mean.
• Tip: add a "% of total" column with =B2/SUM($B$2:$B$100).`
  }

  if (opts.mode === "write") {
    return mockWrite(opts)
  }

  // chat — answer the request directly using the write engine, in voice
  return mockWrite(opts)
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
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
