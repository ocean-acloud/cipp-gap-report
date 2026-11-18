import { renderToStaticMarkup } from "react-dom/server"

import { ReportDocument } from "@/components/report-document"
import { ACCESS_LABEL, flatAll, type Filters, type Row } from "@/lib/catalog"

export interface ExportCtx {
  list: Row[]
  filters: Filters
  mineCount: number
  catalogCount: number
  source: string
}

const stamp = () => new Date().toISOString().slice(0, 10)
export const fileName = (ext: string) => `CIPP-Permission-Gap-Report-${stamp()}.${ext}`

/** Copies the compiled Tailwind/shadcn stylesheet so the export looks identical and stands alone. */
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

export function buildDocument(ctx: ExportCtx): string {
  const markup = renderToStaticMarkup(<ReportDocument {...ctx} date={stamp()} />)
  return (
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>${fileName("pdf").replace(/\.pdf$/, "")}</title>` +
    `<style>${collectCss()}</style>` +
    `<style>@page{size:A4 landscape;margin:10mm}html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style>` +
    `</head><body>${markup}</body></html>`
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

export function saveHtml(ctx: ExportCtx) {
  download(fileName("html"), buildDocument(ctx), "text/html")
}

/** Opens the browser print dialog on a clean document. The user picks "Save as PDF". */
export function savePdf(ctx: ExportCtx) {
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
  fr.srcdoc = buildDocument(ctx)
  document.body.appendChild(fr)
}

export function saveCsv(ctx: ExportCtx) {
  const lines = [["Category", "Permission", "Function", "RequiredLevel", "RequiredPermission", "YourAccess", "Status", "Pages"]]
  for (const x of flatAll(ctx.list, ctx.filters)) {
    lines.push([x.cat, x.perm, x.fn, x.lvl, `${x.perm}.${x.lvl}`, ACCESS_LABEL[x.acc], x.ok ? "Usable" : "Blocked", x.pages])
  }
  const csv = lines.map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n")
  download(fileName("csv"), "\ufeff" + csv, "text/csv")
}
