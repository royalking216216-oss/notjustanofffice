"use client"

import { useEffect, useRef, useState } from "react"
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sparkles,
  Wand2,
  Loader2,
} from "lucide-react"
import { useSuite } from "@/components/suite-context"
import { MODELS, streamMessage } from "@/lib/ai-service"
import { MODEL_ICONS } from "@/components/model-selector"
import { cn } from "@/lib/utils"

const TOOLS = [
  { cmd: "bold", icon: Bold, label: "Bold" },
  { cmd: "italic", icon: Italic, label: "Italic" },
  { cmd: "underline", icon: Underline, label: "Underline" },
  { cmd: "insertUnorderedList", icon: List, label: "Bullet list" },
  { cmd: "insertOrderedList", icon: ListOrdered, label: "Numbered list" },
  { cmd: "justifyLeft", icon: AlignLeft, label: "Align left" },
  { cmd: "justifyCenter", icon: AlignCenter, label: "Align center" },
  { cmd: "justifyRight", icon: AlignRight, label: "Align right" },
]

export function WordApp() {
  const { docContent, setDocContent, docTitle, setDocTitle, activeModel, variants, apiKeys } = useSuite()
  const editorRef = useRef<HTMLDivElement>(null)
  const savedRange = useRef<Range | null>(null)
  const [prompt, setPrompt] = useState("")
  const [busy, setBusy] = useState(false)

  const m = MODELS[activeModel]
  const Icon = MODEL_ICONS[activeModel]
  const variantLabel = m.variants.find((v) => v.id === variants[activeModel])?.label

  // Hydrate editor from shared context once on mount / app switch.
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== docContent) {
      editorRef.current.innerHTML = docContent
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveSelection = () => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange()
    }
  }

  const exec = (cmd: string) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false)
    setDocContent(editorRef.current?.innerHTML ?? "")
  }

  const insertAtCursor = (text: string) => {
    const el = editorRef.current
    if (!el) return
    el.focus()
    const sel = window.getSelection()
    if (savedRange.current && sel) {
      sel.removeAllRanges()
      sel.addRange(savedRange.current)
    }
    document.execCommand("insertText", false, text)
    savedRange.current = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null
    setDocContent(el.innerHTML)
  }

  const writeForMe = async () => {
    if (busy) return
    setBusy(true)
    saveSelection()
    const context = editorRef.current?.innerText?.slice(-1200) ?? ""
    let last = ""
    await streamMessage(
      {
        model: activeModel,
        variant: variants[activeModel],
        apiKeys,
        mode: "write",
        prompt: prompt || "Continue writing this document naturally.",
        context,
      },
      (_full, delta) => {
        insertAtCursor(delta)
        last = delta
      },
    )
    void last
    setBusy(false)
    setPrompt("")
  }

  return (
    <div className="flex h-full min-w-0">
      {/* Document canvas */}
      <div className="flex min-w-0 flex-1 flex-col bg-background/50">
        {/* Floating formatting bar */}
        <div className="flex items-center gap-1 border-b border-border px-4 py-2">
          <input
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            className="mr-2 max-w-[180px] flex-1 truncate bg-transparent text-sm font-medium outline-none"
          />
          <div className="mx-1 hidden h-5 w-px bg-border sm:block" />
          <div className="flex items-center gap-0.5">
            {TOOLS.map((t) => {
              const TI = t.icon
              return (
                <button
                  key={t.cmd}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => exec(t.cmd)}
                  title={t.label}
                  aria-label={t.label}
                  className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <TI className="size-4" />
                </button>
              )
            })}
          </div>
        </div>

        {/* Paper */}
        <div className="flex-1 overflow-auto scroll-thin px-4 py-8">
          <div className="mx-auto min-h-[60vh] w-full max-w-[760px] rounded-lg bg-card p-10 shadow-2xl shadow-black/30 ring-1 ring-border lg:p-16">
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => setDocContent((e.target as HTMLDivElement).innerHTML)}
              onKeyUp={saveSelection}
              onMouseUp={saveSelection}
              data-placeholder="Start writing, or ask the AI Writer to draft for you…"
              className={cn(
                "min-h-[50vh] text-[15px] leading-7 text-foreground outline-none",
                "[&:empty]:before:text-muted-foreground [&:empty]:before:content-[attr(data-placeholder)]",
                "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6",
              )}
            />
          </div>
        </div>
      </div>

      {/* AI Writer panel */}
      <aside className="hidden w-80 shrink-0 flex-col border-l border-border bg-sidebar md:flex">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className="flex size-7 items-center justify-center rounded-md" style={{ color: m.accent, background: `${m.accent}1a` }}>
            <Icon className="size-4" />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-medium">AI Writer</div>
            <div className="text-[11px] text-muted-foreground">{m.brand} · {variantLabel}</div>
          </div>
        </div>

        <div className="flex-1 overflow-auto scroll-thin p-4">
          <div className="rounded-xl border border-border bg-card p-3 text-xs leading-relaxed text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">How {m.brand} writes here</p>
            {m.persona}
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Quick prompts</p>
            {["Write an intro paragraph", "Summarize the above", "Draft a closing statement"].map((q) => (
              <button
                key={q}
                onClick={() => setPrompt(q)}
                className="block w-full rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-border p-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Tell the AI Writer what to draft…"
            rows={2}
            className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          />
          <button
            onClick={writeForMe}
            disabled={busy}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
            {busy ? "Writing…" : "Write for me"}
          </button>
          <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
            <Sparkles className="size-3" /> Streams into your cursor position
          </p>
        </div>
      </aside>
    </div>
  )
}
