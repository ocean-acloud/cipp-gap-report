export type Access = "None" | "Read" | "ReadWrite"
export type AccFilter = "gap" | "all" | Access
export type FnFilter = "all" | "bad" | "ok"

export interface Row {
  i: number
  cat: string
  obj: string
  perm: string
  acc: Access
  desc: string
  nav: string[]
  rfn: string[]
  wfn: string[]
  status: string
  mm: string
  rok: boolean
  wok: boolean
  total: number
  usable: number
  blocked: number
}

export interface Filters {
  acc: AccFilter
  fn: FnFilter
  q: string
}

export interface FnItem {
  n: string
  ok: boolean
}

export interface FlatFn {
  cat: string
  perm: string
  fn: string
  lvl: "Read" | "ReadWrite"
  ok: boolean
  acc: Access
  pages: string
}

export const CATALOG_URLS = [
  "https://raw.githubusercontent.com/Queensland-Computers/cipp-permissions-mapper/master/data/permissions-catalog.csv",
]
export const CATALOG_PAGE_URL =
  "https://github.com/Queensland-Computers/cipp-permissions-mapper/blob/master/data/permissions-catalog.csv"

export const ACCESS_LABEL: Record<Access, string> = {
  None: "No access",
  Read: "Read only",
  ReadWrite: "Full access",
}

/** Pulls every Category.Object.Read / .ReadWrite entry out of any pasted text. */
export function parsePerms(text: string): string[] {
  const m = (text || "").match(/[A-Za-z0-9_]+\.[A-Za-z0-9_]+\.(?:ReadWrite|Read)\b/gi) ?? []
  const seen = new Set<string>()
  const out: string[] = []
  for (const x of m) {
    const k = x.toLowerCase()
    if (!seen.has(k)) {
      seen.add(k)
      out.push(x)
    }
  }
  return out
}

export function parseCSV(t: string): string[][] {
  const out: string[][] = []
  let row: string[] = []
  let f = ""
  let q = false
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (q) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          f += '"'
          i++
        } else q = false
      } else f += c
    } else if (c === '"') q = true
    else if (c === ",") {
      row.push(f)
      f = ""
    } else if (c === "\n") {
      row.push(f)
      out.push(row)
      row = []
      f = ""
    } else if (c !== "\r") f += c
  }
  if (f.length || row.length) {
    row.push(f)
    out.push(row)
  }
  return out
}

const VERB = /^(invoke-)?(Exec|List|Get|Add|Edit|Remove|Set|Push|New|Test|Invoke|Public)$/
const VSTART = /(?:invoke-|Exec|List|Get|Add|Edit|Remove|Set|Push|New|Test|Invoke|Public)[A-Z]/y

/** The catalog may store function names separated, or run together (ExecAFooExecBar). */
export function splitFns(s: string): string[] {
  s = (s || "").trim()
  if (!s) return []
  const p = s.split(/\s*[;|\n]\s*|\s*,\s*|\s{2,}/).filter(Boolean)
  if (p.length > 1 || /\s/.test(s)) return p
  const out: string[] = []
  let start = 0
  for (let i = 1; i < s.length; i++) {
    if (/[A-Za-z0-9]/.test(s[i - 1])) {
      VSTART.lastIndex = i
      if (VSTART.test(s) && !VERB.test(s.slice(start, i))) {
        out.push(s.slice(start, i))
        start = i
      }
    }
  }
  out.push(s.slice(start))
  return out
}

export function splitNav(s: string): string[] {
  s = (s || "").trim()
  if (!s) return []
  const p = s.split(/\s*[;|\n]\s*/).filter(Boolean)
  if (p.length > 1) return p
  return s.split(/(?<=[a-z)])(?=[A-Z][A-Za-z &/-]* > )/).filter(Boolean)
}

const stripLevel = (p: string) => p.trim().replace(/\.(ReadWrite|Read)$/i, "")

