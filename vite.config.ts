import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { viteSingleFile } from "vite-plugin-singlefile"

// `npm run build` -> docs/index.html: ONE self-contained file (JS + CSS inlined).
// GitHub Pages: Settings -> Pages -> Deploy from a branch -> main -> /docs
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  build: { outDir: "docs", emptyOutDir: true },
})
