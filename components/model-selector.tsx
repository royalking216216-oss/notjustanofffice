"use client"

import { useEffect, useRef, useState } from "react"
import { Brain, PenLine, Sparkles, Zap, Check, ChevronDown } from "lucide-react"
import { useSuite } from "@/components/suite-context"
import { MODELS, MODEL_ORDER, type ModelId, hasKey } from "@/lib/ai-service"
import { cn } from "@/lib/utils"

const ICONS: Record<ModelId, typeof Brain> = {
  openai: Brain,
  anthropic: PenLine,
  google: Sparkles,
  xai: Zap,
}

export function ModelSelector() {
  const { activeModel, setActiveModel, variants, setVariant, apiKeys } = useSuite()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  const active = MODELS[activeModel]
  const ActiveIcon = ICONS[activeModel]

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="group flex items-center gap-2.5 rounded-full border border-border bg-card/60 py-1.5 pl-2 pr-3 text-sm transition-colors hover:bg-accent"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="relative flex size-6 items-center justify-center rounded-full" style={{ color: active.accent }}>
          <span
            className="absolute inset-0 rounded-full opacity-30 blur-[6px] animate-pulse-glow"
            style={{ background: active.accent }}
          />
          <ActiveIcon className="relative size-4" />
        </span>
        <span className="hidden flex-col items-start leading-tight sm:flex">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Active AI model</span>
          <span className="font-medium text-foreground">
            {active.brand} · {MODELS[activeModel].variants.find((v) => v.id === variants[activeModel])?.label}
          </span>
        </span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-border bg-popover shadow-2xl shadow-black/40"
        >
          <div className="border-b border-border px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            Switch AI engine
          </div>
          <div className="max-h-[60vh] overflow-auto scroll-thin p-1.5">
            {MODEL_ORDER.map((id) => {
              const m = MODELS[id]
              const Icon = ICONS[id]
              const isActive = id === activeModel
              return (
                <div key={id} className="rounded-lg p-1">
                  <button
                    onClick={() => setActiveModel(id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent",
                      isActive && "bg-accent",
                    )}
                  >
                    <span
                      className="flex size-7 items-center justify-center rounded-md"
                      style={{ color: m.accent, background: `${m.accent}1a` }}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="flex-1">
                      <span className="block font-medium text-foreground">{m.brand}</span>
                      <span className="block text-xs text-muted-foreground">{m.vendor}</span>
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                        hasKey(id, apiKeys)
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {hasKey(id, apiKeys) ? "Live" : "Mock"}
                    </span>
                    {isActive && <Check className="size-4" style={{ color: m.accent }} />}
                  </button>
                  {isActive && (
                    <div className="mt-1 flex gap-1.5 pl-9 pr-1 pb-1">
                      {m.variants.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => setVariant(id, v.id)}
                          className={cn(
                            "rounded-md border px-2 py-1 text-xs transition-colors",
                            variants[id] === v.id
                              ? "border-transparent text-foreground"
                              : "border-border text-muted-foreground hover:text-foreground",
                          )}
                          style={
                            variants[id] === v.id ? { background: `${m.accent}26`, color: m.accent } : undefined
                          }
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export { ICONS as MODEL_ICONS }
