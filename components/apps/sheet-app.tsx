"use client"

import { useMemo, useState } from "react"
import { Loader2, Wand2, BarChart3, TableProperties } from "lucide-react"
import { useSuite } from "@/components/suite-context"
import { MODELS, streamMessage, evalFormula } from "@/lib/ai-service"
import { MODEL_ICONS } from "@/components/model-selector"
import { cn } from "@/lib/utils"

const COLS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))
const ROWS = Array.from({ length: 100 }, (_, i) => i + 1)

export function SheetApp() {
  const { cells, setCell, setCellsBulk, activeModel, variants, apiKeys } = useSuite()
  const [selected, setSelected] = useState("A1")
  const [editing, setEditing] = useState<string | null>(null)
  const [prompt, setPrompt] = useState("")
  const [analysis, setAnalysis] = useState("")
  const [busy, setBusy] = useState(false)

  const m = MODELS[activeModel]
  const Icon = MODEL_ICONS[activeModel]
  const variantLabel = m.variants.find((v) => v.id === variants[activeModel])?.label

  // Evaluate a cell reference (handles formulas, with shallow recursion guard).
  const display = useMemo(() => {
    const cache: Record<string, string> = {}
    const resolve = (ref: string, depth = 0): string => {
      if (depth > 20) return "#REF"
      if (cache[ref] !== undefined) return cache[ref]
      const raw = cells[ref] ?? ""
      if (!raw.startsWith("=")) {
        cache[ref] = raw
        return raw
      }
      cache[ref] = "0" // guard cycles
      const out = evalFormula(raw, (r) => resolve(r, depth + 1))
      cache[ref] = out
      return out
    }
    return resolve
  }, [cells])

  const gridSnapshot = () => {
    const lines: string[] = []
    for (const r of ROWS) {
      const row: string[] = []
      let has = false
      for (const c of COLS.slice(0, 8)) {
        const ref = `${c}${r}`
        const v = display(ref)
        if (v) has = true
        row.push(v)
      }
      if (has) lines.push(`Row ${r}: ${row.filter(Boolean).join(" | ")}`)
    }
    return lines.join("\n")
  }

  const analyze = async () => {
    if (busy) return
    setBusy(true)
    setAnalysis("")
    await streamMessage(
      {
        model: activeModel,
        variant: variants[activeModel],
        apiKeys,
        mode: "analyze",
        prompt: prompt || "Analyze this grid and suggest formulas.",
        context: gridSnapshot(),
      },
      (full) => setAnalysis(full),
    )
    setBusy(false)
  }

  const populateSheet = () => {
    const startRow = parseInt(selected.match(/\d+/)?.[0] ?? "1", 10)
    const sample: Record<string, string> = {
      [`A${startRow}`]: "Month",
      [`B${startRow}`]: "Revenue",
      [`C${startRow}`]: "Costs",
      [`D${startRow}`]: "Profit",
    }
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
    months.forEach((mo, i) => {
      const r = startRow + 1 + i
      const rev = 80000 + i * 12000
      const cost = 40000 + i * 5000
      sample[`A${r}`] = mo
      sample[`B${r}`] = String(rev)
      sample[`C${r}`] = String(cost)
      sample[`D${r}`] = `=B${r}-C${r}`
    })
    const totalRow = startRow + months.length + 1
    sample[`A${totalRow}`] = "Total"
    sample[`B${totalRow}`] = `=SUM(B${startRow + 1}:B${startRow + months.length})`
    sample[`C${totalRow}`] = `=SUM(C${startRow + 1}:C${startRow + months.length})`
    sample[`D${totalRow}`] = `=SUM(D${startRow + 1}:D${startRow + months.length})`
    setCellsBulk(sample)
  }

  return (
    <div className="flex h-full min-w-0">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Formula bar */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-2">
          <span className="flex h-7 min-w-12 items-center justify-center rounded-md border border-border bg-card px-2 font-mono text-xs">
            {selected}
          </span>
          <span className="text-muted-foreground">=</span>
          <input
            value={cells[selected] ?? ""}
            onChange={(e) => setCell(selected, e.target.value)}
            placeholder="Enter a value or =SUM(B2:B10)"
            className="flex-1 bg-transparent font-mono text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto scroll-thin">
          <table className="border-collapse">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="sticky left-0 z-20 h-7 w-12 border border-border bg-secondary" />
                {COLS.map((c) => (
                  <th
                    key={c}
                    className="h-7 min-w-24 border border-border bg-secondary text-xs font-medium text-muted-foreground"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r}>
                  <td className="sticky left-0 z-10 h-7 w-12 border border-border bg-secondary text-center text-xs text-muted-foreground">
                    {r}
                  </td>
                  {COLS.map((c) => {
                    const ref = `${c}${r}`
                    const isSel = selected === ref
                    const isEditing = editing === ref
                    const raw = cells[ref] ?? ""
                    return (
                      <td
                        key={ref}
                        onClick={() => setSelected(ref)}
                        onDoubleClick={() => setEditing(ref)}
                        className={cn(
                          "h-7 min-w-24 border p-0 text-sm",
                          isSel ? "border-primary" : "border-border",
                        )}
                        style={isSel ? { boxShadow: "inset 0 0 0 1px var(--primary)" } : undefined}
                      >
                        {isEditing ? (
                          <input
                            autoFocus
                            defaultValue={raw}
                            onBlur={(e) => {
                              setCell(ref, e.target.value)
                              setEditing(null)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                setCell(ref, (e.target as HTMLInputElement).value)
                                setEditing(null)
                              }
                              if (e.key === "Escape") setEditing(null)
                            }}
                            className="h-full w-full bg-card px-1.5 font-mono text-sm outline-none"
                          />
                        ) : (
                          <span
                            className={cn(
                              "flex h-full items-center px-1.5",
                              raw.startsWith("=") && "text-primary",
                            )}
                          >
                            {display(ref)}
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Analyst panel */}
      <aside className="hidden w-80 shrink-0 flex-col border-l border-border bg-sidebar md:flex">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className="flex size-7 items-center justify-center rounded-md" style={{ color: m.accent, background: `${m.accent}1a` }}>
            <Icon className="size-4" />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-medium">AI Analyst</div>
            <div className="text-[11px] text-muted-foreground">{m.brand} · {variantLabel}</div>
          </div>
        </div>

        <div className="flex-1 overflow-auto scroll-thin p-4">
          <button
            onClick={populateSheet}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card py-2.5 text-sm font-medium transition-colors hover:bg-accent"
          >
            <TableProperties className="size-4" />
            Populate Sheet
          </button>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Fills a sample P&amp;L starting at {selected} with live formulas.
          </p>

          {analysis ? (
            <div className="mt-4 whitespace-pre-wrap rounded-xl border border-border bg-card p-3 text-xs leading-relaxed text-foreground">
              {analysis}
              {busy && <span className="caret-blink" />}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              <BarChart3 className="mx-auto mb-2 size-5" />
              Ask {m.brand} to analyze your grid — totals, trends and suggested formulas.
            </div>
          )}
        </div>

        <div className="border-t border-border p-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Analyze this financial grid"
            rows={2}
            className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          />
          <button
            onClick={analyze}
            disabled={busy}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
            {busy ? "Analyzing…" : "Analyze grid"}
          </button>
        </div>
      </aside>
    </div>
  )
}
