import type { Access, Filters, Row } from "@/lib/catalog"
import { fnDiff, type CmpRow } from "@/lib/compare"

/** Id of the machine-readable block embedded in every saved HTML report. */
export const DATA_ID = "cipp-gap-data"

type Pair = { perm: string; acc: Access }

/** Rebuilds the permission array (same format CIPP returns) from per-permission access levels. */
export function granted(rows: Pair[]): string[] {
  const out: string[] = []
  for (const r of rows) {
    if (r.acc === "ReadWrite") out.push(`${r.perm}.ReadWrite`)
    else if (r.acc === "Read") out.push(`${r.perm}.Read`)
  }
  return out
}

export function buildReportJson(c: { list: Row[]; all: Row[]; filters: Filters; source: string; date: string }) {
  const count = (a: Access) => c.all.filter((r) => r.acc === a).length
  return {
    type: "cipp-gap-report",
    version: 1,
    generated: c.date,
    catalog: c.source,
    filters: { show: c.filters.acc, functions: c.filters.fn, search: c.filters.q.trim() },
    granted: granted(c.all.map((r) => ({ perm: r.perm, acc: r.acc }))),
    summary: {
      permissions: c.all.length,
      noAccess: count("None"),
      readOnly: count("Read"),
      fullAccess: count("ReadWrite"),
      functionsBlocked: c.all.reduce((n, r) => n + r.blocked, 0),
      functionsTotal: c.all.reduce((n, r) => n + r.total, 0),
    },
    rows: c.list.map((r) => ({
      category: r.cat,
      object: r.obj,
      permission: r.perm,
      access: r.acc,
      description: r.desc,
      pages: r.nav,
      viewFunctions: r.rfn.map((name) => ({ name, usable: r.rok })),
      actionFunctions: r.wfn.map((name) => ({ name, usable: r.wok })),
    })),
  }
}

export function buildCompareJson(c: {
  rows: CmpRow[]
  all: CmpRow[]
  name: string
  source: string
  filterLabel: string
  date: string
}) {
  return {
    type: "cipp-gap-compare",
    version: 1,
    generated: c.date,
    catalog: c.source,
    filter: c.filterLabel,
    you: { granted: granted(c.all.map((r) => ({ perm: r.perm, acc: r.me }))) },
    other: { name: c.name, granted: granted(c.all.map((r) => ({ perm: r.perm, acc: r.other }))) },
    rows: c.rows.map((r) => {
      const d = fnDiff(r)
      return {
        category: r.cat,
        permission: r.perm,
        you: r.me,
        other: r.other,
        difference: r.diff,
        youUsableFunctions: r.meUsable,
        otherUsableFunctions: r.otherUsable,
        totalFunctions: r.total,
        onlyYouCanUse: d.onlyMe,
        onlyOtherCanUse: d.onlyOther,
      }
    }),
  }
}

/** A <script type="application/json"> block. "<" is escaped so the data can never close the tag early. */
export function embedScript(obj: unknown): string {
  const json = JSON.stringify(obj).replace(/</g, "\\u003c")
  return `<script type="application/json" id="${DATA_ID}">${json}</script>`
}

// ---------------------------------------------------------------------------
// Reading a saved report back
// ---------------------------------------------------------------------------

export interface Extracted {
  kind: "report" | "compare"
  mode: "embedded" | "recovered"
  note: string
  data: Record<string, unknown>
  mine: string[]
  other: { name: string; perms: string[] } | null
}
export type ExtractResult = ({ ok: true } & Extracted) | { ok: false; error: string }

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [])
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v)

function fromData(data: Record<string, unknown>, mode: "embedded" | "recovered", note: string): ExtractResult | null {
  if (data.type === "cipp-gap-report") {
    return { ok: true, kind: "report", mode, note, data, mine: strings(data.granted), other: null }
  }
  if (data.type === "cipp-gap-compare") {
    const you = isObj(data.you) ? data.you : {}
    const other = isObj(data.other) ? data.other : {}
    return {
      ok: true,
      kind: "compare",
      mode,
      note,
      data,
      mine: strings(you.granted),
      other: { name: typeof other.name === "string" && other.name ? other.name : "Other person", perms: strings(other.granted) },
    }
  }
  return null
}

