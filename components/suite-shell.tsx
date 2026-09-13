"use client"

import { useState } from "react"
import { FileText, Table2, Presentation, LayoutGrid, Settings, Sparkles, Code2, CalendarDays } from "lucide-react"
import { useSuite, type AppKey } from "@/components/suite-context"
import { ModelSelector } from "@/components/model-selector"
import { SettingsDialog } from "@/components/settings-dialog"
import { cn } from "@/lib/utils"

const NAV: { key: AppKey; label: string; sub: string; icon: typeof FileText; color: string }[] = [
  { key: "home", label: "Home", sub: "Dashboard", icon: LayoutGrid, color: "#9aa0a6" },
  { key: "word", label: "notjustaword", sub: "Documents", icon: FileText, color: "#4285f4" },
  { key: "sheet", label: "notjustasheet", sub: "Spreadsheets", icon: Table2, color: "#34a853" },
  { key: "slide", label: "notjustaslide", sub: "PowerPoint", icon: Presentation, color: "#fbbc04" },
  { key: "project", label: "Project Premium Pro", sub: "Planning", icon: CalendarDays, color: "#a78bfa" },
  { key: "code", label: "notjustacode", sub: "HTML + Preview", icon: Code2, color: "#67e8f9" },
]

export function SuiteShell({ children }: { children: React.ReactNode }) {
  const { activeApp, setActiveApp } = useSuite()
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <header className="z-40 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur">
        <button onClick={() => setActiveApp("home")} className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">
            notjustanoffice<span className="text-primary">.</span>
          </span>
        </button>

        <div className="flex items-center gap-2">
          <ModelSelector />
          <button
            onClick={() => setShowSettings(true)}
            className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Settings"
          >
            <Settings className="size-4" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <nav className="flex w-16 shrink-0 flex-col items-center gap-1 border-r border-border bg-sidebar py-3 lg:w-56 lg:items-stretch lg:px-3">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = activeApp === item.key
            return (
              <button
                key={item.key}
                onClick={() => setActiveApp(item.key)}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-0 py-2.5 transition-colors lg:px-3",
                  "justify-center lg:justify-start",
                  active ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/50",
                )}
              >
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ color: item.color, background: active ? `${item.color}1f` : "transparent" }}
                >
                  <Icon className="size-[18px]" />
                </span>
                <span className="hidden flex-col items-start leading-tight lg:flex">
                  <span className={cn("text-sm", active ? "font-medium text-foreground" : "text-muted-foreground")}>
                    {item.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{item.sub}</span>
                </span>
              </button>
            )
          })}
          <div className="mt-auto hidden lg:block">
            <div className="rounded-lg border border-border bg-card/50 p-3 text-[11px] leading-relaxed text-muted-foreground">
              State persists across every app. Switch models anytime — your work stays put.
            </div>
          </div>
        </nav>

        {/* Workspace */}
        <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
      </div>

      {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}
    </div>
  )
}
