import { ArrowDown, ArrowUp, Equal } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { TONE } from "@/components/permission-parts"
import { fnDiff, type CmpRow, type Diff } from "@/lib/compare"
import { cn } from "@/lib/utils"

export const DIFF_TONE: Record<Diff, string> = {
  same: "border-border bg-muted text-muted-foreground",
  more: TONE.ReadWrite,
  less: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-300",
}
const OTHER_FN =
  "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-300"

export function DiffBadge({ diff, name }: { diff: Diff; name: string }) {
  const I = diff === "same" ? Equal : diff === "more" ? ArrowUp : ArrowDown
  const text = diff === "same" ? "Same" : diff === "more" ? "You have more" : `${name} has more`
  return (
    <Badge variant="outline" className={cn("gap-1", DIFF_TONE[diff])}>
      <I aria-hidden />
      {text}
    </Badge>
  )
}

function Chips({ items, tone }: { items: string[]; tone: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((f) => (
        <Badge key={f} variant="outline" className={cn("font-mono", tone)}>
          {f}
        </Badge>
      ))}
    </div>
  )
}

/** The "what is different" detail for one permission. Shared by the screen and the exports. */
export function DiffDetail({ row, name }: { row: CmpRow; name: string }) {
  const d = fnDiff(row)
  return (
    <div className="space-y-3 text-sm">
      {row.desc && <p className="text-muted-foreground">{row.desc}</p>}
      {row.nav.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {row.nav.map((p) => (
            <Badge key={p} variant="secondary" className="font-normal">
              {p}
            </Badge>
          ))}
        </div>
      )}
      {d.onlyMe.length === 0 && d.onlyOther.length === 0 ? (
        <p className="text-muted-foreground">
          No function differences. {d.both > 0 ? `Both can use ${d.both} of ${row.total} functions.` : "Neither of you can use any functions here."}
        </p>
      ) : (
        <>
          {d.onlyMe.length > 0 && (
            <div className="space-y-1.5">
              <div className="font-medium">Only you can use ({d.onlyMe.length})</div>
              <Chips items={d.onlyMe} tone={TONE.ReadWrite} />
            </div>
          )}
          {d.onlyOther.length > 0 && (
            <div className="space-y-1.5">
              <div className="font-medium">Only {name} can use ({d.onlyOther.length})</div>
              <Chips items={d.onlyOther} tone={OTHER_FN} />
            </div>
          )}
          <p className="text-xs text-muted-foreground">Both can use {d.both} functions.</p>
        </>
      )}
    </div>
  )
}
