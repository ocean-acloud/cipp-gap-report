import { renderToStaticMarkup } from "react-dom/server"

import { CompareDocument } from "@/components/compare-document"
import { ACCESS_LABEL } from "@/lib/catalog"
import { fnDiff, type CmpRow } from "@/lib/compare"
import { buildCompareJson, embedScript } from "@/lib/report-json"

export interface CmpExportCtx {
  rows: CmpRow[]
  /** every comparison row (unfiltered), used for the embedded JSON */
  all: CmpRow[]
  name: string
  mineCount: number
  otherCount: number
  source: string
  filterLabel: string
}

const stamp = () => new Date().toISOString().slice(0, 10)
export const cmpFileName = (ext: string) => `CIPP-Permission-Compare-${stamp()}.${ext}`

function collectCss(): string {
  const out: string[] = []
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) out.push(rule.cssText)
    } catch {
      /* cross-origin sheet, skip */
    }
  }
  return out.join("\n")
}

export function buildCompareDocument(ctx: CmpExportCtx): string {
  const { rows, name, mineCount, otherCount, source, filterLabel } = ctx
  const markup = renderToStaticMarkup(
    <CompareDocument
      rows={rows}
      name={name}
      mineCount={mineCount}
      otherCount={otherCount}
      source={source}
      filterLabel={filterLabel}
      date={stamp()}
    />
  )
  const data = embedScript(buildCompareJson({ rows, all: ctx.all, name, source, filterLabel, date: stamp() }))
  return (
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>${cmpFileName("pdf").replace(/\.pdf$/, "")}</title>` +
    `<style>${collectCss()}</style>` +
    `<style>@page{size:A4 landscape;margin:10mm}html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style>` +
    `</head><body>${markup}${data}</body></html>`
  )
}

function download(name: string, text: string, type: string) {
  const a = document.createElement("a")
  a.href = URL.createObjectURL(new Blob([text], { type }))
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export function saveCompareHtml(ctx: CmpExportCtx) {
  download(cmpFileName("html"), buildCompareDocument(ctx), "text/html")
}

/** Opens the browser print dialog on a clean document. The user picks "Save as PDF". */
export function saveComparePdf(ctx: CmpExportCtx) {
  const fr = document.createElement("iframe")
  fr.setAttribute("aria-hidden", "true")
  fr.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0"
  fr.onload = () => {
    setTimeout(() => {
      fr.contentWindow?.focus()
      fr.contentWindow?.print()
      setTimeout(() => fr.remove(), 60000)
    }, 400)
  }
  fr.srcdoc = buildCompareDocument(ctx)
  document.body.appendChild(fr)
}

export function saveCompareCsv(ctx: CmpExportCtx) {
  const lines = [
    ["Category", "Permission", "YourAccess", `${ctx.name}Access`, "Difference", "YourUsableFunctions", "TheirUsableFunctions", "TotalFunctions", "OnlyYouCanUse", "OnlyTheyCanUse"],
  ]
  for (const r of ctx.rows) {
    const d = fnDiff(r)
    const diff = r.diff === "same" ? "Same" : r.diff === "more" ? "You have more" : "They have more"
    lines.push([
      r.cat,
      r.perm,
      ACCESS_LABEL[r.me],
      ACCESS_LABEL[r.other],
      diff,
      String(r.meUsable),
      String(r.otherUsable),
      String(r.total),
      d.onlyMe.join("; "),
      d.onlyOther.join("; "),
    ])
  }
  const csv = lines.map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n")
  download(cmpFileName("csv"), "\ufeff" + csv, "text/csv")
}
