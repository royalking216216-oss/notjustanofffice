"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import { type ModelId, type ApiKeys, EMPTY_KEYS, MODELS } from "@/lib/ai-service"

export type AppKey = "home" | "word" | "sheet" | "slide" | "code" | "project"

export interface ProjectTask {
  id: string
  name: string
  phase: string
  owner: string
  duration: number
  start: string
  status: string
  dependency: string
  milestone: boolean
  description: string
}

export interface Slide {
  id: string
  title: string
  bullets: string[]
}

interface SuiteState {
  // ── AI routing ──
  activeModel: ModelId
  setActiveModel: (m: ModelId) => void
  variants: Record<ModelId, string>
  setVariant: (m: ModelId, v: string) => void
  apiKeys: ApiKeys
  setApiKey: (m: ModelId, key: string) => void

  // ── Navigation ──
  activeApp: AppKey
  setActiveApp: (a: AppKey) => void

  // ── notjustaword ──
  docContent: string
  setDocContent: (c: string) => void
  docTitle: string
  setDocTitle: (t: string) => void

  // ── notjustasheet ──
  cells: Record<string, string>
  setCell: (ref: string, value: string) => void
  setCellsBulk: (entries: Record<string, string>) => void

  // ── notjustaslide ──
  slides: Slide[]
  setSlides: (s: Slide[]) => void
  activeSlide: number
  setActiveSlide: (i: number) => void
  updateSlide: (i: number, patch: Partial<Slide>) => void

  // ── Project Premium Pro ──
  projectTasks: ProjectTask[]
  setProjectTasks: (tasks: ProjectTask[]) => void
  updateProjectTask: (id: string, patch: Partial<ProjectTask>) => void
}

const SuiteContext = createContext<SuiteState | null>(null)

const DEFAULT_VARIANTS: Record<ModelId, string> = {
  openai: MODELS.openai.variants[0].id,
  anthropic: MODELS.anthropic.variants[0].id,
  google: MODELS.google.variants[0].id,
  xai: MODELS.xai.variants[0].id,
}

const STARTER_SLIDES: Slide[] = [
  {
    id: "s1",
    title: "notjustaslide",
    bullets: ["A presentation that builds itself", "Powered by your chosen AI engine", "Outline → deck in one click"],
  },
]

export function SuiteProvider({ children }: { children: ReactNode }) {
  const [activeModel, setActiveModel] = useState<ModelId>("anthropic")
  const [variants, setVariants] = useState<Record<ModelId, string>>(DEFAULT_VARIANTS)
  const [apiKeys, setApiKeys] = useState<ApiKeys>(EMPTY_KEYS)
  const [activeApp, setActiveApp] = useState<AppKey>("home")

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem("notjustanoffice-api-keys")
      if (saved) setApiKeys({ ...EMPTY_KEYS, ...(JSON.parse(saved) as Partial<ApiKeys>) })
    } catch {}
  }, [])

  useEffect(() => {
    try { window.sessionStorage.setItem("notjustanoffice-api-keys", JSON.stringify(apiKeys)) } catch {}
  }, [apiKeys])

  const [docContent, setDocContent] = useState<string>("")
  const [docTitle, setDocTitle] = useState<string>("Untitled document")

  const [cells, setCells] = useState<Record<string, string>>({
    A1: "Quarter",
    B1: "Revenue",
    A2: "Q1",
    B2: "120000",
    A3: "Q2",
    B3: "145000",
    A4: "Q3",
    B4: "168000",
    A5: "Q4",
    B5: "192000",
  })

  const [slides, setSlides] = useState<Slide[]>(STARTER_SLIDES)
  const [activeSlide, setActiveSlide] = useState(0)
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([])

  const updateProjectTask = useCallback((id: string, patch: Partial<ProjectTask>) => {
    setProjectTasks((prev) => prev.map((task) => (task.id === id ? { ...task, ...patch } : task)))
  }, [])

  const setVariant = useCallback((m: ModelId, v: string) => {
    setVariants((prev) => ({ ...prev, [m]: v }))
  }, [])

  const setApiKey = useCallback((m: ModelId, key: string) => {
    setApiKeys((prev) => ({ ...prev, [m]: key }))
  }, [])

  const setCell = useCallback((ref: string, value: string) => {
    setCells((prev) => {
      const next = { ...prev }
      if (value === "") delete next[ref]
      else next[ref] = value
      return next
    })
  }, [])

  const setCellsBulk = useCallback((entries: Record<string, string>) => {
    setCells((prev) => ({ ...prev, ...entries }))
  }, [])

  const updateSlide = useCallback((i: number, patch: Partial<Slide>) => {
    setSlides((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
  }, [])

  return (
    <SuiteContext.Provider
      value={{
        activeModel,
        setActiveModel,
        variants,
        setVariant,
        apiKeys,
        setApiKey,
        activeApp,
        setActiveApp,
        docContent,
        setDocContent,
        docTitle,
        setDocTitle,
        cells,
        setCell,
        setCellsBulk,
        slides,
        setSlides,
        activeSlide,
        setActiveSlide,
        updateSlide,
        projectTasks,
        setProjectTasks,
        updateProjectTask,
      }}
    >
      {children}
    </SuiteContext.Provider>
  )
}

export function useSuite() {
  const ctx = useContext(SuiteContext)
  if (!ctx) throw new Error("useSuite must be used within SuiteProvider")
  return ctx
}
