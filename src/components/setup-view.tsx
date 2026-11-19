import { useEffect, useMemo, useRef, useState } from "react"
import { CircleCheck, ClipboardPaste, Copy, Download, Loader2, TriangleAlert, X } from "lucide-react"
import { toast } from "sonner"

import { AdminGuide } from "@/components/admin-guide"
import { TutorialVideo } from "@/components/tutorial-video"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { BOOKMARKLET, GRAB } from "@/lib/grab"
import {
  CATALOG_PAGE_URL,
  CATALOG_TEMPLATE,
  CATALOG_URLS,
  inspectCatalog,
  parsePerms,
} from "@/lib/catalog"
import { cn } from "@/lib/utils"

export const DEFAULT_SOURCE = "Default catalog (CIPP Permissions Mapper)"
export interface CustomCatalog {
  name: string
  text: string
}
export interface OtherInput {
  name: string
  text: string
}
export interface BuildInput {
  mine: string[]
  csv: string
  source: string
  custom: CustomCatalog
  other: OtherInput
}

type CatalogState = { status: "loading" | "ready" | "failed"; text: string; lines: number }

function useCatalog(): CatalogState {
  const [s, setS] = useState<CatalogState>({ status: "loading", text: "", lines: 0 })
  useEffect(() => {
    let alive = true
    ;(async () => {
      for (const url of CATALOG_URLS) {
        try {
          const r = await fetch(url)
          if (!r.ok) continue
          const text = await r.text()
          if (alive) setS({ status: "ready", text, lines: text.split("\n").length })
          return
        } catch {
          /* try next */
        }
      }
      if (alive) setS({ status: "failed", text: "", lines: 0 })
    })()
    return () => {
      alive = false
    }
  }, [])
  return s
}