const decode = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")

const LABELS: Record<string, Access> = { "No access": "None", "Read only": "Read", "Full access": "ReadWrite" }
const PERM = /^[A-Za-z0-9_]+\.[A-Za-z0-9_]+$/
const labelOf = (t: string): Access | undefined => (Object.prototype.hasOwnProperty.call(LABELS, t) ? LABELS[t] : undefined)

/** Best effort for HTML saved before the data block existed: reads the visible permission names and badges. */
function recover(html: string): ExtractResult {
  const text = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
  const tokens = text
    .split(/<[^>]*>/)
    .map((s) => decode(s).replace(/\s+/g, " ").trim())
    .filter(Boolean)

  const found = new Map<string, Access[]>()
  for (let i = 0; i < tokens.length; i++) {
    if (!PERM.test(tokens[i]) || found.has(tokens[i])) continue
    const labels: Access[] = []
    for (let j = i + 1; j < tokens.length && labels.length < 2; j++) {
      const a = labelOf(tokens[j])
      if (!a) break
      labels.push(a)
    }
    if (labels.length) found.set(tokens[i], labels)
  }
  if (!found.size) {
    return {
      ok: false,
      error: "No permission data found. Use a file saved with Save as HTML from this report (or paste its JSON).",
    }
  }

  const isCompare = [...found.values()].every((l) => l.length === 2)
  const note =
    "This file was saved before JSON data was embedded, so it was rebuilt from the permissions visible in it. " +
    "Permissions hidden by the filter used when saving (older exports hid full-access ones by default) are missing. " +
    "Save a new HTML report to get complete data."

  if (isCompare) {
    const head = tokens.find((t) => /^You \(\d+ permissions\) vs /.test(t)) ?? ""
    const name = head.match(/ vs (.+?) \(\d+ permissions\)/)?.[1] ?? "Other person"
    const rows = [...found.entries()].map(([permission, l]) => ({ permission, you: l[0], other: l[1] }))
    const data = {
      type: "cipp-gap-compare",
      version: 1,
      recovered: true,
      you: { granted: granted(rows.map((r) => ({ perm: r.permission, acc: r.you }))) },
      other: { name, granted: granted(rows.map((r) => ({ perm: r.permission, acc: r.other }))) },
      rows,
    }
    return fromData(data, "recovered", note)!
  }

  const rows = [...found.entries()].map(([permission, l]) => ({ permission, access: l[0] }))
  const data = {
    type: "cipp-gap-report",
    version: 1,
    recovered: true,
    granted: granted(rows.map((r) => ({ perm: r.permission, acc: r.access }))),
    rows,
  }
  return fromData(data, "recovered", note)!
}

/** Accepts a saved .html report (or its JSON) and returns the report data. */
export function extractFromHtml(input: string): ExtractResult {
  const src = (input ?? "").replace(/^\ufeff/, "").trim()
  if (!src) return { ok: false, error: "Nothing to read." }

  if (src.startsWith("{")) {
    try {
      const d: unknown = JSON.parse(src)
      const r = isObj(d) ? fromData(d, "embedded", "Read from JSON.") : null
      if (r) return r
    } catch {
      /* fall through */
    }
    return { ok: false, error: "That JSON is not a report from this tool." }
  }

  const m = src.match(/<script\b[^>]*\bid=["']cipp-gap-data["'][^>]*>([\s\S]*?)<\/script>/i)
  if (m) {
    try {
      const d: unknown = JSON.parse(m[1])
      const r = isObj(d) ? fromData(d, "embedded", "Complete data read from the report.") : null
      if (r) return r
    } catch {
      /* fall back to recovery */
    }
  }
  return recover(src)
}
