/**
 * Client helper for the "Add to Apple Wallet" feature.
 *
 * The signing endpoint only exists on the Vercel deployment, so the feature is
 * enabled purely by the presence of the VITE_WALLET_API build flag (set in
 * vercel.json's build.env, absent on the GitHub Pages build). When unset,
 * `walletEnabled` is false and the UI hides the button entirely.
 */

const API_BASE = import.meta.env.VITE_WALLET_API as string | undefined

export const walletEnabled = !!API_BASE

export interface WalletPassInput {
  /** QR/barcode payload and the human-readable IDGate address. */
  address: string
  /** Pass holder (host person's name, or entity name when unlinked). */
  name: string
  /** Position / role title. */
  position: string
  /** Issuing entity (organization) name. */
  org: string
  /** Accent colour as #rrggbb — becomes the pass background. */
  color?: string
  /** Optional position code shown on the pass. */
  code?: string
  /** Stable serial so re-adding updates the same pass. */
  serial: string
}

/**
 * Requests a signed .pkpass and hands it to the OS. On iOS Safari navigating to
 * the pkpass blob opens the native "Add to Apple Wallet" sheet; on desktop it
 * downloads the file.
 */
export async function addToWallet(input: WalletPassInput): Promise<void> {
  if (!API_BASE) throw new Error('Apple Wallet is not available on this version of the app.')

  const qs = new URLSearchParams({
    address: input.address,
    name: input.name,
    position: input.position,
    org: input.org,
    serial: input.serial,
  })
  if (input.color) qs.set('color', input.color)
  if (input.code) qs.set('code', input.code)

  const res = await fetch(`${API_BASE}?${qs.toString()}`)
  if (!res.ok) {
    let message = 'Could not generate the Wallet pass.'
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      /* non-JSON error body — keep the generic message */
    }
    throw new Error(message)
  }

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  // Navigation (not a download anchor) is what triggers the Wallet sheet on iOS.
  window.location.href = url
  setTimeout(() => URL.revokeObjectURL(url), 15000)
}
