import type { VercelRequest, VercelResponse } from '@vercel/node'
import { PKPass } from 'passkit-generator'
import forge from 'node-forge'
import zlib from 'node:zlib'

/**
 * Serverless signer for the "Add to Apple Wallet" feature.
 *
 * Only deployed on Vercel (the GitHub Pages build has no /api). The client calls
 * GET /api/wallet-pass?... with the display fields of a virtual identity and gets
 * back a signed .pkpass served as application/vnd.apple.pkpass, which iOS Safari
 * hands to Wallet.
 *
 * Signing certificates come from env (base64 or raw PEM):
 *   PASS_SIGNER_CERT, PASS_SIGNER_KEY, PASS_SIGNER_KEY_PASSPHRASE (optional), PASS_WWDR
 *   PASS_TYPE_IDENTIFIER, PASS_TEAM_IDENTIFIER
 * Until a real Apple Pass Type ID certificate is supplied, preview deployments
 * (VERCEL_ENV !== 'production') fall back to a self-signed certificate so the whole
 * pipeline is exercisable — the resulting pass is structurally valid and downloads
 * correctly, but Wallet will refuse to add it. Set PASS_ALLOW_DEV_CERT=1 to force
 * the fallback on in any environment.
 */

const str = (v: string | string[] | undefined, fallback = ''): string =>
  (Array.isArray(v) ? v[0] : v) ?? fallback

function hexToRgb(hex?: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex ?? '').trim())
  if (!m) return [30, 41, 74] // IDGate deep blue fallback
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// ── Minimal solid-colour PNG encoder (Apple requires icon.png/logo.png) ──────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf: Buffer): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const t = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
  return Buffer.concat([len, t, data, crc])
}
function solidPng(size: number, [r, g, b]: [number, number, number]): Buffer {
  const rowLen = size * 4
  const raw = Buffer.alloc((rowLen + 1) * size)
  for (let y = 0; y < size; y++) {
    const base = y * (rowLen + 1)
    raw[base] = 0 // filter: none
    for (let x = 0; x < size; x++) {
      const o = base + 1 + x * 4
      raw[o] = r
      raw[o + 1] = g
      raw[o + 2] = b
      raw[o + 3] = 255
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// ── Certificate resolution ───────────────────────────────────────────────────
const asPem = (v?: string): string | undefined =>
  !v ? undefined : v.includes('BEGIN') ? v : Buffer.from(v, 'base64').toString('utf8')

let devCertCache: { signerCert: string; signerKey: string; wwdr: string } | null = null
function devCerts() {
  if (devCertCache) return devCertCache
  const keys = forge.pki.rsa.generateKeyPair(2048)
  const cert = forge.pki.createCertificate()
  cert.publicKey = keys.publicKey
  cert.serialNumber = '01'
  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date(Date.now() + 365 * 24 * 3600 * 1000)
  const attrs = [{ name: 'commonName', value: 'IDGate Dev Pass (self-signed)' }]
  cert.setSubject(attrs)
  cert.setIssuer(attrs)
  cert.sign(keys.privateKey, forge.md.sha256.create())
  const pem = forge.pki.certificateToPem(cert)
  devCertCache = { signerCert: pem, signerKey: forge.pki.privateKeyToPem(keys.privateKey), wwdr: pem }
  return devCertCache
}

type Certs = { signerCert: string; signerKey: string; wwdr: string; signerKeyPassphrase?: string; real: boolean }
function resolveCerts(): Certs | null {
  const signerCert = asPem(process.env.PASS_SIGNER_CERT)
  const signerKey = asPem(process.env.PASS_SIGNER_KEY)
  const wwdr = asPem(process.env.PASS_WWDR)
  if (signerCert && signerKey && wwdr) {
    return { signerCert, signerKey, wwdr, signerKeyPassphrase: process.env.PASS_SIGNER_KEY_PASSPHRASE, real: true }
  }
  const allowDev =
    process.env.PASS_ALLOW_DEV_CERT === '1' ||
    (!!process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production')
  if (allowDev) return { ...devCerts(), real: false }
  return null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const address = str(req.query.address)
  if (!address) {
    res.status(400).json({ error: 'Missing required "address" parameter.' })
    return
  }

  const certs = resolveCerts()
  if (!certs) {
    res.status(501).json({
      error:
        'Apple Wallet signing is not configured on this deployment yet. Provide PASS_SIGNER_CERT / PASS_SIGNER_KEY / PASS_WWDR, or set PASS_ALLOW_DEV_CERT=1 to preview with a self-signed pass.',
    })
    return
  }

  const name = str(req.query.name)
  const position = str(req.query.position)
  const org = str(req.query.org, 'IDGate')
  const code = str(req.query.code)
  const serial = str(req.query.serial) || `idgate-${Date.now()}`
  const rgb = hexToRgb(str(req.query.color))

  try {
    const pass = new PKPass(
      {
        'icon.png': solidPng(29, rgb),
        'icon@2x.png': solidPng(58, rgb),
        'logo.png': solidPng(48, rgb),
      },
      {
        wwdr: Buffer.from(certs.wwdr),
        signerCert: Buffer.from(certs.signerCert),
        signerKey: Buffer.from(certs.signerKey),
        signerKeyPassphrase: certs.signerKeyPassphrase,
      },
      {
        formatVersion: 1,
        passTypeIdentifier: process.env.PASS_TYPE_IDENTIFIER || 'pass.io.github.mhisham744.idgate',
        teamIdentifier: process.env.PASS_TEAM_IDENTIFIER || 'TEAMID0000',
        serialNumber: serial,
        organizationName: org,
        description: `IDGate — ${position || 'Identity'}`,
        logoText: org,
        foregroundColor: 'rgb(255, 255, 255)',
        labelColor: 'rgba(255, 255, 255, 0.75)',
        backgroundColor: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`,
      },
    )
    pass.type = 'generic'
    pass.setBarcodes({
      format: 'PKBarcodeFormatQR',
      message: address,
      messageEncoding: 'iso-8859-1',
      altText: address,
    })

    if (name) pass.primaryFields.push({ key: 'holder', label: 'HOLDER', value: name })
    if (position) pass.secondaryFields.push({ key: 'position', label: 'POSITION', value: position })
    pass.secondaryFields.push({ key: 'entity', label: 'ENTITY', value: org })
    if (code) pass.auxiliaryFields.push({ key: 'code', label: 'CODE', value: code })
    pass.backFields.push({ key: 'address', label: 'IDGate Address', value: address })
    if (!certs.real) {
      pass.backFields.push({
        key: 'devnotice',
        label: 'Notice',
        value:
          'Preview pass signed with a self-signed certificate — Apple Wallet will not add it until a real Pass Type ID certificate is configured.',
      })
    }

    const buffer = pass.getAsBuffer()
    res.setHeader('Content-Type', 'application/vnd.apple.pkpass')
    res.setHeader('Content-Disposition', `attachment; filename="${serial}.pkpass"`)
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).send(buffer)
  } catch (err) {
    res.status(500).json({ error: `Failed to generate pass: ${(err as Error).message}` })
  }
}
