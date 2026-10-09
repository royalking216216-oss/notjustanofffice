import { NextResponse } from "next/server"
import { execFile } from "node:child_process"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { promisify } from "node:util"
import vm from "node:vm"

export const runtime = "nodejs"

const execFileAsync = promisify(execFile)
const MAX_SOURCE = 50_000
const TIMEOUT_MS = 4_000
const MAX_OUTPUT = 32_000
const ALLOWED = new Set(["javascript", "python"])

type RequestBody = { language?: string; code?: string }

function cap(value: string) {
  return value.length > MAX_OUTPUT ? `${value.slice(0, MAX_OUTPUT)}\n[output truncated]` : value
}

async function runPython(code: string) {
  const workdir = await mkdtemp(join(tmpdir(), "notjustacode-"))
  try {
    const result = await execFileAsync("python3", ["-I", "-B", "-c", code], {
      cwd: workdir,
      timeout: TIMEOUT_MS,
      maxBuffer: MAX_OUTPUT,
      windowsHide: true,
      env: { ...process.env, PATH: process.env.PATH ?? "/usr/bin:/bin", PYTHONIOENCODING: "utf-8" },
    })
    return { stdout: cap(result.stdout), stderr: cap(result.stderr) }
  } finally {
    await rm(workdir, { recursive: true, force: true })
  }
}

function runJavaScript(code: string) {
  const output: string[] = []
  const context = vm.createContext({
    console: { log: (...values: unknown[]) => output.push(values.map(String).join(" ")) },
  })
  try {
    new vm.Script(`"use strict";
${code}`).runInContext(context, { timeout: TIMEOUT_MS })
    return { stdout: cap(output.join("\n")), stderr: "" }
  } catch (error) {
    return { stdout: cap(output.join("\n")), stderr: error instanceof Error ? error.message : String(error) }
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody
    const language = body.language?.toLowerCase()
    const code = body.code ?? ""
    if (!language || !ALLOWED.has(language)) return NextResponse.json({ error: "Only JavaScript and Python execution are enabled." }, { status: 400 })
    if (!code.trim()) return NextResponse.json({ error: "Add code before running." }, { status: 400 })
    if (code.length > MAX_SOURCE) return NextResponse.json({ error: "Code is limited to 50 KB." }, { status: 413 })
    const result = language === "python" ? await runPython(code) : runJavaScript(code)
    return NextResponse.json({ ...result, limits: { timeoutMs: TIMEOUT_MS, maxOutput: MAX_OUTPUT, network: "disabled by runtime policy" } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Execution failed"
    return NextResponse.json({ stdout: "", stderr: message }, { status: 200 })
  }
}

export async function GET() {
  return NextResponse.json({ languages: ["javascript", "python"], limits: { timeoutMs: TIMEOUT_MS, maxSource: MAX_SOURCE, maxOutput: MAX_OUTPUT } })
}

// This route intentionally exposes only two runtimes until a container-backed sandbox is connected.
// The process and VM limits are defense-in-depth, not a substitute for OS/container isolation.
