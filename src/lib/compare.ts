import type { Access, Row } from "@/lib/catalog"

export type Diff = "same" | "more" | "less"
export type CmpFilter = "all" | "diff" | "more" | "less" | "same"

export interface CmpRow {
  i: number
  cat: string
  obj: string
  perm: string
  desc: string
  nav: string[]
  rfn: string[]
  wfn: string[]
  me: Access
  other: Access
  diff: Diff
  meUsable: number
  otherUsable: number
  total: number
}

export interface CompareData {
  name: string
  rows: CmpRow[]
  unknown: string[]
  count: number
}

const RANK: Record<Access, number> = { None: 0, Read: 1, ReadWrite: 2 }
const readOk = (a: Access) => a !== "None"
const writeOk = (a: Access) => a === "ReadWrite"

/** Both row sets come from the same catalog, matched by permission name. */
export function buildCompare(meRows: Row[], otherRows: Row[]): CmpRow[] {
  const o = new Map(otherRows.map((r) => [r.perm.toLowerCase(), r]))
  return meRows.map((m, i) => {
    const t = o.get(m.perm.toLowerCase())
    const other: Access = t ? t.acc : "None"
    const d = RANK[m.acc] - RANK[other]
    return {
      i,
      cat: m.cat,
      obj: m.obj,
      perm: m.perm,
      desc: m.desc,
      nav: m.nav,
      rfn: m.rfn,
      wfn: m.wfn,
      me: m.acc,
      other,
      diff: d === 0 ? "same" : d > 0 ? "more" : "less",
      meUsable: m.usable,
      otherUsable: t ? t.usable : 0,
      total: m.total,
    }
  })
}

/** Which functions only you, only the other person, or both can use. */
export function fnDiff(r: CmpRow): { onlyMe: string[]; onlyOther: string[]; both: number } {
  const onlyMe: string[] = []
  const onlyOther: string[] = []
  let both = 0
  const level = (fns: string[], okMe: boolean, okOther: boolean) => {
    for (const f of fns) {
      if (okMe && okOther) both++
      else if (okMe) onlyMe.push(f)
      else if (okOther) onlyOther.push(f)
    }
  }
  level(r.rfn, readOk(r.me), readOk(r.other))
  level(r.wfn, writeOk(r.me), writeOk(r.other))
  return { onlyMe, onlyOther, both }
}

export interface CmpStats {
  same: number
  more: number
  less: number
  fnMore: number
  fnLess: number
  count: number
}

export function cmpStats(rows: CmpRow[]): CmpStats {
  const s: CmpStats = { same: 0, more: 0, less: 0, fnMore: 0, fnLess: 0, count: rows.length }
  for (const r of rows) {
    s[r.diff]++
    const d = fnDiff(r)
    s.fnMore += d.onlyMe.length
    s.fnLess += d.onlyOther.length
  }
  return s
}

export function visibleCmp(rows: CmpRow[], filter: CmpFilter, q: string): CmpRow[] {
  const needle = q.trim().toLowerCase()
  return rows.filter((r) => {
    if (filter === "diff" && r.diff === "same") return false
    if ((filter === "more" || filter === "less" || filter === "same") && r.diff !== filter) return false
    if (!needle) return true
    return `${r.perm} ${r.desc} ${r.nav.join(" ")} ${r.rfn.join(" ")} ${r.wfn.join(" ")}`.toLowerCase().includes(needle)
  })
}

export const CMP_FILTER_LABEL: Record<CmpFilter, string> = {
  all: "everything",
  diff: "differences only",
  more: "where I have more",
  less: "where they have more",
  same: "same access",
}

export function groupCmp(rows: CmpRow[]): { cat: string; items: CmpRow[] }[] {
  const m = new Map<string, CmpRow[]>()
  for (const r of rows) {
    if (!m.has(r.cat)) m.set(r.cat, [])
    m.get(r.cat)!.push(r)
  }
  return [...m.entries()].map(([cat, items]) => ({ cat, items }))
}
