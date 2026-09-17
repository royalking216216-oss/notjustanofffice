import { NextResponse } from "next/server"
import { MODELS, mockResponse, type ModelId, type SendOptions, type TaskMode } from "@/lib/ai-service"

export const runtime = "nodejs"

type RequestBody = Omit<SendOptions, "apiKeys"> & { model: ModelId; mode: TaskMode }

function systemPrompt(model: ModelId, mode: TaskMode) {
  const config = MODELS[model]
  const base = `You are the embedded AI assistant inside notjustanoffice. ${config.persona}`
  if (mode === "write") return `${base} Return only text that can be inserted into the document, without a preamble.`
  if (mode === "analyze") return `${base} Analyze the provided spreadsheet and suggest useful formulas and actions.`
  if (mode === "outline") return `${base} Return strict JSON: an array of exactly four objects with title and bullets string array.`
  if (mode === "plan") return `${base} Return strict JSON: an array of project task objects with id, name, phase, owner, duration, start, status, dependency, milestone, and description.`
  return base
}

function keyFor(model: ModelId) {
  return {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    google: process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    xai: process.env.XAI_API_KEY,
  }[model]
}

async function callProvider(body: RequestBody, key: string) {
  const config = MODELS[body.model]
  const userContent = body.context ? `${body.prompt}\n\n--- CONTEXT ---\n${body.context}` : body.prompt
  const system = systemPrompt(body.model, body.mode)

  if (body.model === "anthropic") {
    const response = await fetch(config.baseURL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: body.variant, max_tokens: 2048, system, messages: [{ role: "user", content: userContent }] }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data?.error?.message || "Anthropic request failed")
    return data?.content?.[0]?.text || ""
  }

  if (body.model === "google") {
    const response = await fetch(`${config.baseURL}/${body.variant}:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: userContent }] }] }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data?.error?.message || "Gemini request failed")
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || ""
  }

  const response = await fetch(config.baseURL, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: body.variant, messages: [{ role: "system", content: system }, { role: "user", content: userContent }] }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data?.error?.message || `${config.vendor} request failed`)
  return data?.choices?.[0]?.message?.content || ""
}

export async function POST(request: Request) {
  let body: RequestBody
  try {
    body = (await request.json()) as RequestBody
  } catch {
    return NextResponse.json({ error: "Invalid AI request", mode: "mock" }, { status: 400 })
  }

  if (!body?.model || !MODELS[body.model] || !body.prompt) {
    return NextResponse.json({ error: "model and prompt are required", mode: "mock" }, { status: 400 })
  }

  const mockOptions: SendOptions = { model: body.model, variant: body.variant, mode: body.mode, prompt: body.prompt, context: body.context }
  const key = keyFor(body.model)
  if (!key) {
    return NextResponse.json({ text: mockResponse(mockOptions), mode: "mock", warning: `${MODELS[body.model].vendor} API key is not configured. Using Mock Mode.` })
  }

  try {
    const text = await callProvider(body, key)
    if (!text) throw new Error("The provider returned an empty response")
    return NextResponse.json({ text, mode: "live", provider: MODELS[body.model].brand })
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Provider request failed"
    return NextResponse.json({ text: mockResponse(mockOptions), mode: "mock", warning: `Live ${MODELS[body.model].brand} failed (${reason}). Using Mock Mode.` })
  }
}
