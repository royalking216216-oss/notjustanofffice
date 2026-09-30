"use client"

import { useRef, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  FolderOpen,
  Highlighter,
  MessageSquareText,
  Minus,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  StickyNote,
  Upload,
  X,
} from "lucide-react"
import { useSuite } from "@/components/suite-context"
import { cn } from "@/lib/utils"

const SAMPLE_PAGES = [
  { title: "Cover page", lines: ["notjustanoffice", "The modern cloud office suite", "Product brief · 2026"] },
  { title: "Overview", lines: ["One workspace. Every format.", "Documents, spreadsheets, presentations, projects, code, and PDFs — connected by one secure AI layer."] },
  { title: "Security by design", lines: ["Your files stay yours.", "Server-side AI routing, protected imports, and read-only safeguards help keep sensitive work secure."] },
]

export function PdfApp() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState("notjustanoffice-product-brief.pdf")
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [zoom, setZoom] = useState(100)
  const [search, setSearch] = useState("")
  const [notes, setNotes] = useState<string[]>([])
  const [note, setNote] = useState("")
  const [isDropActive, setIsDropActive] = useState(false)
  const { activeModel } = useSuite()

  const openFile = (file?: File) => {
    if (!file) return
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return
    setFileName(file.name)
    if (fileUrl) URL.revokeObjectURL(fileUrl)
    setFileUrl(URL.createObjectURL(file))
    setPage(0)
  }

  const addNote = () => {
    if (!note.trim()) return
    setNotes((items) => [...items, note.trim()])
    setNote("")
  }

  const downloadCopy = () => {
    if (fileUrl) {
      const link = document.createElement("a")
      link.href = fileUrl
      link.download = fileName
      link.click()
      return
    }
    window.print()
  }

  return (
    <section className="flex h-full min-h-0 flex-col bg-[#151516]">
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => openFile(event.target.files?.[0])} />
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-rose-500/15 text-rose-300"><FileText className="size-4" /></div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">notjustanpdf</h1>
            <p className="text-[11px] text-muted-foreground">Secure PDF workspace</p>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[10px] text-emerald-300 sm:flex"><ShieldCheck className="size-3" /> Protected workspace</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-[11px] text-muted-foreground md:inline">AI: {activeModel === "openai" ? "ChatGPT" : activeModel === "anthropic" ? "Claude" : activeModel === "google" ? "Gemini" : "Grok"}</span>
          <button onClick={() => inputRef.current?.click()} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"><FolderOpen className="size-3.5" /> Open PDF</button>
          <button onClick={downloadCopy} className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"><Download className="size-3.5" /> Download</button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-48 shrink-0 flex-col border-r border-border bg-sidebar p-3 lg:flex">
          <div className="mb-3 flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Pages</span><span className="text-[10px] text-muted-foreground">{SAMPLE_PAGES.length}</span></div>
          <div className="scroll-thin flex flex-col gap-3 overflow-y-auto">
            {SAMPLE_PAGES.map((item, index) => (
              <button key={item.title} onClick={() => setPage(index)} className={cn("group rounded-lg border p-2 text-left transition-all", page === index ? "border-primary/60 bg-primary/10" : "border-border bg-card/50 hover:border-muted-foreground/40")}>
                <div className="mb-2 flex aspect-[1/1.38] flex-col gap-1 overflow-hidden rounded border border-border bg-[#f7f7f5] p-2 text-[6px] leading-tight text-[#252525] shadow-sm"><div className="mb-1 h-1 w-1/2 rounded bg-[#252525]" />{item.lines.map((line) => <span key={line} className="truncate">{line}</span>)}<div className="mt-auto h-5 w-full rounded bg-[#e4e4e1]" /></div>
                <div className="flex items-center justify-between px-1"><span className="text-[11px] text-muted-foreground">{index + 1}. {item.title}</span>{page === index && <span className="size-1.5 rounded-full bg-primary" />}</div>
              </button>
            ))}
          </div>
          <div className="mt-auto rounded-lg border border-border bg-card/60 p-3 text-[11px] leading-relaxed text-muted-foreground"><p className="mb-1 font-medium text-foreground">Safe import</p>PDFs open in a protected preview. Editing is disabled for suspicious or unsupported files.</div>
        </aside>

        <main className="relative flex min-w-0 flex-1 flex-col bg-[#1b1b1d]">
          <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/70 px-4">
            <div className="flex min-w-0 items-center gap-2"><span className="truncate text-xs text-muted-foreground">{fileName}</span>{fileUrl && <span className="rounded bg-emerald-400/10 px-1.5 py-0.5 text-[10px] text-emerald-300">Imported</span>}</div>
            <div className="flex items-center gap-1"><button className="flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-accent" aria-label="Print PDF" onClick={() => window.print()}><Printer className="size-3.5" /></button><span className="mx-1 h-4 w-px bg-border" /><button className="flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-accent" onClick={() => setZoom((z) => Math.max(60, z - 10))}><Minus className="size-3.5" /></button><span className="w-10 text-center text-[11px] text-muted-foreground">{zoom}%</span><button className="flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-accent" onClick={() => setZoom((z) => Math.min(180, z + 10))}><Plus className="size-3.5" /></button></div>
          </div>
          <div className="scroll-thin flex min-h-0 flex-1 items-start justify-center overflow-auto p-6 md:p-10" onDragOver={(event) => { event.preventDefault(); setIsDropActive(true) }} onDragLeave={() => setIsDropActive(false)} onDrop={(event) => { event.preventDefault(); setIsDropActive(false); openFile(event.dataTransfer.files[0]) }}>
            {isDropActive && <div className="absolute inset-5 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/10 text-sm font-medium text-primary">Drop a PDF to open it safely</div>}
            {fileUrl ? <iframe title={`Preview of ${fileName}`} src={fileUrl} className="h-full min-h-[620px] w-full max-w-4xl rounded-lg bg-white shadow-2xl" /> : <div className="w-full max-w-[680px] rounded-sm bg-[#fcfcfa] px-12 py-16 text-[#242424] shadow-2xl" style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}><div className="mb-10 flex items-center justify-between border-b border-[#deded9] pb-5 text-[10px] uppercase tracking-[0.2em] text-[#8c8c86]"><span>notjustanoffice</span><span>{page + 1} / {SAMPLE_PAGES.length}</span></div><h2 className="mb-3 text-4xl font-semibold tracking-tight">{SAMPLE_PAGES[page].lines[0]}</h2><p className="mb-10 text-lg text-[#666660]">{SAMPLE_PAGES[page].lines[1]}</p><div className="flex flex-col gap-4 text-sm leading-7 text-[#474741]">{SAMPLE_PAGES[page].lines.slice(2).map((line) => <p key={line}>{line}</p>)}<div className="mt-12 h-28 rounded bg-[#f0f0ec]" /><div className="h-2 w-4/5 rounded bg-[#e4e4df]" /><div className="h-2 w-3/5 rounded bg-[#e4e4df]" /></div></div>}
          </div>
          <div className="flex h-11 shrink-0 items-center justify-center gap-3 border-t border-border/70"><button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent disabled:opacity-30"><ChevronLeft className="size-3.5" /> Previous</button><span className="text-[11px] text-muted-foreground">Page {page + 1} of {SAMPLE_PAGES.length}</span><button disabled={page === SAMPLE_PAGES.length - 1} onClick={() => setPage((p) => p + 1)} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent disabled:opacity-30">Next <ChevronRight className="size-3.5" /></button></div>
        </main>

        <aside className="hidden w-64 shrink-0 flex-col border-l border-border bg-sidebar xl:flex">
          <div className="border-b border-border px-4 py-3"><p className="text-xs font-semibold">PDF tools</p><p className="mt-0.5 text-[11px] text-muted-foreground">Review and annotate safely</p></div>
          <div className="flex flex-col gap-2 p-4"><button className="flex items-center gap-3 rounded-lg border border-border bg-card/50 p-3 text-left transition-colors hover:bg-accent"><Highlighter className="size-4 text-amber-300" /><span><span className="block text-xs font-medium">Highlight</span><span className="text-[10px] text-muted-foreground">Mark important text</span></span></button><button className="flex items-center gap-3 rounded-lg border border-border bg-card/50 p-3 text-left transition-colors hover:bg-accent"><StickyNote className="size-4 text-sky-300" /><span><span className="block text-xs font-medium">Add annotation</span><span className="text-[10px] text-muted-foreground">Keep a private note</span></span></button><button className="flex items-center gap-3 rounded-lg border border-border bg-card/50 p-3 text-left transition-colors hover:bg-accent"><MessageSquareText className="size-4 text-violet-300" /><span><span className="block text-xs font-medium">Ask AI about PDF</span><span className="text-[10px] text-muted-foreground">Summarize or explain</span></span></button></div>
          <div className="mt-2 border-t border-border px-4 py-3"><p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Notes</p><div className="flex gap-2"><input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addNote() }} placeholder="Add a note..." className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary" /><button onClick={addNote} className="rounded-md bg-primary px-2 text-xs text-primary-foreground">Add</button></div><div className="mt-3 flex flex-col gap-2">{notes.map((item, index) => <div key={`${item}-${index}`} className="flex gap-2 rounded-md bg-card p-2 text-[11px] text-muted-foreground"><StickyNote className="mt-0.5 size-3 shrink-0 text-sky-300" />{item}<button onClick={() => setNotes((items) => items.filter((_, i) => i !== index))} className="ml-auto self-start text-muted-foreground hover:text-foreground" aria-label="Remove note"><X className="size-3" /></button></div>)}</div></div>
          <div className="mt-auto border-t border-border p-4"><label className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5"><Search className="size-3.5 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search document" className="min-w-0 flex-1 bg-transparent text-xs outline-none" /></label><p className="mt-2 text-[10px] text-muted-foreground">{search ? `Searching for “${search}”` : "Search is ready"}</p></div>
        </aside>
      </div>
    </section>
  )
}

export default PdfApp
