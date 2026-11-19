import { useState } from "react"
import { Pencil } from "lucide-react"
import { Toaster, toast } from "sonner"

import { Button } from "@/components/ui/button"
import { ReportView } from "@/components/report-view"
import { SetupView, type BuildInput, type CustomCatalog, type OtherInput } from "@/components/setup-view"
import { buildRows, parsePerms, type Row } from "@/lib/catalog"
import { buildCompare, type CompareData } from "@/lib/compare"

interface Built {
  rows: Row[]
  unknown: string[]
  mine: string[]
  source: string
  compare: CompareData | null
}

export default function App() {
  const [built, setBuilt] = useState<Built | null>(null)
  const [lastPerms, setLastPerms] = useState("")
  const [lastCustom, setLastCustom] = useState<CustomCatalog>({ name: "", text: "" })
  const [lastOther, setLastOther] = useState<OtherInput>({ name: "", text: "" })

  const onBuild = (i: BuildInput) => {
    try {
      const { rows, unknown } = buildRows(i.csv, i.mine)
      const theirs = parsePerms(i.other.text)
      let compare: CompareData | null = null
      if (theirs.length) {
        const o = buildRows(i.csv, theirs)
        compare = {
          name: i.other.name.trim() || "Other person",
          rows: buildCompare(rows, o.rows),
          unknown: o.unknown,
          count: theirs.length,
        }
      }
      setLastPerms(JSON.stringify({ json: i.mine }))
      setLastCustom(i.custom)
      setLastOther(i.other)
      setBuilt({ rows, unknown, mine: i.mine, source: i.source, compare })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not build the report.")
    }
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="shrink-0 bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">CIPP Permission Gap Report</h1>
            {!built && <p className="text-xs opacity-90">See what your CIPP role can and can't do. Runs in your browser, nothing is uploaded.</p>}
          </div>
          {built && (
            <Button variant="secondary" size="sm" onClick={() => setBuilt(null)}>
              <Pencil /> Edit array
            </Button>
          )}
        </div>
      </header>

      {built ? (
        <main className="mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 flex-col px-4 sm:px-6">
          <ReportView
            rows={built.rows}
            mineCount={built.mine.length}
            source={built.source}
            unknown={built.unknown}
            compare={built.compare}
          />
        </main>
      ) : (
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
            <SetupView onBuild={onBuild} initialPerms={lastPerms} initialCustom={lastCustom} initialOther={lastOther} />
          </div>
        </main>
      )}
      <Toaster richColors closeButton position="bottom-center" theme="system" />
    </div>
  )
}
