// Run once from the project root:  node patch.mjs
// Makes 3 small edits to files you already have. Backs each file up as *.bak first.
// Safe to run twice (it skips edits that are already applied) and stops loudly if an expected line is not found.
import fs from "node:fs"

const edits = [
  {
    file: "src/components/report-view.tsx",
    steps: [
      {
        done: "all: rows,",
        find: "f({ list, filters, mineCount, catalogCount: rows.length, source })",
        put: "f({ list, all: rows, filters, mineCount, catalogCount: rows.length, source })",
      },
      {
        done: "all: compare.rows,",
        find: "rows: cmpList,",
        put: "rows: cmpList,\n      all: compare.rows,",
      },
    ],
  },
  {
    file: "src/components/setup-view.tsx",
    steps: [
      {
        done: "ReportImport",
        find: 'import { TutorialVideo } from "@/components/tutorial-video"',
        put: 'import { TutorialVideo } from "@/components/tutorial-video"\nimport { ReportImport } from "@/components/report-import"',
      },
      {
        done: "<ReportImport",
        // end of the "Compare with another person" block, right before the Step 2 card
        find: /(<\/More>)(\s*<\/CardContent>\s*<\/Card>\s*\{\/\* STEP 2 \*\/\})/,
        put:
          '$1\n\n          <More title="Convert a saved HTML report to JSON">\n' +
          "            <ReportImport\n" +
          '              onUseMine={(t) => {\n                setPerms(t)\n                toast.success("Loaded into Step 1")\n              }}\n' +
          "              onUseOther={(n, t) => {\n                setOtherName(n)\n                setOtherText(t)\n" +
          '                toast.success("Loaded into \\"Compare with another person\\" (open that section to see it)")\n              }}\n' +
          "            />\n          </More>$2",
      },
    ],
  },
]

let failed = false
for (const e of edits) {
  if (!fs.existsSync(e.file)) {
    console.log(`MISSING  ${e.file}  (run this from the project root)`)
    failed = true
    continue
  }
  const orig = fs.readFileSync(e.file, "utf8")
  let text = orig
  for (const s of e.steps) {
    if (text.includes(s.done)) {
      console.log(`skip     ${e.file}  (already applied: ${s.done})`)
      continue
    }
    const hit = typeof s.find === "string" ? text.includes(s.find) : s.find.test(text)
    if (!hit) {
      console.log(`NOT FOUND ${e.file}  -> ${String(s.find).slice(0, 70)}`)
      failed = true
      continue
    }
    text = typeof s.find === "string" ? text.replace(s.find, () => s.put) : text.replace(s.find, s.put)
    console.log(`patched  ${e.file}`)
  }
  if (text !== orig) {
    fs.writeFileSync(e.file + ".bak", orig)
    fs.writeFileSync(e.file, text)
  }
}
console.log(failed ? "\nSome edits were not applied. Send me the lines above." : "\nDone. Now run: npm run build")
process.exit(failed ? 1 : 0)
