import { useEffect, useRef, useState } from 'react'
import { Camera, Check, Info, Loader2, RotateCcw } from 'lucide-react'
import { cx } from '@/ui/primitives'

/** Progress dots for the registration wizard. */
export function Stepper({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5" aria-hidden>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cx(
            'h-1.5 rounded-full transition-all',
            i === current ? 'w-6 bg-gate-600' : i < current ? 'w-1.5 bg-gate-400' : 'w-1.5 bg-slate-200',
          )}
        />
      ))}
    </div>
  )
}

/** Amber "this is a simulation" hint, used to reveal fake OTP codes etc. */
export function DemoHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-700">
      <Info size={14} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  )
}

/** Small inline spinner + label. */
export function Working({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-3 text-sm text-slate-500">
      <Loader2 size={16} className="animate-spin" />
      {label}
    </div>
  )
}

/**
 * Fixed-length OTP entry: `length` single-digit boxes with auto-advance and
 * backspace handling. Digits stay LTR even in an RTL layout.
 */
export function OtpBoxes({
  length = 6,
  value,
  onChange,
}: {
  length?: number
  value: string
  onChange: (v: string) => void
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const setDigit = (i: number, d: string) => {
    const digit = d.replace(/\D/g, '').slice(-1)
    // Clearing a box drops it and everything after it, so the code stays a
    // contiguous string (no middle "holes" that would silently shift later
    // digits left when joined).
    if (!digit) {
      onChange(value.slice(0, i))
      return
    }
    // Writing never leaves a gap: a keystroke lands in the next empty slot,
    // clamped to the current length.
    const at = Math.min(i, value.length)
    const joined = (value.slice(0, at) + digit).slice(0, length)
    onChange(joined)
    if (at < length - 1) refs.current[at + 1]?.focus()
  }

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) refs.current[i - 1]?.focus()
  }

  const onPaste = (e: React.ClipboardEvent) => {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (digits) {
      e.preventDefault()
      onChange(digits)
      refs.current[Math.min(digits.length, length - 1)]?.focus()
    }
  }

  return (
    <div dir="ltr" className="flex justify-center gap-2">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ''}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={onPaste}
          className="h-12 w-10 rounded-2xl border border-slate-200 bg-slate-50/60 text-center text-lg font-semibold text-slate-800 outline-none transition focus:border-gate-400 focus:bg-white focus:ring-2 focus:ring-gate-100"
        />
      ))}
    </div>
  )
}

/**
 * Camera / file capture tile. On mobile `capture` opens the camera directly;
 * on desktop it falls back to a file picker. Shows a preview once captured.
 */
export function CaptureField({
  label,
  facing = 'environment',
  captured,
  onCapture,
}: {
  label: string
  facing?: 'environment' | 'user'
  captured: boolean
  onCapture: (dataUrl: string | null) => void
}) {
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const handle = (file?: File) => {
    if (!file) return
    if (preview) URL.revokeObjectURL(preview)
    const url = URL.createObjectURL(file)
    setPreview(url)
    onCapture(url)
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture={facing}
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0])}
      />
      {preview ? (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200">
          <img src={preview} alt={label} className="h-36 w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
            <span className="flex items-center gap-1 text-[11px] font-medium text-light">
              <Check size={13} /> {label}
            </span>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1 rounded-full bg-light/20 px-2 py-1 text-[10px] font-medium text-light backdrop-blur hover:bg-light/30"
            >
              <RotateCcw size={11} />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cx(
            'flex h-36 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-slate-400 transition',
            captured ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-300 bg-slate-50/60 hover:border-gate-400 hover:text-gate-600',
          )}
        >
          <Camera size={22} />
          <span className="text-xs font-medium">{label}</span>
        </button>
      )}
    </div>
  )
}
