import { useState } from "react"
import { CircleCheck, Copy, Download, TriangleAlert, X } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { extractFromHtml, type ExtractResult } from "@/lib/report-json"

const arrayText = (perms: string[]) => JSON.stringify({ json: perms })

function copy(text: string, ok: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success(ok),
    () => toast.error("Clipboard blocked. Select the text and press Ctrl+C.")
  )
}

export function ReportImport({
  onUseMine,
  onUseOther,
}: {
  onUseMine: (permsText: string) => void
  onUseOther: (name: string, permsText: string) => void
}) {
  const [res, setRes] = useState<ExtractResult | null>(null)
  const [label, setLabel] = useState("")
  const [text, setText] = useState("")
  const [fileKey, setFileKey] = useState(0)

  const run = (content: string, name: string) => {
    setLabel(name)
    setRes(content.trim() ? extractFromHtml(content) : null)
  }
  const clear = () => {
    setRes(null)
    setLabel("")
    setText("")
    setFileKey((k) => k + 1)
  }

  const json = res && res.ok ? JSON.stringify(res.data, null, 2) : ""
  const baseName = (label.replace(/\.[^.]+$/, "") || "cipp-report").replace(/[^\w.-]+/g, "_")
  const rowCount = res && res.ok && Array.isArray(res.data.rows) ? res.data.rows.length : 0

  const download = () => {
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([json], { type: "application/json" }))
    a.download = `${baseName}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Choose a report you saved with <b>Save as HTML</b> (or paste its text). You get the data back as JSON, and can load the permissions straight into this page.
      </p>
      <Input
        key={fileKey}
        type="file"
        accept=".html,.htm,text/html,application/json,.json"
        aria-label="Choose a saved HTML report"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (!f) return
          f.text().then(
            (t) => {
              setText("")
              run(t, f.name)
            },
            () => toast.error("Could not read that file.")
          )
        }}
      />
      <Textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          run(e.target.value, "pasted")
        }}
        rows={3}
        className="font-mono text-xs"
        placeholder="Or paste the HTML (or JSON) here…"
      />

      {res && !res.ok && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Can't read this file</AlertTitle>
          <AlertDescription>
            <p>{res.error}</p>
          </AlertDescription>
        </Alert>
      )}

      {res && res.ok && (
        <>
          <Alert>
            {res.mode === "embedded" ? <CircleCheck /> : <TriangleAlert />}
            <AlertTitle className="flex flex-wrap items-center gap-2">
              {res.kind === "compare" ? "Comparison report" : "Permission report"}
              <Badge variant={res.mode === "embedded" ? "secondary" : "outline"}>
                {res.mode === "embedded" ? "complete" : "recovered (partial)"}
              </Badge>
            </AlertTitle>
            <AlertDescription>
              <p>
                {rowCount} rows &middot; {res.mine.length} of your permissions
                {res.other ? ` · ${res.other.perms.length} for ${res.other.name}` : ""}.
              </p>
              <p>{res.note}</p>
            </AlertDescription>
          </Alert>

          <pre className="max-h-48 overflow-auto rounded-md border bg-muted p-3 font-mono text-xs whitespace-pre-wrap">
            {json.length > 6000 ? json.slice(0, 6000) + "\n…" : json}
          </pre>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={download}>
              <Download /> Download JSON
            </Button>
            <Button size="sm" variant="outline" onClick={() => copy(json, "JSON copied")}>
              <Copy /> Copy JSON
            </Button>
            <Button size="sm" variant="outline" onClick={() => copy(arrayText(res.mine), "Permissions array copied")}>
              <Copy /> Copy permissions array
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" disabled={!res.mine.length} onClick={() => onUseMine(arrayText(res.mine))}>
              Use as my permissions
            </Button>
            {res.other && (
              <Button
                size="sm"
                variant="secondary"
                disabled={!res.other.perms.length}
                onClick={() => res.other && onUseOther(res.other.name, arrayText(res.other.perms))}
              >
                Use {res.other.name} as the other person
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={clear}>
              <X /> Clear
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
