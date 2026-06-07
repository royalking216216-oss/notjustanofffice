"use client"

import { X, KeyRound, ShieldCheck } from "lucide-react"
import { useSuite } from "@/components/suite-context"
import { MODELS, MODEL_ORDER } from "@/lib/ai-service"
import { MODEL_ICONS } from "@/components/model-selector"

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const { apiKeys, setApiKey } = useSuite()

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 text-primary" />
            <h2 className="font-medium">AI Provider Keys</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <p className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-400" />
            Keys stay in your browser session only. Leave a field blank to keep that model in personality-matched mock
            mode.
          </p>

          {MODEL_ORDER.map((id) => {
            const m = MODELS[id]
            const Icon = MODEL_ICONS[id]
            return (
              <div key={id} className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <span
                    className="flex size-6 items-center justify-center rounded-md"
                    style={{ color: m.accent, background: `${m.accent}1a` }}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  {m.vendor}
                  <span className="text-xs font-normal text-muted-foreground">({m.brand})</span>
                </label>
                <input
                  type="password"
                  value={apiKeys[id]}
                  onChange={(e) => setApiKey(id, e.target.value)}
                  placeholder={`Enter ${m.vendor} API key…`}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                />
              </div>
            )
          })}
        </div>

        <div className="flex justify-end border-t border-border px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
