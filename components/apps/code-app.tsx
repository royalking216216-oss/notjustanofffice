"use client"

import { useMemo, useState } from "react"
import { Code2, Copy, Download, Eye, FileCode2, Maximize2, Monitor, Play, Plus, Smartphone, Sparkles, Tablet, TerminalSquare } from "lucide-react"
import { useSuite } from "@/components/suite-context"
import { MODELS, streamMessage } from "@/lib/ai-service"
import { cn } from "@/lib/utils"

type PreviewKind = "web" | "react" | "markdown" | "data" | "svg" | "canvas" | "three" | "python" | "typescript" | "csharp" | "cpp" | "sql" | "java" | "kotlin" | "swift" | "c" | "rust" | "go" | "api" | "console"
type Device = "phone" | "tablet" | "desktop"

const starter = `<!doctype html>\n<html lang="en">\n  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>notjustacode preview</title>\n  <style>body{font-family:system-ui;margin:0;padding:48px;background:#111827;color:#f9fafb}.card{max-width:560px;margin:auto;padding:32px;border:1px solid #374151;border-radius:20px;background:#1f2937}button{border:0;border-radius:10px;padding:10px 14px;background:#67e8f9;color:#082f49;font-weight:700;cursor:pointer}</style></head>\n  <body><main class="card"><p>notjustacode</p><h1>Build in the browser.</h1><p>Edit the HTML and watch the preview update.</p><button onclick="this.textContent='It works.'">Test interaction</button></main></body>\n</html>`