function downloadText(name: string, text: string) {
  const a = document.createElement("a")
  a.href = URL.createObjectURL(new Blob(["\ufeff" + text], { type: "text/csv" }))
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function Step({ n, children }: { n: number | string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <span className="grid size-6 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
        {n}
      </span>
      {children}
    </span>
  )
}

function More({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="rounded-lg border" open={open}>
      <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium select-none">{title}</summary>
      <div className="space-y-3 border-t px-4 py-3">{children}</div>
    </details>
  )
}

export function SetupView({
  onBuild,
  initialPerms,
  initialCustom,
  initialOther,
}: {
  onBuild: (i: BuildInput) => void
  initialPerms: string
  initialCustom: CustomCatalog
  initialOther: OtherInput
}) {
  const catalog = useCatalog()
  const [perms, setPerms] = useState(initialPerms)
  const [otherName, setOtherName] = useState(initialOther.name)
  const [otherText, setOtherText] = useState(initialOther.text)
  const [custom, setCustom] = useState(initialCustom.text)
  const [customName, setCustomName] = useState(initialCustom.name)
  const [fileKey, setFileKey] = useState(0)
  const bm = useRef<HTMLAnchorElement>(null)
  const count = parsePerms(perms).length
  const otherCount = parsePerms(otherText).length
  const hasCustom = custom.trim().length > 0
  const info = useMemo(() => (hasCustom ? inspectCatalog(custom) : null), [custom, hasCustom])

  // React refuses javascript: hrefs, so set the bookmarklet imperatively.
  useEffect(() => {
    bm.current?.setAttribute("href", BOOKMARKLET)
  }, [])

  const clearCustom = () => {
    setCustom("")
    setCustomName("")
    setFileKey((k) => k + 1)
  }

  const build = () => {
    const mine = parsePerms(perms)
    if (!mine.length) return toast.error("Paste your permissions first (no Category.Object.Read/ReadWrite found).")
    if (otherText.trim() && !otherCount) {
      return toast.error("Couldn't find any permissions in the other person's box. Clear it or paste their array.")
    }
    const other: OtherInput = { name: otherName, text: otherText }
    if (hasCustom) {
      if (info && !info.ok) return toast.error(info.error)
      const label = customName ? `Custom catalog (${customName})` : "Custom catalog (pasted)"
      return onBuild({ mine, csv: custom, source: label, custom: { name: customName, text: custom }, other })
    }
    if (!catalog.text) return toast.error("Default catalog not loaded. Wait a moment, or add your own catalog below.")
    onBuild({ mine, csv: catalog.text, source: DEFAULT_SOURCE, custom: { name: "", text: "" }, other })
  }

  return (
    <div className="space-y-4">
      {/* TUTORIAL (hidden when no link is set in .env) */}
      <TutorialVideo />

      {/* STEP 1 */}
      <Card>
        <CardHeader>
          <CardTitle><Step n={1}>Paste your CIPP permissions</Step></CardTitle>
          <CardDescription>Copied from your own CIPP login. Nothing is uploaded.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={perms}
            onChange={(e) => setPerms(e.target.value)}
            rows={5}
            className="font-mono text-xs"
            placeholder='{"json":["CIPP.Alert.Read","CIPP.Core.Read", ...]}'
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigator.clipboard.readText().then(setPerms, () => toast.error("Browser blocked clipboard read. Click the box and press Ctrl+V."))
              }
            >
              <ClipboardPaste /> Paste from clipboard
            </Button>
            {count > 0 && <span className="text-sm text-muted-foreground">{count} permissions found</span>}
          </div>

          <More title="How do I get them?">
            <p className="text-sm"><b>Easiest:</b> drag this button to your Edge favorites bar once. Then, on your CIPP tab, click that favorite. It copies your permissions.</p>
            <a
              ref={bm}
              className={cn(buttonVariants({ size: "sm" }))}
              onClick={(e) => {
                e.preventDefault()
                toast.info("Drag this button to your favorites bar. Don't click it here.")
              }}
            >
              <ClipboardPaste /> Copy my CIPP permissions
            </a>
            <p className="pt-1 text-sm"><b>Or</b> on the CIPP tab press <kbd className="rounded border px-1">F12</kbd> → Console, paste this and press Enter (if Edge blocks pasting, type <code>allow pasting</code> first):</p>
            <pre className="max-h-24 overflow-auto rounded-md border bg-muted p-3 font-mono text-xs break-all whitespace-pre-wrap">{GRAB}</pre>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(GRAB).then(() => toast.success("Snippet copied"), () => toast.error("Clipboard blocked. Select the text and press Ctrl+C."))}
            >
              <Copy /> Copy snippet
            </Button>
            <p className="text-sm text-muted-foreground">Or copy <code>permissions</code> from TanStack → <code>authmecipp</code>. Any format works.</p>
          </More>

          <More title="Compare with another person (optional)" open={Boolean(initialOther.text.trim())}>
            <p className="text-sm text-muted-foreground">
              Ask them to run the same bookmarklet or snippet on their own CIPP tab and send you the result. You get a side-by-side view of who can do what.
            </p>
            <Input
              value={otherName}
              onChange={(e) => setOtherName(e.target.value)}
              placeholder="Their name (shown in the report), e.g. Anther"
              aria-label="Other person's name"
              maxLength={40}
            />
            <Textarea
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              rows={4}
              className="font-mono text-xs"
              placeholder='Their permissions, e.g. {"json":["CIPP.Core.Read", ...]}'
            />
            <div className="flex flex-wrap items-center gap-3">
              {otherCount > 0 && <span className="text-sm text-muted-foreground">{otherCount} permissions found</span>}
              {otherText && (
                <Button variant="ghost" size="sm" onClick={() => { setOtherText(""); setOtherName("") }}>
                  <X /> Clear
                </Button>
              )}
            </div>
          </More>
        </CardContent>
      </Card>

      {/* STEP 2 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-2">
            <Step n={2}>Catalog</Step>
            <Badge variant={hasCustom ? "default" : "secondary"}>{hasCustom ? "Using your catalog" : "Using default"}</Badge>
          </CardTitle>
          <CardDescription>The list of CIPP permissions to compare with. The default is fine for most people.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {catalog.status === "loading" && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading the default catalog…</p>
          )}
          {catalog.status === "ready" && (
            <p className={cn("flex items-center gap-1.5 text-sm", hasCustom ? "text-muted-foreground" : "text-green-700 dark:text-green-400")}>
              <CircleCheck className="size-4" /> Default catalog loaded
            </p>
          )}
          {catalog.status === "failed" && (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertTitle>Default catalog download was blocked</AlertTitle>
              <AlertDescription>
                <p>
                  Open <a className="underline" href={CATALOG_PAGE_URL} target="_blank" rel="noopener noreferrer">permissions-catalog.csv</a>, download the raw file, then add it below.
                </p>
              </AlertDescription>
            </Alert>
          )}

          <More title="Use my own catalog instead">
            <p className="text-xs text-muted-foreground">
              Needs <code>Category</code> + <code>Object</code> columns, or one <code>Permission</code> column. A plain list of <code>Category.Object.Read</code> lines also works.
            </p>
            <Input
              key={fileKey}
              type="file"
              accept=".csv,text/csv,text/plain"
              aria-label="Upload a catalog CSV"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (!f) return
                f.text().then(
                  (t) => {
                    setCustom(t)
                    setCustomName(f.name)
                  },
                  () => toast.error("Could not read that file.")
                )
              }}
            />
            <Textarea
              value={custom}
              onChange={(e) => {
                setCustom(e.target.value)
                setCustomName("")
              }}
              rows={4}
              className="font-mono text-xs"
              placeholder="Or paste catalog text here…"
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => downloadText("catalog-template.csv", CATALOG_TEMPLATE)}>
                <Download /> CSV template
              </Button>
              {catalog.status === "ready" && (
                <Button variant="outline" size="sm" onClick={() => downloadText("cipp-permissions-catalog.csv", catalog.text)}>
                  <Download /> Default catalog
                </Button>
              )}
              {hasCustom && (
                <Button variant="ghost" size="sm" onClick={clearCustom}>
                  <X /> Clear
                </Button>
              )}
            </div>
            {info && info.ok && (
              <Alert>
                <CircleCheck />
                <AlertTitle>{customName || "Pasted catalog"} is ready</AlertTitle>
                <AlertDescription>
                  <p>
                    {info.count} permissions, {info.functions} functions
                    {info.withFunctions === 0 ? ". No function columns, so only permissions and access levels are compared." : "."}
                  </p>
                </AlertDescription>
              </Alert>
            )}
            {info && !info.ok && (
              <Alert variant="destructive">
                <TriangleAlert />
                <AlertTitle>Can't use this catalog</AlertTitle>
                <AlertDescription>
                  <p>{info.error}</p>
                </AlertDescription>
              </Alert>
            )}
          </More>
        </CardContent>
      </Card>

      <Button size="lg" className="w-full" onClick={build}>
        {otherCount > 0 ? "Build report and compare" : "Build report"}
      </Button>

      <details className="rounded-xl border bg-card">
        <summary className="cursor-pointer px-5 py-3 text-sm font-medium select-none">CIPP admin? Export a catalog from your CIPP</summary>
        <div className="border-t p-3">
          <AdminGuide />
        </div>
      </details>
    </div>
  )
}
