"use client"

import { X, KeyRound, ShieldCheck, AlertTriangle } from "lucide-react"
import { useSuite } from "@/components/suite-context"
import { MODELS, MODEL_ORDER } from "@/lib/ai-service"

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
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span><strong>Backend key warning:</strong> AI requests always go through <code>/api/ai</code>. Server environment variables are safest. Optional session-only keys below are forwarded only to this app&apos;s backend route, never directly to a provider. Missing keys or provider errors automatically use Mock Mode.</span>
          </div>
          <p className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-400" />
            Keep provider secrets out of client storage. The active model name always appears in each app.
          </p>

          <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            Server keys are recommended. You can also add a session-only key below for this browser; it is sent only to your own <code>/api/ai</code> route and is cleared when this browser session ends.
          </div>

          <div className="flex flex-col gap-3">
            {MODEL_ORDER.map((id) => {
              const model = MODELS[id]
              return (
                <label key={id} className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium">{model.vendor} <span className="text-xs text-muted-foreground">({model.brand})</span></span>
                  <input
                    type="password"
                    value={apiKeys[id]}
                    onChange={(event) => setApiKey(id, event.target.value)}
                    placeholder={`Session-only ${model.vendor} API key`}
                    autoComplete="off"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                  />
                </label>
              )
            })}
          </div>
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
