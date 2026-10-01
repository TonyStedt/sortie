/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The score server's /scores endpoint. Unset: high scores stay local. */
  readonly VITE_SCORES_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
