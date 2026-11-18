import { useDeferredValue, useMemo, useRef, useState } from "react"
import { Download, FileDown, FileText, Search, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { FunctionTable } from "@/components/function-table"
import { PermissionBody, PermissionHeader, StatusDot } from "@/components/permission-parts"
import { groupByCategory, stats, visibleRows, type AccFilter, type Filters, type FnFilter, type Row } from "@/lib/catalog"
import { saveCsv, saveHtml, savePdf, type ExportCtx } from "@/lib/export"
import { cn } from "@/lib/utils"

function Stat({ dot, value, label }: { dot: string; value: string | number; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <i className={cn("size-2.5 self-center rounded-full", dot)} aria-hidden />
      <b className="text-lg leading-none tabular-nums">{value}</b>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  )
}

export function ReportView({
  rows,
  mineCount,
  source,
  unknown,
}: {
  rows: Row[]
  mineCount: number
  source: string
  unknown: string[]
}) {
  const [view, setView] = useState<"perm" | "fn">("perm")
  const [acc, setAcc] = useState<AccFilter>("gap")
  const [fn, setFn] = useState<FnFilter>("all")
  const [qRaw, setQ] = useState("")
  const q = useDeferredValue(qRaw)
  const [sel, setSel] = useState(-1)
  const detailRef = useRef<HTMLDivElement>(null)

  const filters = useMemo<Filters>(() => ({ acc, fn, q }), [acc, fn, q])
  const list = useMemo(() => visibleRows(rows, filters), [rows, filters])
  const s = useMemo(() => stats(rows), [rows])
  const t = s.count || 1
  const groups = useMemo(() => groupByCategory(list), [list])
  const current = list.find((r) => r.i === sel) ?? list[0]

  const run = (f: (c: ExportCtx) => void, msg: string) => () => {
    if (!list.length) return toast.error("Nothing to export with the current filters.")
    f({ list, filters, mineCount, catalogCount: rows.length, source })
    toast.success(msg)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ---- pinned: stays on screen, never scrolls ---- */}
      <div className="shrink-0 space-y-3 border-b bg-background py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <Stat dot="bg-red-500" value={s.none} label="no access" />
          <Stat dot="bg-amber-500" value={s.read} label="read only" />
          <Stat dot="bg-green-500" value={s.rw} label="full access" />
          <Stat dot="bg-red-500" value={`${s.blocked} / ${s.total}`} label="functions blocked" />
          {unknown.length > 0 && (
            <Badge
              variant="outline"
              className="gap-1 border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
              title={`Not in this catalog: ${unknown.join(", ")}`}
            >
              <TriangleAlert /> {unknown.length} not in catalog
            </Badge>
          )}
          <span className="ml-auto text-xs text-muted-foreground">{source}</span>
        </div>
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="bg-red-500" style={{ width: `${(s.none / t) * 100}%` }} />
          <div className="bg-amber-500" style={{ width: `${(s.read / t) * 100}%` }} />
          <div className="bg-green-500" style={{ width: `${(s.rw / t) * 100}%` }} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) => {
              if (!v) return
              setView(v as "perm" | "fn")
              if (v === "perm") setFn("all")
            }}
            aria-label="View"
          >
            <ToggleGroupItem value="perm">Permissions</ToggleGroupItem>
            <ToggleGroupItem value="fn">Functions</ToggleGroupItem>
          </ToggleGroup>

          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <Input value={qRaw} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="pl-8" />
          </div>

          <Select value={acc} onValueChange={(v) => setAcc(v as AccFilter)}>
            <SelectTrigger aria-label="Show" className="w-full sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gap">Show: what I lack</SelectItem>
              <SelectItem value="None">Show: no access</SelectItem>
              <SelectItem value="Read">Show: read only</SelectItem>
              <SelectItem value="ReadWrite">Show: full access</SelectItem>
              <SelectItem value="all">Show: everything</SelectItem>
            </SelectContent>
          </Select>

          {view === "fn" && (
            <ToggleGroup type="single" value={fn} onValueChange={(v) => v && setFn(v as FnFilter)} aria-label="Function filter">
              <ToggleGroupItem value="all">All</ToggleGroupItem>
              <ToggleGroupItem value="bad">Blocked</ToggleGroupItem>
              <ToggleGroupItem value="ok">Usable</ToggleGroupItem>
            </ToggleGroup>
          )}

          <div className="ml-auto flex flex-wrap gap-2">
            <Button onClick={run(saveHtml, "Saved the HTML report to your Downloads folder.")}>
              <FileText /> HTML
            </Button>
            <Button onClick={run(savePdf, 'In the print window set Destination to "Save as PDF" and turn on Background graphics.')}>
              <FileDown /> PDF
            </Button>
            <Button variant="outline" onClick={run(saveCsv, "Saved the CSV.")}>
              <Download /> CSV
            </Button>
          </div>
        </div>
      </div>

      {/* ---- scrolls on its own ---- */}
      <div className="min-h-0 flex-1 py-4">
        {view === "perm" ? (
          <div className="flex h-full min-h-0 flex-col gap-4 lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:grid-rows-1">
            <Card className="h-44 min-h-0 shrink-0 gap-0 overflow-hidden py-0 lg:h-full">
              <nav aria-label="Permissions" className="h-full overflow-y-auto p-2">
                {groups.map((g) => (
                  <div key={g.cat} className="mb-2">
                    <div className="flex items-center justify-between px-2 py-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      <span>{g.cat}</span>
                      <span>{g.items.length}</span>
                    </div>
                    {g.items.map((r) => (
                      <button
                        key={r.perm}
                        type="button"
                        onClick={() => {
                          setSel(r.i)
                          if (window.innerWidth < 1024) detailRef.current?.scrollIntoView({ block: "nearest" })
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50",
                          current?.i === r.i && "bg-accent font-medium text-accent-foreground"
                        )}
                      >
                        <StatusDot acc={r.acc} />
                        <span className="truncate">{r.obj}</span>
                        {r.blocked > 0 && (
                          <Badge variant="outline" className="ml-auto border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                            {r.blocked}
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
                {!groups.length && <p className="p-4 text-sm text-muted-foreground">Nothing to show.</p>}
              </nav>
            </Card>

            <Card ref={detailRef} className="min-h-0 flex-1 gap-0 overflow-hidden py-0 lg:h-full">
              <div className="h-full space-y-5 overflow-y-auto p-5">
                {current ? (
                  <>
                    <PermissionHeader row={current} />
                    <PermissionBody row={current} filters={filters} />
                  </>
                ) : (
                  <p className="p-10 text-center text-muted-foreground">Nothing matches the current filters.</p>
                )}
              </div>
            </Card>
          </div>
        ) : (
          <FunctionTable list={list} filters={filters} />
        )}
      </div>
    </div>
  )
}
