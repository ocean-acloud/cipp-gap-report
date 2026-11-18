# CIPP Permission Gap Report (shadcn/ui)

Shows which CIPP permissions, pages and backend functions a CIPP role can and can't use.
Runs entirely in the browser. Nothing is uploaded or stored.

Stack: Vite + React + TypeScript + Tailwind CSS v4 + shadcn/ui. No hand-written CSS
(`src/index.css` only has the Tailwind import and the standard shadcn theme tokens).

## Build one single index.html
Needs Node.js LTS (https://nodejs.org).

    npm install
    npm run build

This writes **`docs/index.html`**: one self-contained file (JavaScript and CSS inlined). It also opens by double-click.

## Publish on GitHub Pages (from a branch, no Actions)
1. Commit the `docs/` folder and push to `main`.
2. Settings -> Pages -> Build and deployment -> Deploy from a branch -> `main` -> **`/docs`** -> Save.
3. Site: `https://<user>.github.io/<repo>/`.
Rebuild and commit `docs/` whenever you change the code.

## Run locally
    npm run dev        # http://localhost:5173
    npm run typecheck  # optional

## Layout
- `src/lib/catalog.ts` - parsing, matching, filtering (no UI)
- `src/lib/export.tsx` - Save as HTML / PDF / CSV
- `src/lib/grab.ts`, `admin-export.ts` - snippets that run on the CIPP tab
- `src/components/ui/*` - shadcn components
- `src/components/*` - screens

## Custom catalog
Default catalog loads automatically. In Step 2 > "Use my own catalog" upload or paste a CSV.
Required: `Category` + `Object` columns, or one `Permission` column. A plain list of `Category.Object.Read` lines also works.
Optional: `Description`, `NavSections`, `BackendReadFunctions`, `BackendReadWriteFunctions` (separate values with `;`).

## Notes
- Default catalog: `Queensland-Computers/cipp-permissions-mapper` (third-party). Check it against your CIPP version.
- PDF: the print window opens on a clean A4 landscape report. Choose "Save as PDF" and tick "Background graphics".
- Never commit exported reports or tenant data.
