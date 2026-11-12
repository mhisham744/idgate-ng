/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Wallet-pass signing endpoint. Set only on the Vercel build. */
  readonly VITE_WALLET_API?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** Semantic app version, injected from package.json at build (see vite.config.ts). */
declare const __APP_VERSION__: string
