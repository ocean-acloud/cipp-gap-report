import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { groupByCategory, stats, type Filters, type Row } from "@/lib/catalog"
import { AccessBadge, PermissionBody, SplitBar, StatusDot, SummaryCards } from "@/components/permission-parts"

/** Static, fully expanded report. Rendered to a string for "Save as HTML" and "Save as PDF". */
export function ReportDocument({
  list,
  filters,
  mineCount,
  catalogCount,
  source,
  date,
}: {
  list: Row[]
  filters: Filters
  mineCount: number
  catalogCount: number
  source: string
  date: string
}) {
  const s = stats(list)
  const groups = groupByCategory(list)
  const fnLabel = filters.fn === "bad" ? "blocked only" : filters.fn === "ok" ? "usable only" : "all"
  const accLabel: Record<string, string> = {
    gap: "what I lack (none + read only)",
    None: "no access only",
    Read: "read only",
    ReadWrite: "full access",
    all: "everything",
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 bg-background p-6 text-foreground">
      <header className="rounded-xl bg-primary p-6 text-primary-foreground">
        <h1 className="text-2xl font-semibold tracking-tight">CIPP Permission Gap Report</h1>
        <p className="mt-1 text-sm opacity-90">
          Generated {date} &middot; built from {mineCount} granted permissions &middot; {catalogCount} permissions in the catalog
          <br />
          Catalog: {source}
        </p>
      </header>

      <p className="text-sm text-muted-foreground">
        Showing: {accLabel[filters.acc]} &middot; functions: {fnLabel}
        {filters.q.trim() ? <> &middot; search: &ldquo;{filters.q.trim()}&rdquo;</> : null}
      </p>

      <SummaryCards s={{ ...s, count: list.length }} label="Permissions listed" />

      <Card className="py-2">
        <CardContent className="px-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>No access</TableHead>
                <TableHead>Read only</TableHead>
                <TableHead>Full access</TableHead>
                <TableHead>Blocked functions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((g) => {
                const gs = stats(g.items)
                return (
                  <TableRow key={g.cat}>
                    <TableCell className="font-medium">{g.cat}</TableCell>
                    <TableCell>{g.items.length}</TableCell>
                    <TableCell>{gs.none}</TableCell>
                    <TableCell>{gs.read}</TableCell>
                    <TableCell>{gs.rw}</TableCell>
                    <TableCell>{gs.blocked}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {groups.map((g) => (
        <section key={g.cat} className="space-y-3">
          <h2 className="flex items-center gap-2 rounded-lg border bg-accent px-4 py-2 text-lg font-semibold text-accent-foreground break-after-avoid">
            {g.cat}
            <Badge variant="secondary">{g.items.length}</Badge>
          </h2>
          {g.items.map((r) => (
            <Card key={r.perm} className="gap-4 py-4">
              <CardContent className="space-y-4 px-4">
                <div className="flex flex-wrap items-center gap-3 break-inside-avoid">
                  <StatusDot acc={r.acc} />
                  <span className="font-semibold break-all">{r.perm}</span>
                  <AccessBadge acc={r.acc} />
                  <span className="text-xs text-muted-foreground">
                    {r.usable} of {r.total} functions usable &middot; {r.blocked} blocked
                  </span>
                  <div className="w-full sm:ml-auto sm:w-48">
                    <SplitBar ok={r.usable} bad={r.blocked} />
                  </div>
                </div>
                {r.desc && <p className="text-sm text-muted-foreground">{r.desc}</p>}
                <PermissionBody row={r} filters={filters} />
              </CardContent>
            </Card>
          ))}
        </section>
      ))}

      <footer className="border-t pt-3 text-xs text-muted-foreground">
        Source: CIPP Permissions Mapper catalog (third-party, check against your CIPP version). ReadWrite implies Read. A visible page can still fail if a second permission is required. Redact tenant and user data before sharing.
      </footer>
    </div>
  )
}
