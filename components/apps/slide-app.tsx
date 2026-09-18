"use client"

import { useState } from "react"
import { Loader2, Wand2, Plus, Trash2, Presentation, Upload, FilePlus2 } from "lucide-react"
import { useSuite, type Slide } from "@/components/suite-context"
import { MODELS, streamMessage } from "@/lib/ai-service"
import { MODEL_ICONS } from "@/components/model-selector"
import { cn } from "@/lib/utils"

export function SlideApp() {
  const { slides, setSlides, activeSlide, setActiveSlide, updateSlide, activeModel, variants, apiKeys } = useSuite()
  const [prompt, setPrompt] = useState("")
  const [busy, setBusy] = useState(false)

  const m = MODELS[activeModel]
  const Icon = MODEL_ICONS[activeModel]
  const variantLabel = m.variants.find((v) => v.id === variants[activeModel])?.label
  const current = slides[activeSlide]

  const generate = async () => {
    if (busy) return
    setBusy(true)
    const full = await streamMessage({
      model: activeModel,
      variant: variants[activeModel],
      mode: "outline",
  prompt: prompt || "A corporate strategy overview",
  apiKeys,
  })
    let parsed: { title: string; bullets: string[] }[] = []
    try {
      const json = full.slice(full.indexOf("["), full.lastIndexOf("]") + 1)
      parsed = JSON.parse(json)
    } catch {
      parsed = []
    }
    if (parsed.length) {
      const newSlides: Slide[] = parsed.map((s, i) => ({
        id: `gen-${Date.now()}-${i}`,
        title: s.title,
        bullets: s.bullets,
      }))
      setSlides(newSlides)
      setActiveSlide(0)
    }
    setBusy(false)
  }

  const importSlides = async (file: File) => {
    const text = await file.text()
    const blocks = text.split(/\n\s*---+\s*\n|\n\s*SLIDE\s+\d+\s*\n/i).map((block) => block.trim()).filter(Boolean)
    const imported: Slide[] = blocks.map((block, i) => {
      const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
      return { id: `import-${Date.now()}-${i}`, title: lines[0]?.replace(/^#+\s*/, "") || `Imported slide ${i + 1}`, bullets: (lines.slice(1).map((line) => line.replace(/^[-*•]\s*/, "")).filter(Boolean).slice(0, 6)) }
    }).filter((slide) => slide.bullets.length > 0)
    if (imported.length) { setSlides([...slides, ...imported]); setActiveSlide(slides.length) }
  }

  const openPresentation = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".txt,.md,.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
    input.onchange = () => { const file = input.files?.[0]; if (file) void importSlides(file) }
    input.click()
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file) void importSlides(file)
  }

  const addSlide = () => {
    const s: Slide = { id: `s-${Date.now()}`, title: "New slide", bullets: ["Add your point here"] }
    setSlides([...slides, s])
    setActiveSlide(slides.length)
  }

  const removeSlide = (i: number) => {
    if (slides.length === 1) return
    const next = slides.filter((_, idx) => idx !== i)
    setSlides(next)
    setActiveSlide(Math.max(0, i - 1))
  }

  return (
    <div className="flex h-full min-w-0" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
      {/* Thumbnail deck */}
      <div className="hidden w-44 shrink-0 flex-col gap-2 overflow-auto scroll-thin border-r border-border bg-sidebar p-3 lg:flex">
        {slides.map((s, i) => (
          <div key={s.id} className="group relative">
            <button
              onClick={() => setActiveSlide(i)}
              className={cn(
                "aspect-video w-full overflow-hidden rounded-lg border bg-card p-2 text-left transition-colors",
                i === activeSlide ? "border-primary ring-1 ring-primary" : "border-border hover:border-foreground/30",
              )}
            >
              <span className="absolute left-1.5 top-1.5 text-[10px] text-muted-foreground">{i + 1}</span>
              <div className="mt-3 line-clamp-2 text-[11px] font-medium leading-tight">{s.title}</div>
            </button>
            {slides.length > 1 && (
              <button
                onClick={() => removeSlide(i)}
                className="absolute right-1 top-1 hidden rounded bg-background/80 p-1 text-muted-foreground hover:text-destructive group-hover:block"
                aria-label="Delete slide"
              >
                <Trash2 className="size-3" />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addSlide}
          className="flex aspect-video w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Plus className="size-4" /> Add slide
        </button>
        <button onClick={openPresentation} className="flex items-center justify-center gap-1 rounded-lg border border-border px-2 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <Upload className="size-3.5" /> Import deck
        </button>
      </div>

      {/* Canvas */}
      <div className="flex min-w-0 flex-1 items-center justify-center overflow-auto scroll-thin bg-background/50 p-6">
        {current && (
            <div className="aspect-video w-full max-w-3xl rounded-2xl border border-border bg-card p-10 shadow-2xl shadow-black/30 lg:p-14">
              <div className="mb-3 flex items-center gap-1 text-[11px] text-muted-foreground"><FilePlus2 className="size-3.5" /> Drop a PPTX or text outline anywhere to append slides</div>
            <input
              value={current.title}
              onChange={(e) => updateSlide(activeSlide, { title: e.target.value })}
              className="w-full border-b border-transparent bg-transparent pb-2 text-2xl font-semibold tracking-tight outline-none focus:border-border lg:text-3xl"
            />
            <ul className="mt-6 space-y-3">
              {current.bullets.map((b, bi) => (
                <li key={bi} className="flex items-start gap-3">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full" style={{ background: m.accent }} />
                  <input
                    value={b}
                    onChange={(e) => {
                      const bullets = [...current.bullets]
                      bullets[bi] = e.target.value
                      updateSlide(activeSlide, { bullets })
                    }}
                    className="flex-1 bg-transparent text-[15px] leading-relaxed text-foreground outline-none"
                  />
                  <button
                    onClick={() =>
                      updateSlide(activeSlide, { bullets: current.bullets.filter((_, idx) => idx !== bi) })
                    }
                    className="mt-1 text-muted-foreground hover:text-destructive"
                    aria-label="Remove bullet"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={() => updateSlide(activeSlide, { bullets: [...current.bullets, "New point"] })}
              className="mt-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <Plus className="size-3.5" /> Add bullet
            </button>
          </div>
        )}
      </div>

      {/* Slide Copilot panel */}
      <aside className="hidden w-80 shrink-0 flex-col border-l border-border bg-sidebar md:flex">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className="flex size-7 items-center justify-center rounded-md" style={{ color: m.accent, background: `${m.accent}1a` }}>
            <Icon className="size-4" />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-medium">{m.brand} Presentation Assistant</div>
            <div className="text-[11px] text-muted-foreground">{m.brand} · {variantLabel}</div>
          </div>
        </div>

        <div className="flex-1 overflow-auto scroll-thin p-4">
          <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            <Presentation className="mx-auto mb-2 size-5" />
            Describe your deck and {m.brand} builds a 4-slide corporate outline with titles and bullets.
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Try</p>
            {["Q3 sales review for leadership", "Pitch deck for an AI startup", "Onboarding plan for new hires"].map(
              (q) => (
                <button
                  key={q}
                  onClick={() => setPrompt(q)}
                  className="block w-full rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                >
                  {q}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="border-t border-border p-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Generate a presentation about…"
            rows={2}
            className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          />
          <button
            onClick={generate}
            disabled={busy}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
            {busy ? "Generating…" : "Generate Presentation Outline"}
          </button>
        </div>
      </aside>
    </div>
  )
}
