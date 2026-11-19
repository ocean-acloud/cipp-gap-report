import { Fragment } from "react"

import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AccessBadge } from "@/components/permission-parts"
import { DiffBadge, DiffDetail } from "@/components/compare-parts"
import { cmpStats, fnDiff, groupCmp, type CmpRow } from "@/lib/compare"
import { cn } from "@/lib/utils"

/** Static, fully expanded comparison. Rendered to a string for "Save as HTML" and "Save as PDF". */
export function CompareDocument({
  rows,
  name,
  mineCount,
  otherCount,
  source,
  filterLabel,
  date,
}: {
  rows: CmpRow[]
  name: string
  mineCount: number
  otherCount: number
  source: string
  filterLabel: string
  date: string
}) {
  const s = cmpStats(rows)
  const groups = groupCmp(rows)
  const withDiff = rows.filter((r) => {
    const d = fnDiff(r)
    return d.onlyMe.length + d.onlyOther.length > 0
  })
  const cards = [
    { k: "Permissions listed", v: s.count, cls: "border-t-primary", num: "" },
    { k: "Same", v: s.same, cls: "border-t-slate-400", num: "" },
    { k: "You have more", v: s.more, cls: "border-t-green-500", num: "text-green-600 dark:text-green-400" },
    { k: `${name} has more`, v: s.less, cls: "border-t-violet-500", num: "text-violet-600 dark:text-violet-400" },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-6 bg-background p-6 text-foreground">
      <header className="rounded-xl bg-primary p-6 text-primary-foreground">
        <h1 className="text-2xl font-semibold tracking-tight">CIPP Permission Comparison</h1>
        <p className="mt-1 text-sm opacity-90">
          You ({mineCount} permissions) vs {name} ({otherCount} permissions) &middot; Generated {date}
          <br />
          Catalog: {source}
        </p>
      </header>

      <p className="text-sm text-muted-foreground">Showing: {filterLabel}</p>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.k} className={cn("gap-1 border-t-4 py-4", c.cls)}>
            <CardContent className="px-4">
              <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{c.k}</div>
              <div className={cn("text-3xl font-semibold tabular-nums", c.num)}>{c.v}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="py-2">
        <CardContent className="px-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Permission</TableHead>
                <TableHead>You</TableHead>
                <TableHead>{name}</TableHead>
                <TableHead>Difference</TableHead>
                <TableHead>Functions usable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((g) => (
                <Fragment key={g.cat}>
                  <TableRow className="bg-accent/60">
                    <TableCell colSpan={5} className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      {g.cat} &middot; {g.items.length}
                    </TableCell>
                  </TableRow>
                  {g.items.map((r) => (
                    <TableRow key={r.perm} className="break-inside-avoid">
                      <TableCell className="font-medium break-all">{r.perm}</TableCell>
                      <TableCell><AccessBadge acc={r.me} /></TableCell>
                      <TableCell><AccessBadge acc={r.other} /></TableCell>
                      <TableCell><DiffBadge diff={r.diff} name={name} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        you {r.meUsable} &middot; {name} {r.otherUsable} &middot; of {r.total}
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {withDiff.length > 0 && (
        <section className="space-y-3">
          <h2 className="rounded-lg border bg-accent px-4 py-2 text-lg font-semibold text-accent-foreground break-after-avoid">
            Function differences ({withDiff.length} permissions)
          </h2>
          {withDiff.map((r) => (
            <Card key={r.perm} className="break-inside-avoid gap-3 py-4">
              <CardContent className="space-y-3 px-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-semibold break-all">{r.perm}</span>
                  <DiffBadge diff={r.diff} name={name} />
                </div>
                <DiffDetail row={r} name={name} />
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      <footer className="border-t pt-3 text-xs text-muted-foreground">
        Source: CIPP Permissions Mapper catalog (third-party, check against your CIPP version). ReadWrite implies Read. Redact tenant and user data before sharing.
      </footer>
    </div>
  )
}
