"use client"

import { useMemo, useState } from "react"
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Circle, Diamond, Download, Grid3X3, MousePointer2, Minus, Plus, Redo2, Square, StickyNote, Type, Undo2, Workflow, ZoomIn, ZoomOut } from "lucide-react"
import { useSuite } from "@/components/suite-context"
import { cn } from "@/lib/utils"

type ShapeKind = "process" | "decision" | "note" | "circle"
type Shape = { id: number; kind: ShapeKind; x: number; y: number; label: string; color: string }

const TOOLS = [
  { kind: "select", label: "Select", icon: MousePointer2 },
  { kind: "process", label: "Process", icon: Square },
  { kind: "decision", label: "Decision", icon: Diamond },
  { kind: "note", label: "Note", icon: StickyNote },
  { kind: "circle", label: "Circle", icon: Circle },
  { kind: "text", label: "Text", icon: Type },
] as const

const INITIAL_SHAPES: Shape[] = [
  { id: 1, kind: "process", x: 120, y: 90, label: "Customer request", color: "#5eead4" },
  { id: 2, kind: "decision", x: 380, y: 90, label: "Review details", color: "#a78bfa" },
  { id: 3, kind: "process", x: 640, y: 90, label: "Approve & deliver", color: "#67e8f9" },
  { id: 4, kind: "note", x: 380, y: 290, label: "Add owner + due date", color: "#fbbf24" },
]

