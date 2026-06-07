"use client"

import { SuiteProvider, useSuite } from "@/components/suite-context"
import { SuiteShell } from "@/components/suite-shell"
import { HomeDashboard } from "@/components/apps/home-dashboard"
import { WordApp } from "@/components/apps/word-app"
import { SheetApp } from "@/components/apps/sheet-app"
import { SlideApp } from "@/components/apps/slide-app"

function Workspace() {
  const { activeApp } = useSuite()
  switch (activeApp) {
    case "word":
      return <WordApp />
    case "sheet":
      return <SheetApp />
    case "slide":
      return <SlideApp />
    default:
      return <HomeDashboard />
  }
}

export default function Page() {
  return (
    <SuiteProvider>
      <SuiteShell>
        <Workspace />
      </SuiteShell>
    </SuiteProvider>
  )
}