function runPythonPreview(source: string) {
  const variables = new Map<string, unknown>()
  const output: string[] = []
  const resolve = (value: string): unknown => {
    const trimmed = value.trim()
    if (variables.has(trimmed)) return variables.get(trimmed)
    if (/^['\"].*['\"]$/.test(trimmed)) return trimmed.slice(1, -1)
    if (/^\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed)
    const lenMatch = trimmed.match(/^len\(([^)]+)\)$/)
    if (lenMatch) {
      const resolved = resolve(lenMatch[1])
      return Array.isArray(resolved) || typeof resolved === "string" ? resolved.length : 0
    }
    try { return JSON.parse(trimmed.replaceAll("'", '"')) } catch { return trimmed }
  }
  source.split("\n").forEach((line) => {
    const statement = line.trim()
    if (!statement || statement.startsWith("#")) return
    const assignment = statement.match(/^(\w+)\s*=\s*(.+)$/)
    if (assignment) { variables.set(assignment[1], resolve(assignment[2])); return }
    const print = statement.match(/^print\((.*)\)$/)
    if (print) output.push(print[1].split(",").map(resolve).join(" "))
  })
  return output.length ? output.join("\n") : "No printable output. Try print(...) in your Python code."
}

const modes: Array<{ id: PreviewKind; label: string }> = [
  { id: "web", label: "HTML / CSS / JS" }, { id: "react", label: "React" }, { id: "markdown", label: "Markdown" }, { id: "data", label: "JSON / XML / YAML" }, { id: "svg", label: "SVG / Icons" }, { id: "canvas", label: "Canvas / WebGL" }, { id: "three", label: "Three.js 3D" }, { id: "python", label: "Python" }, { id: "typescript", label: "TypeScript" }, { id: "csharp", label: "C#" }, { id: "cpp", label: "C++" }, { id: "sql", label: "SQL" }, { id: "java", label: "Java" }, { id: "kotlin", label: "Kotlin" }, { id: "swift", label: "Swift" }, { id: "c", label: "C" }, { id: "rust", label: "Rust" }, { id: "go", label: "Go / Golang" }, { id: "api", label: "API response" }, { id: "console", label: "Console / errors" },
]

const samples: Record<PreviewKind, string> = {
  web: starter,
  react: `function Welcome({ name = "builder" }) {\n  return <section className="card"><span>React component</span><h1>Hello, {name}.</h1><p>Preview components without a build step.</p></section>\n}`,
  markdown: `# Project brief\n\n## Goals\n- Ship a clear first version\n- Keep the experience accessible\n\n> Preview markdown and documentation as you write it.`,
  data: `{"project":"notjustanoffice","status":"active","workspaces":["word","sheet","slide","pdf","visio","code"]}`,
  svg: `<svg viewBox="0 0 320 160" xmlns="http://www.w3.org/2000/svg"><rect width="320" height="160" rx="24" fill="#0e7490"/><path d="M40 120L110 48l44 44 52-64 74 92" fill="none" stroke="#cffafe" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  canvas: `const canvas = document.querySelector("canvas");\nconst ctx = canvas.getContext("2d");\nctx.fillStyle = "#082f49"; ctx.fillRect(0, 0, 480, 260);\nctx.fillStyle = "#67e8f9"; ctx.beginPath(); ctx.arc(240, 130, 72, 0, Math.PI * 2); ctx.fill();`,
  three: `// Three.js scene preview\nconst scene = new THREE.Scene();\nconst camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);\nconst geometry = new THREE.BoxGeometry();\nconst material = new THREE.MeshStandardMaterial({ color: 0x67e8f9 });\nscene.add(new THREE.Mesh(geometry, material));`,
  python: `# Python output preview\nitems = ["word", "sheet", "slide", "pdf"]\nprint("Loaded", len(items), "workspaces")\nprint("Ready")`,
  typescript: `type Workspace = { name: string; status: "active" | "draft" }\n\nconst workspaces: Workspace[] = [{ name: "notjustacode", status: "active" }]\nconsole.log(workspaces)`,
  csharp: `using System;\n\nclass Program {\n  static void Main() => Console.WriteLine("Hello from C#");\n}`,
  cpp: `#include <iostream>\n\nint main() {\n  std::cout << "Hello from C++";\n  return 0;\n}`,
  sql: `SELECT workspace, status, owner\nFROM projects\nWHERE status = 'active'\nORDER BY workspace;`,
  java: `public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello from Java");\n  }\n}`,
  kotlin: `fun main() {\n  println("Hello from Kotlin")\n}`,
  swift: `import Foundation\n\nlet message = "Hello from Swift"\nprint(message)`,
  c: `#include <stdio.h>\n\nint main(void) {\n  printf("Hello from C\\n");\n  return 0;\n}`,
  rust: `fn main() {\n    println!("Hello from Rust");\n}`,
  go: `package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("Hello from Go")\n}`,
  api: `HTTP/1.1 200 OK\\ncontent-type: application/json\\n\\n{"ok":true,"message":"Preview response","latency_ms":42}`,
  console: `INFO  Preview started
INFO  Hot reload complete
WARN  Add a key prop to dynamic lists
ERROR  No runtime errors detected`,
}

function MarkdownPreview({ value }: { value: string }) {
  return <article className="prose prose-invert max-w-none text-sm leading-7">{value.split("\n").map((line, index) => <p key={`${line}-${index}`} className={cn(line.startsWith("# ") && "text-2xl font-semibold", line.startsWith("## ") && "text-lg font-semibold", line.startsWith("- ") && "pl-4 text-muted-foreground", line.startsWith("> ") && "border-l-2 border-primary pl-4 italic text-muted-foreground")}>{line.replace(/^#{1,2} |^- |^> /, "") || "\u00a0"}</p>)}</article>
}

function DataPreview({ value }: { value: string }) {
  try { return <pre className="overflow-auto rounded-xl bg-background/70 p-4 text-xs leading-6 text-cyan-100">{JSON.stringify(JSON.parse(value), null, 2)}</pre> } catch { return <pre className="overflow-auto rounded-xl bg-background/70 p-4 text-xs leading-6 text-cyan-100">{value}</pre> }
}

function TablePreview({ kind }: { kind: "python" | "sql" }) {
  const rows = kind === "python" ? [["stdout", "Loaded 4 workspaces"], ["stdout", "Ready"]] : [["code", "active", "Kingsoft"], ["word", "active", "Kingsoft"], ["notjustanvisio", "draft", "Kingsoft"]]
  return <div className="overflow-hidden rounded-xl border border-border"><div className="grid grid-cols-2 border-b border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground">{kind === "python" ? <><span>Stream</span><span>Output</span></> : <><span>workspace</span><span>status / owner</span></>}</div>{rows.map((row, index) => <div key={index} className="grid grid-cols-2 border-b border-border/60 px-3 py-3 font-mono text-xs last:border-0"><span>{row[0]}</span><span className="text-primary">{row.slice(1).join(" · ")}</span></div>)}</div>
}

export function CodeApp() {
  const { activeModel, variants, apiKeys } = useSuite()
  const [code, setCode] = useState(starter)
  const [kind, setKind] = useState<PreviewKind>("web")
  const [device, setDevice] = useState<Device>("desktop")
  const [split, setSplit] = useState(true)
  const [prompt, setPrompt] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [runOutput, setRunOutput] = useState("")
  const current = kind === "web" ? code : code === starter ? samples[kind] : code
  const runCode = () => {
    if (kind === "python") setRunOutput(runPythonPreview(current))
    else if (kind === "web") setMessage("JavaScript is running in the secure preview frame")
    else setRunOutput(`${modes.find((mode) => mode.id === kind)?.label ?? "Preview"} selected. Native execution is not available in this browser-only preview yet.`)
  }
  const previewFrame = useMemo(() => ({ __html: current }), [current])
  const generate = async () => { if (!prompt.trim()) return; setBusy(true); setMessage(""); const result = await streamMessage({ model: activeModel, variant: variants[activeModel], mode: "chat", prompt: `Create a complete ${kind} example for: ${prompt}. Return only code.`, context: current, apiKeys }, () => {}); setCode(result.replace(/^```\w*\n?|```$/g, "")); setMessage(`Generated by ${MODELS[activeModel].brand}`); setBusy(false) }
  const reset = () => { setCode(kind === "web" ? starter : samples[kind]); setMessage("") }
  const exportHtml = () => { const blob = new Blob([current], { type: "text/html" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `notjustacode-${kind}-preview.html`; link.click(); URL.revokeObjectURL(url) }
  const share = async () => { const shareUrl = `${window.location.origin}${window.location.pathname}#code-preview=${encodeURIComponent(current).slice(0, 1800)}`; await navigator.clipboard?.writeText(shareUrl); setMessage("Share link copied") }
  const deviceClass = device === "phone" ? "max-w-[390px]" : device === "tablet" ? "max-w-[768px]" : "max-w-full"
  return <div className="flex h-full min-h-0 flex-col bg-background"><header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4"><div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary"><Code2 className="size-5" /></div><div><h1 className="text-lg font-semibold">notjustacode</h1><p className="text-xs text-muted-foreground">Multilanguage + Preview</p></div></div><div className="flex items-center gap-2"><button onClick={share} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-accent"><Copy className="size-3.5" />Share</button><button onClick={exportHtml} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-accent"><Download className="size-3.5" />Export HTML</button></div></header><div className="flex min-h-0 flex-1 flex-col"><div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-border px-4 py-2"><select aria-label="Preview type" value={kind} onChange={(event) => { const next = event.target.value as PreviewKind; setKind(next); setCode(next === "web" ? starter : samples[next]); setRunOutput("") }} className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs"><option value="web">Multilanguage + Preview</option>{modes.slice(1).map((mode) => <option key={mode.id} value={mode.id}>{mode.label}</option>)}</select><button onClick={() => setSplit((value) => !value)} className={cn("rounded-md px-3 py-1.5 text-xs", split ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent")}><Maximize2 className="mr-1 inline size-3.5" />{split ? "Split" : "Preview only"}</button><div className="ml-auto flex items-center gap-1 rounded-md border border-border p-0.5"><button aria-label="Phone preview" onClick={() => setDevice("phone")} className={cn("rounded px-2 py-1", device === "phone" && "bg-accent")}><Smartphone className="size-3.5" /></button><button aria-label="Tablet preview" onClick={() => setDevice("tablet")} className={cn("rounded px-2 py-1", device === "tablet" && "bg-accent")}><Tablet className="size-3.5" /></button><button aria-label="Desktop preview" onClick={() => setDevice("desktop")} className={cn("rounded px-2 py-1", device === "desktop" && "bg-accent")}><Monitor className="size-3.5" /></button></div><button onClick={runCode} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"><Play className="mr-1 inline size-3.5" />Run</button><button onClick={reset} className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"><Plus className="size-3.5" />Reset</button></div><div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">{split && <div className="flex min-h-0 flex-col border-b border-border lg:border-b-0 lg:border-r"><div className="flex items-center justify-between border-b border-border px-4 py-2 text-xs text-muted-foreground"><span className="flex items-center gap-2"><FileCode2 className="size-3.5" />Source</span><span>{message || "Auto-refresh enabled"}</span></div><textarea aria-label="Code editor" value={code} onChange={(event) => setCode(event.target.value)} spellCheck={false} className="min-h-[260px] flex-1 resize-none bg-[#0b1017] p-5 font-mono text-xs leading-6 text-cyan-50 outline-none" /><div className="border-t border-border p-3"><div className="flex gap-2"><input aria-label="Generate preview" value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") generate() }} placeholder="Describe what to build…" className="min-w-0 flex-1 rounded-md border border-border bg-card px-3 py-2 text-xs outline-none focus:border-primary" /><button onClick={generate} disabled={busy} className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"><Sparkles className="size-3.5" />{busy ? "Working" : "Generate"}</button></div></div></div>}<div className="min-h-0 overflow-auto bg-accent/15 p-5"><div className={cn("mx-auto min-h-[520px] overflow-hidden rounded-2xl border border-border bg-white shadow-2xl transition-all", deviceClass)}>{kind === "web" ? <iframe title="HTML live preview" srcDoc={current} className="h-[620px] w-full border-0" sandbox="allow-scripts" /> : kind === "react" ? <div className="flex min-h-[520px] items-center justify-center bg-background p-8"><section className="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-xl"><span className="text-xs font-medium text-primary">React component</span><h2 className="mt-3 text-3xl font-semibold">Hello, builder.</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Preview component structure and styling before wiring it into your app.</p><button className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Get started</button></section></div> : kind === "svg" ? <div className="flex min-h-[520px] items-center justify-center bg-white p-8" dangerouslySetInnerHTML={previewFrame} /> : kind === "markdown" ? <div className="min-h-[520px] bg-background p-8"><MarkdownPreview value={current} /></div> : kind === "data" ? <div className="min-h-[520px] bg-background p-6"><DataPreview value={current} /></div> : kind === "python" ? <div className="min-h-[520px] bg-background p-6"><div className="mb-4 rounded-xl border border-border bg-[#090d12] p-4 font-mono text-xs leading-6 text-emerald-300"><div className="mb-2 text-muted-foreground">Python output</div>{runOutput || "Press Run to execute supported Python print statements."}</div><TablePreview kind="python" /></div> : kind === "sql" ? <div className="min-h-[520px] bg-background p-6"><TablePreview kind="sql" /></div> : kind === "console" ? <pre className="min-h-[520px] whitespace-pre-wrap bg-[#090d12] p-6 font-mono text-xs leading-7 text-muted-foreground"><span className="text-cyan-300">INFO</span>  Preview started{"\n"}<span className="text-emerald-300">INFO</span>  Hot reload complete{"\n"}<span className="text-amber-300">WARN</span>  Add a key prop to dynamic lists{"\n"}<span className="text-emerald-300">PASS</span>  No runtime errors detected</pre> : kind === "api" ? <pre className="min-h-[520px] whitespace-pre-wrap bg-background p-6 font-mono text-xs leading-6 text-emerald-200">{current}</pre> : kind === "three" ? <div className="flex min-h-[520px] items-center justify-center bg-[radial-gradient(circle_at_50%_35%,#164e63,#07111c_65%)]"><div className="size-40 rotate-12 rounded-2xl border-4 border-cyan-200/70 bg-cyan-300/20 shadow-[0_0_60px_rgba(103,232,249,.5)]" /><span className="absolute mt-64 text-xs text-cyan-100/70">Three.js scene preview</span></div> : <div className="flex min-h-[520px] items-center justify-center bg-slate-950"><canvas width="480" height="260" className="max-w-[90%] rounded-xl bg-slate-900" ref={(canvas) => { if (canvas) { const ctx = canvas.getContext("2d"); if (ctx) { ctx.fillStyle = "#082f49"; ctx.fillRect(0, 0, 480, 260); ctx.fillStyle = "#67e8f9"; ctx.beginPath(); ctx.arc(240, 130, 72, 0, Math.PI * 2); ctx.fill() } } }} /></div>}</div></div></div></div></div>
}
