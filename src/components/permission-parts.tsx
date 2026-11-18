import { Check, Eye, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ACCESS_LABEL, fnsFor, type Access, type Filters, type FnItem, type Row, type Stats } from "@/lib/catalog"

/** Tailwind palette tones: red = blocked, amber = read only, green = full. Light + dark. */
export const TONE: Record<Access, string> = {
  None: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
  Read: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  ReadWrite: "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300",
}
const BAD = TONE.None
const OK = TONE.ReadWrite

export function AccessIcon({ acc, className }: { acc: Access; className?: string }) {
  const I = acc === "None" ? X : acc === "Read" ? Eye : Check
  return <I className={className} aria-hidden />
}

export function AccessBadge({ acc }: { acc: Access }) {
  return (
    <Badge variant="outline" className={cn("gap-1.5 px-2.5 py-1 text-xs", TONE[acc])}>
      <AccessIcon acc={acc} />
      {ACCESS_LABEL[acc]}
    </Badge>
  )
}

export function StatusDot({ acc }: { acc: Access }) {
  return (
    <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border", TONE[acc])}>
      <AccessIcon acc={acc} className="size-3" />
    </span>
  )
}

export function SplitBar({ ok, bad }: { ok: number; bad: number }) {
  const t = ok + bad || 1
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
      <div className="bg-green-500" style={{ width: `${(ok / t) * 100}%` }} />
      <div className="bg-red-500" style={{ width: `${(bad / t) * 100}%` }} />
    </div>
  )
}

/** Used by the exported HTML / PDF report. */
export function SummaryCards({ s, label = "Permissions in catalog" }: { s: Stats; label?: string }) {
  const items = [
    { k: label, v: s.count, sub: "", cls: "border-t-primary", num: "" },
    { k: "No access", v: s.none, sub: "", cls: "border-t-red-500", num: "text-red-600 dark:text-red-400" },
    { k: "Read only", v: s.read, sub: "", cls: "border-t-amber-500", num: "text-amber-600 dark:text-amber-400" },
    { k: "Full access", v: s.rw, sub: "", cls: "border-t-green-500", num: "text-green-600 dark:text-green-400" },
    { k: "Functions blocked", v: s.blocked, sub: `of ${s.total} functions`, cls: "border-t-red-500", num: "text-red-600 dark:text-red-400" },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {items.map((it) => (
        <Card key={it.k} className={cn("gap-1 border-t-4 py-4", it.cls)}>
          <CardContent className="px-4">
            <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{it.k}</div>
            <div className={cn("text-3xl font-semibold tabular-nums", it.num)}>{it.v}</div>
            {it.sub && <div className="text-xs text-muted-foreground">{it.sub}</div>}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function FnTile({ x }: { x: FnItem }) {
  return (
    <div
      title={x.ok ? "You can call this" : "Blocked for your role"}
      className={cn("flex min-w-0 items-center gap-2 rounded-md border px-2.5 py-1.5 font-mono text-xs break-all", x.ok ? OK : BAD)}
    >
      {x.ok ? <Check className="size-3.5 shrink-0" aria-hidden /> : <X className="size-3.5 shrink-0" aria-hidden />}
      <span>{x.n}</span>
    </div>
  )
}

function LevelSection({
  title,
  lvl,
  row,
  items,
  ok,
  total,
  filters,
}: {
  title: string
  lvl: "Read" | "ReadWrite"
  row: Row
  items: FnItem[]
  ok: boolean
  total: number
  filters: Filters
}) {
  const need = `${row.perm}.${lvl}`
  const empty =
    filters.fn === "bad" ? "No blocked functions here." : filters.fn === "ok" ? "No usable functions at this level." : "No matching functions."
  return (
    <section className={cn("break-inside-avoid rounded-lg border border-l-4 bg-muted/40 p-4", ok ? "border-l-green-500" : "border-l-red-500")}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">
          {title}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {total} function{total === 1 ? "" : "s"}
          </span>
        </h4>
        <Badge variant="outline" className={cn("gap-1.5 text-xs", ok ? OK : BAD)}>
          {ok ? <Check aria-hidden /> : <X aria-hidden />}
          {ok ? "You have" : "You lack"} {need}
        </Badge>
      </div>
      {!total ? (
        <p className="text-sm text-muted-foreground">No functions listed in the catalog at this level.</p>
      ) : !items.length ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((x) => (
            <FnTile key={x.n} x={x} />
          ))}
        </div>
      )}
    </section>
  )
}

/** Pages + both function levels. Shared by the screen and the exported HTML/PDF. */
export function PermissionBody({ row, filters }: { row: Row; filters: Filters }) {
  const f = fnsFor(row, filters)
  return (
    <div className="space-y-4">
      {row.nav.length > 0 && (
        <section>
          <h4 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Pages &amp; menu items ({row.nav.length})
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {row.nav.map((p) => (
              <Badge key={p} variant="secondary" className="font-normal">
                {p}
              </Badge>
            ))}
          </div>
        </section>
      )}
      <LevelSection title="View functions" lvl="Read" row={row} items={f.read} ok={row.rok} total={row.rfn.length} filters={filters} />
      <LevelSection title="Action functions" lvl="ReadWrite" row={row} items={f.write} ok={row.wok} total={row.wfn.length} filters={filters} />
      {row.status && row.status !== "Consistent" && (
        <p className={cn("rounded-md border px-3 py-2 text-xs", TONE.Read)}>
          Catalog cross-check: {row.status}
          {row.mm ? ` (${row.mm} mismatches). A page may show but a button may still return 403 because a second permission is needed.` : ""}
        </p>
      )}
    </div>
  )
}

export function PermissionHeader({ row }: { row: Row }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-xs tracking-wider text-muted-foreground uppercase">{row.cat}</div>
        <h2 className="text-xl font-semibold tracking-tight break-all">{row.perm}</h2>
        {row.desc && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{row.desc}</p>}
      </div>
      <div className="w-full space-y-2 sm:w-60">
        <AccessBadge acc={row.acc} />
        <SplitBar ok={row.usable} bad={row.blocked} />
        <p className="text-xs text-muted-foreground">
          {row.usable} of {row.total} functions usable &middot; {row.blocked} blocked
        </p>
      </div>
    </div>
  )
}