export function VisioApp() {
  const { setActiveApp } = useSuite()
  const [tool, setTool] = useState<(typeof TOOLS)[number]["kind"]>("select")
  const [shapes, setShapes] = useState<Shape[]>(INITIAL_SHAPES)
  const [selectedId, setSelectedId] = useState(1)
  const [zoom, setZoom] = useState(100)
  const [snap, setSnap] = useState(true)
  const [history, setHistory] = useState<Shape[][]>([])
  const [future, setFuture] = useState<Shape[][]>([])
  const selected = shapes.find((shape) => shape.id === selectedId)

  const updateShapes = (next: Shape[]) => {
    setHistory((items) => [...items.slice(-19), shapes])
    setFuture([])
    setShapes(next)
  }

  const addShape = () => {
    if (tool === "select" || tool === "text") return
    const id = Date.now()
    const kind = tool as ShapeKind
    updateShapes([...shapes, { id, kind, x: 180 + (shapes.length % 3) * 250, y: 420 + Math.floor(shapes.length / 3) * 130, label: kind === "decision" ? "New decision" : kind === "note" ? "New note" : "New shape", color: kind === "note" ? "#fbbf24" : kind === "decision" ? "#a78bfa" : "#5eead4" }])
    setSelectedId(id)
    setTool("select")
  }

  const undo = () => {
    const previous = history.at(-1)
    if (!previous) return
    setFuture((items) => [...items, shapes])
    setShapes(previous)
    setHistory((items) => items.slice(0, -1))
  }

  const redo = () => {
    const next = future.at(-1)
    if (!next) return
    setHistory((items) => [...items, shapes])
    setShapes(next)
    setFuture((items) => items.slice(0, -1))
  }

  const updateSelected = (patch: Partial<Shape>) => {
    if (!selected) return
    updateShapes(shapes.map((shape) => shape.id === selected.id ? { ...shape, ...patch } : shape))
  }

  const exportDiagram = () => {
    const content = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="700"><rect width="100%" height="100%" fill="#111827"/>${shapes.map((shape) => `<text x="${shape.x}" y="${shape.y}" fill="white" font-family="Arial">${shape.label}</text>`).join("")}</svg>`
    const blob = new Blob([content], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "notjustanvisio-diagram.svg"
    link.click()
    URL.revokeObjectURL(url)
  }

  const connectors = useMemo(() => [[180, 122, 380, 122], [440, 122, 640, 122]], [])

  return (
    <main className="flex h-full min-h-0 flex-col bg-[#0e1720] text-slate-100">
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#111e29] px-4 py-3">
        <div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-xl bg-cyan-300/15 text-cyan-300"><Workflow className="size-5" /></div><div><h1 className="text-sm font-semibold">notjustanvisio</h1><p className="text-[11px] text-slate-400">Untitled diagram · Flowchart</p></div></div>
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/10 p-1"><button onClick={undo} disabled={!history.length} className="rounded p-2 text-slate-400 hover:bg-white/10 disabled:opacity-30" aria-label="Undo"><Undo2 className="size-4" /></button><button onClick={redo} disabled={!future.length} className="rounded p-2 text-slate-400 hover:bg-white/10 disabled:opacity-30" aria-label="Redo"><Redo2 className="size-4" /></button><button onClick={exportDiagram} className="ml-1 flex items-center gap-2 rounded-md bg-cyan-300 px-3 py-2 text-xs font-semibold text-slate-950"><Download className="size-3.5" /> Export SVG</button></div>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-16 shrink-0 flex-col items-center gap-2 border-r border-white/10 bg-[#111e29] px-2 py-4">
          {TOOLS.map(({ kind, label, icon: Icon }) => <button key={kind} title={label} aria-label={label} onClick={() => { setTool(kind); if (kind !== "select" && kind !== "text") addShape() }} className={cn("flex size-10 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white", tool === kind && "bg-cyan-300/15 text-cyan-300")}><Icon className="size-[18px]" /></button>)}
          <div className="mt-auto flex flex-col gap-2"><button onClick={() => setSnap(!snap)} className={cn("flex size-10 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10", snap && "text-cyan-300")} aria-label="Toggle snap to grid"><Grid3X3 className="size-4" /></button><button onClick={() => setActiveApp("home")} className="flex size-10 items-center justify-center rounded-lg text-xs text-slate-400 hover:bg-white/10">Exit</button></div>
        </aside>
        <section className="relative min-w-0 flex-1 overflow-hidden bg-[#15232e]" aria-label="Diagram canvas">
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: snap ? "radial-gradient(#78909c 1px, transparent 1px)" : "none", backgroundSize: "20px 20px" }} />
          <div className="absolute left-4 top-4 z-10 rounded-lg border border-white/10 bg-[#111e29]/90 px-3 py-2 text-xs text-slate-400 backdrop-blur"><span className="text-cyan-300">{tool === "select" ? "Select" : tool}</span> tool active</div>
          <svg viewBox="0 0 900 640" className="relative h-full w-full" style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center" }}>
            {connectors.map(([x1, y1, x2, y2]) => <line key={`${x1}-${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#64748b" strokeWidth="2" markerEnd="url(#arrow)" />)}
            <defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="none" stroke="#64748b" /></marker></defs>
            {shapes.map((shape) => <g key={shape.id} onClick={() => { setSelectedId(shape.id); setTool("select") }} className="cursor-pointer"><rect x={shape.x - 60} y={shape.y - 32} width="120" height="64" rx={shape.kind === "note" ? 4 : 10} fill={`${shape.color}20`} stroke={selectedId === shape.id ? "#fff" : shape.color} strokeWidth={selectedId === shape.id ? 3 : 1.5} transform={shape.kind === "decision" ? `rotate(45 ${shape.x} ${shape.y})` : undefined} /><text x={shape.x} y={shape.y + 4} textAnchor="middle" fill="#e2e8f0" fontSize="13" fontFamily="Arial">{shape.label}</text></g>)}
          </svg>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-white/10 bg-[#111e29]/95 p-1.5 shadow-xl backdrop-blur"><button onClick={() => setZoom(Math.max(50, zoom - 10))} className="rounded-md p-2 text-slate-400 hover:bg-white/10" aria-label="Zoom out"><ZoomOut className="size-4" /></button><span className="min-w-12 text-center text-xs text-slate-300">{zoom}%</span><button onClick={() => setZoom(Math.min(150, zoom + 10))} className="rounded-md p-2 text-slate-400 hover:bg-white/10" aria-label="Zoom in"><ZoomIn className="size-4" /></button></div>
        </section>
        <aside className="hidden w-64 shrink-0 border-l border-white/10 bg-[#111e29] p-4 lg:block"><div className="flex items-center justify-between"><h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Inspector</h2><span className="text-[10px] text-cyan-300">{shapes.length} objects</span></div>{selected ? <div className="mt-5 flex flex-col gap-4"><label className="text-xs text-slate-400">Label<input value={selected.label} onChange={(event) => updateSelected({ label: event.target.value })} className="mt-1.5 w-full rounded-md border border-white/10 bg-black/10 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" /></label><label className="text-xs text-slate-400">Color<input type="color" value={selected.color} onChange={(event) => updateSelected({ color: event.target.value })} className="mt-1.5 h-9 w-full rounded-md border border-white/10 bg-black/10" /></label><div className="grid grid-cols-2 gap-2"><button onClick={() => updateSelected({ x: selected.x - (snap ? 20 : 5) })} className="rounded-md border border-white/10 p-2 text-xs text-slate-400 hover:bg-white/10"><ArrowLeft className="mx-auto size-4" /></button><button onClick={() => updateSelected({ x: selected.x + (snap ? 20 : 5) })} className="rounded-md border border-white/10 p-2 text-xs text-slate-400 hover:bg-white/10"><ArrowRight className="mx-auto size-4" /></button><button onClick={() => updateSelected({ y: selected.y - (snap ? 20 : 5) })} className="rounded-md border border-white/10 p-2 text-xs text-slate-400 hover:bg-white/10"><ArrowUp className="mx-auto size-4" /></button><button onClick={() => updateSelected({ y: selected.y + (snap ? 20 : 5) })} className="rounded-md border border-white/10 p-2 text-xs text-slate-400 hover:bg-white/10"><ArrowDown className="mx-auto size-4" /></button></div><button onClick={() => updateShapes(shapes.filter((shape) => shape.id !== selected.id))} className="rounded-md border border-red-400/20 px-3 py-2 text-xs text-red-300 hover:bg-red-400/10">Delete selected object</button></div> : <p className="mt-5 text-xs text-slate-500">Select an object to edit its properties.</p>}</aside>
      </div>
      <footer className="flex shrink-0 items-center justify-between border-t border-white/10 bg-[#111e29] px-4 py-2 text-[11px] text-slate-500"><span>Canvas · {snap ? "Snap to grid on" : "Free positioning"}</span><span>Shift + drag to pan · Scroll to zoom</span></footer>
    </main>
  )
}
