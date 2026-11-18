import { useMemo, useState } from "react"
import { Check, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ACCESS_LABEL, flatAll, type Filters, type Row } from "@/lib/catalog"
import { TONE } from "@/components/permission-parts"
import { cn } from "@/lib/utils"

const STEP = 200

export function FunctionTable({ list, filters }: { list: Row[]; filters: Filters }) {
  const [limit, setLimit] = useState(STEP)
  const all = useMemo(() => flatAll(list, filters), [list, filters])
  const shown = all.slice(0, limit)
  const bad = all.reduce((n, x) => n + (x.ok ? 0 : 1), 0)

  return (
    <Card className="h-full min-h-0 gap-0 overflow-hidden py-0">
      <CardHeader className="shrink-0 border-b py-3">
        <CardTitle className="flex flex-wrap items-center gap-2">
          Functions
          <Badge variant="secondary">{all.length} shown</Badge>
          <Badge variant="outline" className={TONE.None}>{bad} blocked</Badge>
        </CardTitle>
      </CardHeader>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="px-4">Status</TableHead>
              <TableHead>Function</TableHead>
              <TableHead>Requires</TableHead>
              <TableHead>Your access</TableHead>
              <TableHead className="hidden lg:table-cell">Pages / menu</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((x, i) => (
              <TableRow key={`${x.perm}.${x.lvl}.${x.fn}.${i}`}>
                <TableCell className="px-4">
                  <Badge variant="outline" className={cn("gap-1", x.ok ? TONE.ReadWrite : TONE.None)}>
                    {x.ok ? <Check /> : <X />}
                    {x.ok ? "Usable" : "Blocked"}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs break-all">{x.fn}</TableCell>
                <TableCell className="font-mono text-xs break-all">{x.perm}.{x.lvl}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={TONE[x.acc]}>{ACCESS_LABEL[x.acc]}</Badge>
                </TableCell>
                <TableCell className="hidden max-w-xs text-xs text-muted-foreground lg:table-cell">{x.pages}</TableCell>
              </TableRow>
            ))}
            {!shown.length && (
              <TableRow>
                <TableCell colSpan={5} className="p-10 text-center text-muted-foreground">Nothing matches the current filters.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {all.length > shown.length && (
          <div className="border-t p-3">
            <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + STEP)}>Show {STEP} more</Button>
          </div>
        )}
      </div>
    </Card>
  )
}
