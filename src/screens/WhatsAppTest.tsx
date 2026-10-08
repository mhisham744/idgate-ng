import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Send, MessageCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '@/i18n'
import { Button, Card, EmptyState, Field, Input, cx } from '@/ui/primitives'

type Msg = { id: string; dir: 'in' | 'out'; peer: string; text: string; at: string }

/**
 * WhatsApp test flow (Strategy edition) — sends/receives messages through the
 * project's serverless functions (api/wa-send, api/wa-webhook, api/wa-messages).
 * Works on the Vercel build where /api exists; the token lives in Vercel env vars.
 */
export function WhatsAppTest() {
  const navigate = useNavigate()
  const { isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)

  const [to, setTo] = useState('')
  const [text, setText] = useState('')
  const [messages, setMessages] = useState<Msg[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const digits = to.replace(/[^\d]/g, '')

  const poll = async () => {
    if (!digits) return
    try {
      const r = await fetch(`/api/wa-messages?to=${digits}`)
      if (r.status === 404) {
        setUnavailable(true)
        return
      }
      const data = await r.json().catch(() => ({}))
      if (Array.isArray(data.messages)) setMessages(data.messages)
    } catch {
      /* transient */
    }
  }

  useEffect(() => {
    if (!digits) return
    poll()
    const id = window.setInterval(poll, 4000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!digits || !text.trim() || sending) return
    setSending(true)
    setError(null)
    try {
      const r = await fetch('/api/wa-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: digits, text: text.trim() }),
      })
      if (r.status === 404) {
        setUnavailable(true)
        return
      }
      const data = await r.json().catch(() => ({}))
      if (!r.ok) {
        setError(data?.error ?? L('Send failed.', 'فشل الإرسال.'))
        return
      }
      setText('')
      poll()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-full flex-col p-4 pb-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} className={isRtl ? 'rotate-180 me-1.5' : 'me-1.5'} />
        {L('Back', 'رجوع')}
      </Button>

      <div className="mt-2 mb-3">
        <h1 className="text-xl font-bold text-slate-800">{L('WhatsApp test', 'اختبار واتساب')}</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {L('Exchange messages with your test WhatsApp agent. Works on the Vercel build.', 'تبادل الرسائل مع وكيل واتساب التجريبي. يعمل على نسخة Vercel.')}
        </p>
      </div>

      {unavailable ? (
        <EmptyState
          icon={<MessageCircle size={28} />}
          title={L('Not available on this build', 'غير متاح في هذه النسخة')}
          subtitle={L('The WhatsApp functions run on the Vercel deployment, not GitHub Pages.', 'وظائف واتساب تعمل على نشر Vercel وليس GitHub Pages.')}
        />
      ) : (
        <>
          <Field label={L('Recipient number (with country code, digits only)', 'رقم المستلم (مع رمز الدولة، أرقام فقط)')}>
            <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="201001234567" dir="ltr" inputMode="numeric" />
          </Field>

          <Card className="my-3 flex-1 overflow-y-auto thin-scroll p-3">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                {digits ? L('No messages yet.', 'لا توجد رسائل بعد.') : L('Enter a number to start.', 'أدخل رقمًا للبدء.')}
              </div>
            ) : (
              <div className="space-y-2">
                {messages.map((m) => (
                  <div key={m.id} className={cx('flex', m.dir === 'out' ? 'justify-end' : 'justify-start')}>
                    <div className={cx('max-w-[80%] rounded-2xl px-3 py-2 text-sm', m.dir === 'out' ? 'bg-emerald-500 text-light' : 'bg-slate-100 text-slate-800')}>
                      {m.text}
                      <div className={cx('mt-0.5 text-[10px]', m.dir === 'out' ? 'text-emerald-50/80' : 'text-slate-400')} dir="ltr">
                        {new Date(m.at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
            )}
          </Card>

          {error && <p className="mb-2 text-xs text-rose-500">{error}</p>}

          <div className="flex items-end gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send() }}
              placeholder={L('Type a message…', 'اكتب رسالة…')}
              className="flex-1"
            />
            <Button onClick={send} disabled={!digits || !text.trim() || sending}>
              <Send size={16} />
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
