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
  MessageSquare,
  Send,
  Plus,
  ArrowDownToLine,
  Download,
  Check,
  FolderOpen,
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

type ChatMsg = { role: "user" | "assistant"; content: string }

export function WordApp() {
  const { docContent, setDocContent, docTitle, setDocTitle, activeModel, variants, apiKeys } = useSuite()
  const editorRef = useRef<HTMLDivElement>(null)
  const savedRange = useRef<Range | null>(null)
  const [prompt, setPrompt] = useState("")
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<"chat" | "writer">("chat")
  const [downloadOpen, setDownloadOpen] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  // chat state
  const [chat, setChat] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState("")
  const [chatBusy, setChatBusy] = useState(false)
  const chatScrollRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" })
  }, [chat, chatBusy])

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

  // Append AI text to the end of the document (used by chat "Insert").
  const appendToDoc = (text: string) => {
    const el = editorRef.current
    if (!el) return
    const html = text
      .split(/\n{2,}/)
      .map((para) => `<p>${para.replace(/\n/g, "<br/>")}</p>`)
      .join("")
    el.innerHTML = (el.innerHTML || "") + html
    setDocContent(el.innerHTML)
    el.scrollIntoView({ block: "end" })
  }

  const safeName = () => (docTitle.trim() || "Untitled Document").replace(/[^\w\s-]/g, "").trim() || "document"

  const triggerDownload = (blob: Blob, ext: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${safeName()}.${ext}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setDownloadOpen(false)
    setDownloaded(true)
    setTimeout(() => setDownloaded(false), 2000)
  }

  const downloadDoc = () => {
    const body = editorRef.current?.innerHTML ?? docContent
    const html = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${safeName()}</title><style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.5;color:#1a1a1a;max-width:760px;margin:40px auto;padding:0 24px;}h1{font-size:20pt;}ul,ol{padding-left:24px;}</style></head><body><h1>${safeName()}</h1>${body}</body></html>`
    triggerDownload(new Blob([html], { type: "application/msword" }), "doc")
  }

  const downloadHtml = () => {
    const body = editorRef.current?.innerHTML ?? docContent
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${safeName()}</title><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.6;color:#1a1a1a;max-width:740px;margin:48px auto;padding:0 24px;}ul,ol{padding-left:24px;}</style></head><body>${body}</body></html>`
    triggerDownload(new Blob([html], { type: "text/html" }), "html")
  }

  const downloadTxt = () => {
    const text = editorRef.current?.innerText ?? ""
    triggerDownload(new Blob([text], { type: "text/plain" }), "txt")
  }

  const importDocumentFile = async (file: File) => {
    const text = await file.text()
    const imported = file.type.includes("html") || /\.(html?|doc)$/i.test(file.name) ? text : `<p>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>" )}</p>`
    if (editorRef.current) editorRef.current.innerHTML = imported
    setDocContent(imported)
    setDocTitle(file.name.replace(/\.[^.]+$/, "") || "Imported document")
  }

  const handleDocumentDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file) void importDocumentFile(file)
  }

  const openDocument = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".txt,.md,.html,.htm,.doc,.docx,text/plain,text/html,text/markdown"
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const text = await file.text()
      await importDocumentFile(file)
    }
    input.click()
  }

  const downloadMd = () => {
    // Lightweight HTML → Markdown for headings, lists, bold/italic and paragraphs.
    const el = editorRef.current
    const src = el?.innerHTML ?? docContent
    const md = src
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n")
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n")
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n")
      .replace(/<(strong|b)>(.*?)<\/\1>/gi, "**$2**")
      .replace(/<(em|i)>(.*?)<\/\1>/gi, "_$2_")
      .replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n")
      .replace(/<\/(ul|ol)>/gi, "\n")
      .replace(/<(ul|ol)[^>]*>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
    triggerDownload(new Blob([md], { type: "text/markdown" }), "md")
  }

  const writeForMe = async () => {
    if (busy) return
    setBusy(true)
    saveSelection()
    const context = editorRef.current?.innerText?.slice(-1200) ?? ""
    await streamMessage(
      {
        model: activeModel,
        variant: variants[activeModel],
        apiKeys,
        mode: "write",
        prompt: prompt || "Continue writing this document naturally.",
        context,
      },
      (_full, delta) => insertAtCursor(delta),
    )
    setBusy(false)
    setPrompt("")
  }

  const sendChat = async (text?: string) => {
    const message = (text ?? chatInput).trim()
    if (!message || chatBusy) return
    setChatInput("")
    setChat((c) => [...c, { role: "user", content: message }, { role: "assistant", content: "" }])
    setChatBusy(true)
    const context = editorRef.current?.innerText?.slice(-1500) ?? ""
    await streamMessage(
      {
        model: activeModel,
        variant: variants[activeModel],
        apiKeys,
        mode: "chat",
        prompt: message,
        context: context ? `Current document:\n${context}` : undefined,
      },
      (full) => {
        setChat((c) => {
          const next = [...c]
          next[next.length - 1] = { role: "assistant", content: full }
          return next
        })
      },
    )
    setChatBusy(false)
  }

  return (
    <div className="flex h-full min-w-0" onDragOver={(event) => event.preventDefault()} onDrop={handleDocumentDrop}>
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
          <button onClick={openDocument} className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" aria-label="Open document">
            <FolderOpen className="size-3.5" /> <span className="hidden sm:inline">Open</span>
          </button>
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

          {/* Download */}
          <div className="relative ml-auto">
            <button
              onClick={() => setDownloadOpen((o) => !o)}
              onBlur={() => setTimeout(() => setDownloadOpen(false), 150)}
              className={cn(
                "flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium transition-colors",
                downloaded
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {downloaded ? <Check className="size-3.5" /> : <Download className="size-3.5" />}
              {downloaded ? "Saved" : "Download"}
            </button>
            {downloadOpen && (
              <div className="absolute right-0 top-full z-20 mt-1.5 w-44 overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-2xl shadow-black/40">
                {[
                  { label: "Word (.doc)", hint: "Microsoft Word", fn: downloadDoc },
                  { label: "Web page (.html)", hint: "Formatted HTML", fn: downloadHtml },
                  { label: "Markdown (.md)", hint: "Plain markup", fn: downloadMd },
                  { label: "Plain text (.txt)", hint: "Text only", fn: downloadTxt },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={opt.fn}
                    className="flex w-full flex-col items-start px-3 py-1.5 text-left transition-colors hover:bg-accent"
                  >
                    <span className="text-sm text-foreground">{opt.label}</span>
                    <span className="text-[11px] text-muted-foreground">{opt.hint}</span>
                  </button>
                ))}
              </div>
            )}
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
              data-placeholder="Start writing, or ask the AI to draft for you…"
              className={cn(
                "min-h-[50vh] text-[15px] leading-7 text-foreground outline-none",
                "[&:empty]:before:text-muted-foreground [&:empty]:before:content-[attr(data-placeholder)]",
                "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6",
              )}
            />
          </div>
        </div>
      </div>

      {/* AI side panel */}
      <aside className="hidden w-80 shrink-0 flex-col border-l border-border bg-sidebar md:flex">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span
            className="flex size-7 items-center justify-center rounded-md"
            style={{ color: m.accent, background: `${m.accent}1a` }}
          >
            <Icon className="size-4" />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-medium">{m.brand} Writer</div>
            <div className="text-[11px] text-muted-foreground">
              {m.brand} · {variantLabel}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border px-3 py-2">
          <button
            onClick={() => setTab("chat")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors",
              tab === "chat" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <MessageSquare className="size-4" /> Ask AI
          </button>
          <button
            onClick={() => setTab("writer")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors",
              tab === "writer" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Wand2 className="size-4" /> Writer
          </button>
        </div>

        {tab === "chat" ? (
          <>
            <div ref={chatScrollRef} className="flex-1 overflow-auto scroll-thin p-4">
              {chat.length === 0 ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-border bg-card p-3 text-xs leading-relaxed text-muted-foreground">
                    <p className="mb-1 font-medium text-foreground">Chat with {m.brand}</p>
                    Ask anything about your document. {m.brand} can see what you&apos;ve written, and you can drop any
                    reply straight into the page.
                  </div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Try asking</p>
                  {[
                    "Write a 3-paragraph blog intro about remote work",
                    "Rewrite my last paragraph more formally",
                    "Give me 5 catchy titles for this",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => sendChat(q)}
                      className="block w-full rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {chat.map((msg, i) =>
                    msg.role === "user" ? (
                      <div key={i} className="flex justify-end">
                        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <div key={i} className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Icon className="size-3.5" style={{ color: m.accent }} />
                          {m.brand}
                        </div>
                        <div className="rounded-2xl rounded-bl-sm border border-border bg-card px-3 py-2 text-sm leading-relaxed text-foreground">
                          {msg.content ? (
                            <span className="whitespace-pre-wrap">{msg.content}</span>
                          ) : (
                            <Loader2 className="size-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                        {msg.content && !(chatBusy && i === chat.length - 1) && (
                          <button
                            onClick={() => appendToDoc(msg.content)}
                            className="flex w-fit items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          >
                            <ArrowDownToLine className="size-3" /> Insert into document
                          </button>
                        )}
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-border p-3">
              {chat.length > 0 && (
                <button
                  onClick={() => setChat([])}
                  className="mb-2 flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Plus className="size-3" /> New chat
                </button>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      sendChat()
                    }
                  }}
                  placeholder={`Ask ${m.brand} to write…`}
                  rows={1}
                  className="max-h-32 min-h-[40px] flex-1 resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                />
                <button
                  onClick={() => sendChat()}
                  disabled={chatBusy || !chatInput.trim()}
                  aria-label="Send message"
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {chatBusy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
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
                placeholder="Tell the Writer what to draft…"
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
          </>
        )}
      </aside>
    </div>
  )
}
