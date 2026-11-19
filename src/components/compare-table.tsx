import { Fragment, useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AccessBadge } from "@/components/permission-parts"
import { DiffBadge, DiffDetail } from "@/components/compare-parts"
import { groupCmp, type CmpRow } from "@/lib/compare"

export function CompareTable({ rows, name }: { rows: CmpRow[]; name: string }) {
  const [open, setOpen] = useState<Set<string>>(new Set())
  const toggle = (p: string) =>
    setOpen((s) => {
      const n = new Set(s)
      if (n.has(p)) n.delete(p)
      else n.add(p)
      return n
    })
  const groups = groupCmp(rows)

  return (
    <Card className="h-full min-h-0 gap-0 overflow-hidden py-0">
      <div className="h-full overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="px-4">Permission</TableHead>
              <TableHead>You</TableHead>
              <TableHead>{name}</TableHead>
              <TableHead>Difference</TableHead>
              <TableHead className="hidden md:table-cell">Functions usable</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((g) => (
              <Fragment key={g.cat}>
                <TableRow className="bg-accent/60 hover:bg-accent/60">
                  <TableCell colSpan={5} className="px-4 py-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    {g.cat} &middot; {g.items.length}
                  </TableCell>
                </TableRow>
                {g.items.map((r) => {
                  const isOpen = open.has(r.perm)
                  return (
                    <Fragment key={r.perm}>
                      <TableRow>
                        <TableCell className="px-4">
                          <button
                            type="button"
                            onClick={() => toggle(r.perm)}
                            aria-expanded={isOpen}
                            className="flex items-center gap-1.5 rounded text-left font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                          >
                            {isOpen ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
                            <span className="break-all">{r.perm}</span>
                          </button>
                        </TableCell>
                        <TableCell><AccessBadge acc={r.me} /></TableCell>
                        <TableCell><AccessBadge acc={r.other} /></TableCell>
                        <TableCell><DiffBadge diff={r.diff} name={name} /></TableCell>
                        <TableCell className="hidden text-xs text-muted-foreground tabular-nums md:table-cell">
                          you {r.meUsable} &middot; {name} {r.otherUsable} &middot; of {r.total}
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={5} className="bg-muted/30 px-4 py-3">
                            <DiffDetail row={r} name={name} />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  )
                })}
              </Fragment>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={5} className="p-10 text-center text-muted-foreground">
                  Nothing matches the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
