/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Wallet-pass signing endpoint. Set only on the Vercel build. */
  readonly VITE_WALLET_API?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