export function buildRows(csv: string, mine: string[]): { rows: Row[]; unknown: string[] } {
  const data = parseCSV(csv).filter((r) => r.some((c) => c.trim()))
  const header = (data.shift() ?? []).map((x) => x.trim().replace(/^\ufeff/, ""))
  const lower = header.map((h) => h.toLowerCase())
  const ix = (...names: string[]) => {
    for (const n of names) {
      const i = lower.indexOf(n.toLowerCase())
      if (i >= 0) return i
    }
    return -1
  }
  const iC = ix("Category")
  const iO = ix("Object")
  const iP = ix("Permission", "Permissions", "Name")
  if ((iC < 0 || iO < 0) && iP < 0) {
    // Friendly fallback: a plain list of Category.Object(.Read/.ReadWrite) entries, with or without a header.
    const listed = [...new Set(parsePerms(csv).map(stripLevel))]
    if (listed.length) return buildRows("Permission\r\n" + listed.join("\r\n"), mine)
    throw new Error(
      'Catalog needs a "Category" and "Object" column, or one "Permission" column like Tenant.Administration.'
    )
  }
  const iD = ix("Description")
  const iN = ix("NavSections", "Pages", "Nav")
  const iR = ix("BackendReadFunctions", "ReadFunctions")
  const iW = ix("BackendReadWriteFunctions", "ReadWriteFunctions", "WriteFunctions")
  const iX = ix("CrossCheckStatus")
  const iM = ix("MismatchCount")
  const cell = (r: string[], i: number) => (i >= 0 ? r[i] ?? "" : "")

  const keyOf = (r: string[]): { cat: string; obj: string } | null => {
    if (iC >= 0 && iO >= 0) {
      const cat = (r[iC] ?? "").trim()
      const obj = (r[iO] ?? "").trim()
      return cat && obj ? { cat, obj } : null
    }
    const parts = stripLevel(cell(r, iP)).split(".")
    return parts.length >= 2 && parts[0] && parts[1] ? { cat: parts[0], obj: parts.slice(1).join(".") } : null
  }

  const have = new Set(mine.map((p) => p.toLowerCase()))
  const seen = new Set<string>()
  const rows: Row[] = []
  for (const r of data) {
    const k = keyOf(r)
    if (!k) continue
    const perm = `${k.cat}.${k.obj}`
    const l = perm.toLowerCase()
    if (seen.has(l)) continue
    seen.add(l)
    const rw = have.has(`${l}.readwrite`)
    const rd = rw || have.has(`${l}.read`)
    const acc: Access = rw ? "ReadWrite" : rd ? "Read" : "None"
    const rfn = splitFns(cell(r, iR))
    const wfn = splitFns(cell(r, iW))
    const rok = acc !== "None"
    const wok = acc === "ReadWrite"
    const total = rfn.length + wfn.length
    const usable = (rok ? rfn.length : 0) + (wok ? wfn.length : 0)
    rows.push({
      i: 0,
      cat: k.cat,
      obj: k.obj,
      perm,
      acc,
      desc: cell(r, iD),
      nav: splitNav(cell(r, iN)),
      rfn,
      wfn,
      status: cell(r, iX),
      mm: cell(r, iM),
      rok,
      wok,
      total,
      usable,
      blocked: total - usable,
    })
  }
  if (!rows.length) throw new Error("No permissions found in the catalog. Check the file is the CSV (use Raw on GitHub).")
  rows.sort((a, b) => (a.perm < b.perm ? -1 : a.perm > b.perm ? 1 : 0))
  rows.forEach((r, i) => (r.i = i))

  const known = new Set(rows.map((r) => r.perm.toLowerCase()))
  const unknown = mine.filter((p) => !known.has(stripLevel(p).toLowerCase()))
  return { rows, unknown }
}

export type CatalogInfo =
  | { ok: true; count: number; functions: number; withFunctions: number }
  | { ok: false; error: string }

/** Quick validation used to give feedback as soon as a custom catalog is loaded. */
export function inspectCatalog(csv: string): CatalogInfo {
  try {
    const { rows } = buildRows(csv, [])
    return {
      ok: true,
      count: rows.length,
      functions: rows.reduce((n, r) => n + r.total, 0),
      withFunctions: rows.filter((r) => r.total > 0).length,
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not read the catalog." }
  }
}

export const CATALOG_TEMPLATE =
  "Category,Object,Description,NavSections,BackendReadFunctions,BackendReadWriteFunctions\r\n" +
  '"Tenant","Administration","Example: tenant admin pages","Tenant Administration > Overview; Tenant Administration > Tenants","ListTenantDetails; ListTenants","ExecEditTenant"\r\n' +
  '"Identity","User","Example: user management","Identity Management > Users","ListUsers","ExecResetPass; ExecDisableUser"\r\n'

export function visibleRows(rows: Row[], f: Filters): Row[] {
  const q = f.q.trim().toLowerCase()
  return rows.filter((r) => {
    if (f.acc === "gap" && r.acc === "ReadWrite") return false
    if (f.acc !== "gap" && f.acc !== "all" && r.acc !== f.acc) return false
    if (!q) return true
    return `${r.perm} ${r.desc} ${r.nav.join(" ")} ${r.rfn.join(" ")} ${r.wfn.join(" ")}`
      .toLowerCase()
      .includes(q)
  })
}

/** Functions of one permission after the function filter + search. */
export function fnsFor(r: Row, f: Filters): { read: FnItem[]; write: FnItem[] } {
  const q = f.q.trim().toLowerCase()
  const permMatches = !q || `${r.perm} ${r.desc} ${r.nav.join(" ")}`.toLowerCase().includes(q)
  const mk = (arr: string[], ok: boolean): FnItem[] =>
    arr
      .filter((n) => {
        if (f.fn === "bad" && ok) return false
        if (f.fn === "ok" && !ok) return false
        return permMatches || n.toLowerCase().includes(q)
      })
      .map((n) => ({ n, ok }))
  return { read: mk(r.rfn, r.rok), write: mk(r.wfn, r.wok) }
}

export function flatAll(list: Row[], f: Filters): FlatFn[] {
  const out: FlatFn[] = []
  for (const r of list) {
    const x = fnsFor(r, f)
    const pages = r.nav.join(" | ")
    x.read.forEach((i) => out.push({ cat: r.cat, perm: r.perm, fn: i.n, lvl: "Read", ok: i.ok, acc: r.acc, pages }))
    x.write.forEach((i) =>
      out.push({ cat: r.cat, perm: r.perm, fn: i.n, lvl: "ReadWrite", ok: i.ok, acc: r.acc, pages })
    )
  }
  return out
}

export interface Stats {
  none: number
  read: number
  rw: number
  blocked: number
  total: number
  count: number
}

export function stats(rows: Row[]): Stats {
  const s: Stats = { none: 0, read: 0, rw: 0, blocked: 0, total: 0, count: rows.length }
  for (const r of rows) {
    if (r.acc === "None") s.none++
    else if (r.acc === "Read") s.read++
    else s.rw++
    s.blocked += r.blocked
    s.total += r.total
  }
  return s
}

export function groupByCategory(list: Row[]): { cat: string; items: Row[] }[] {
  const m = new Map<string, Row[]>()
  for (const r of list) {
    if (!m.has(r.cat)) m.set(r.cat, [])
    m.get(r.cat)!.push(r)
  }
  return [...m.entries()].map(([cat, items]) => ({ cat, items }))
}
