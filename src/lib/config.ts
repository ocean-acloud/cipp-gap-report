/**
 * Tutorial video settings. Nothing is hard-coded: links come from the local, git-ignored ".env" file
 * (see ".env.example") and are read when you run `npm run build`.
 */
const httpsOnly = (v: string | undefined): string => {
  const s = (v ?? "").trim()
  return s.startsWith("https://") ? s : ""
}

export const TUTORIAL = {
  title: (import.meta.env.VITE_TUTORIAL_TITLE ?? "").trim() || "Watch the tutorial",
  description:
    (import.meta.env.VITE_TUTORIAL_DESCRIPTION ?? "").trim() || "A short walkthrough of how to use this report.",
  embedUrl: httpsOnly(import.meta.env.VITE_TUTORIAL_EMBED_URL),
  openUrl: httpsOnly(import.meta.env.VITE_TUTORIAL_OPEN_URL),
}

export const HAS_TUTORIAL = Boolean(TUTORIAL.embedUrl || TUTORIAL.openUrl)
