import { clsx } from 'clsx'
import type { ButtonHTMLAttributes, CSSProperties, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { createContext, useContext, useEffect } from 'react'
import { X, ChevronDown } from 'lucide-react'

// A tiny classnames helper so screens don't each re-import clsx.
export function cx(...args: Parameters<typeof clsx>) {
  return clsx(...args)
}

// ── Button ──────────────────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'
type ButtonSize = 'sm' | 'md' | 'lg'

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  full,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize; full?: boolean }) {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-2xl font-medium transition-all active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
        size === 'sm' && 'px-3 py-1.5 text-xs',
        size === 'md' && 'px-4 py-2.5 text-sm',
        size === 'lg' && 'px-5 py-3 text-base',
        variant === 'primary' && 'bg-gate-600 text-light shadow-sm hover:bg-gate-700 active:shadow-none',
        variant === 'secondary' && 'bg-gate-50 text-gate-700 hover:bg-gate-100 border border-gate-100',
        variant === 'ghost' && 'text-gate-700 hover:bg-gate-50',
        variant === 'subtle' && 'bg-slate-100 text-slate-700 hover:bg-slate-200',
        variant === 'danger' && 'bg-rose-600 text-light shadow-sm hover:bg-rose-700 active:shadow-none',
        full && 'w-full',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

// ── Card ────────────────────────────────────────────────────────────────────
export function Card({ className, children, onClick, style }: { className?: string; children: ReactNode; onClick?: () => void; style?: CSSProperties }) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={cx(
        'rounded-3xl bg-white shadow-card border border-slate-100/80',
        onClick && 'cursor-pointer transition-all hover:shadow-card-hover active:scale-[0.99]',
        className,
      )}
    >
      {children}
    </div>
  )
}

// ── Avatar ──────────────────────────────────────────────────────────────────
export function Avatar({
  name,
  color,
  size = 40,
  square,
  icon,
}: {
  name: string
  color?: string
  size?: number
  square?: boolean
  icon?: ReactNode
}) {
  const initials = name
    .trim()
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
  return (
    <div
      className={cx('flex items-center justify-center font-semibold text-light shrink-0', square ? 'rounded-xl' : 'rounded-full')}
      style={{ width: size, height: size, background: color ?? '#64748b', fontSize: size * 0.36 }}
    >
      {icon ?? initials ?? '?'}
    </div>
  )
}

// ── Badge / Chip ──────────────────────────────────────────────────────────────
export function Badge({
  children,
  tone = 'slate',
  className,
}: {
  children: ReactNode
  tone?: 'slate' | 'green' | 'amber' | 'red' | 'gate' | 'teal' | 'violet'
  className?: string
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        tone === 'slate' && 'bg-slate-100 text-slate-600',
        tone === 'green' && 'bg-emerald-100 text-emerald-700',
        tone === 'amber' && 'bg-amber-100 text-amber-700',
        tone === 'red' && 'bg-rose-100 text-rose-700',
        tone === 'gate' && 'bg-gate-100 text-gate-700',
        tone === 'teal' && 'bg-teal-100 text-teal-700',
        tone === 'violet' && 'bg-violet-100 text-violet-700',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
        active ? 'bg-gate-600 text-light shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50',
      )}
    >
      {children}
    </button>
  )
}

// ── Form fields ────────────────────────────────────────────────────────────────
export function Field({ label, hint, children, required }: { label: string; hint?: string; children: ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="text-xs font-semibold text-slate-700">{label}</span>
        {required && <span className="text-rose-500">*</span>}
        {hint && <span className="text-[10px] text-slate-500">· {hint}</span>}
      </div>
      {children}
    </label>
  )
}

const inputCls =
  'w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-gate-400 focus:bg-white focus:ring-2 focus:ring-gate-100'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputCls, props.className)} />
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(inputCls, 'resize-none', props.className)} />
}
export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cx('relative', className)}>
      <select {...props} className={cx(inputCls, 'w-full appearance-none pe-9')} />
      <ChevronDown
        size={16}
        className="pointer-events-none absolute inset-y-0 end-3 my-auto text-slate-400"
      />
    </div>
  )
}

// ── EmptyState ─────────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle }: { icon?: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      {icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-slate-500">{title}</p>
      {subtitle && <p className="max-w-[15rem] text-xs text-slate-500">{subtitle}</p>}
    </div>
  )
}

// ── SectionHeader ─────────────────────────────────────────────────────────────
export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between px-1">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</h3>
      {action}
    </div>
  )
}

// ── Sheet (bottom sheet modal) ──────────────────────────────────────────────────
const SheetCtx = createContext<{ close: () => void }>({ close: () => {} })
export const useSheet = () => useContext(SheetCtx)

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <SheetCtx.Provider value={{ close: onClose }}>
      <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center sm:p-6">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
        <div className="relative flex max-h-[88%] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl animate-slide-up sm:max-h-[80vh] sm:max-w-md sm:rounded-3xl">
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <div className="mx-auto absolute inset-x-0 top-2 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />
            {title && <h2 className="text-base font-bold text-slate-800">{title}</h2>}
            <button onClick={onClose} className="ms-auto rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto thin-scroll px-5 pb-4">{children}</div>
          {footer && <div className="border-t border-slate-100 px-5 py-3">{footer}</div>}
        </div>
      </div>
    </SheetCtx.Provider>
  )
}

// ── Modal (centered) ─────────────────────────────────────────────────────────
export function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[85vh] overflow-y-auto thin-scroll rounded-3xl bg-white p-5 shadow-2xl animate-scale-in">{children}</div>
    </div>
  )
}

// ── Toggle ─────────────────────────────────────────────────────────────────────
export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cx(
        'relative h-6 w-10 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
        checked ? 'bg-gate-600' : 'bg-slate-300',
      )}
    >
      <span
        className={cx(
          'absolute top-0.5 start-0.5 h-5 w-5 rounded-full bg-light shadow transition-transform',
          checked ? 'translate-x-4 rtl:-translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  )
}

// ── Row (list item) ─────────────────────────────────────────────────────────────
export function Row({
  leading,
  title,
  subtitle,
  trailing,
  onClick,
  className,
}: {
  leading?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  trailing?: ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <div
      onClick={onClick}
      className={cx(
        'flex items-center gap-3 px-4 py-3',
        onClick && 'cursor-pointer transition-colors hover:bg-slate-50 active:bg-slate-100',
        className,
      )}
    >
      {leading}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-800">{title}</div>
        {subtitle && <div className="truncate text-xs text-slate-500">{subtitle}</div>}
      </div>
      {trailing}
    </div>
  )
}
