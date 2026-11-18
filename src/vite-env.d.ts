/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TUTORIAL_EMBED_URL?: string
  readonly VITE_TUTORIAL_OPEN_URL?: string
  readonly VITE_TUTORIAL_TITLE?: string
  readonly VITE_TUTORIAL_DESCRIPTION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
