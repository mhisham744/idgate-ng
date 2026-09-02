import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  QrCode,
  Briefcase,
  Users,
  Contact,
  ChevronRight,
  Send,
  Info,
} from 'lucide-react'
import { useStore } from '@/store'
import { useLang, bl } from '@/i18n'
import { actorKey } from '@/lib/identity'
import { useResolveActor } from '@/components/identity'
import {
  Button,
  Card,
  Badge,
  Field,
  Input,
  Textarea,
  Select,
  Row,
  Sheet,
  SectionHeader,
  cx,
} from '@/ui/primitives'
import { TRANSACTIONS } from '@/data/reference'
import type { ActorRef, NoteKind, TransactionKey } from '@/types'

/** Which tool keys map to a createNotification kind. */
const NOTE_TOOL: Partial<Record<TransactionKey, NoteKind>> = {
  'tool.meeting': 'meeting',
  'tool.conference': 'conference',
  'tool.idgateNote': 'idgate',
  'tool.complaint': 'complaint',
}

export function Tools() {
  const navigate = useNavigate()
  const { lang, t, isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)

  const active = useStore((s) => s.active)
  const can = useStore((s) => s.can)
  const normals = useStore((s) => s.normals)
  const virtuals = useStore((s) => s.virtuals)
  const sendContactRequest = useStore((s) => s.sendContactRequest)
  const createNotification = useStore((s) => s.createNotification)
  const resolve = useResolveActor()

  const [sheetKey, setSheetKey] = useState<TransactionKey | null>(null)
  const [recipient, setRecipient] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  // Candidate recipients: all persons + all virtuals, excluding the active account.
  const options: { key: string; ref: ActorRef }[] = [
    ...normals.map((n) => ({ key: actorKey({ kind: 'normal', normalId: n.id }), ref: { kind: 'normal', normalId: n.id } as ActorRef })),
    ...virtuals.map((v) => ({ key: actorKey({ kind: 'virtual', virtualId: v.id }), ref: { kind: 'virtual', virtualId: v.id } as ActorRef })),
  ].filter((o) => !active || o.key !== actorKey(active))

  const launchers = [
    { icon: QrCode, title: t('idgateCode'), subtitle: L('Your QR identity badge', 'بطاقة هويتك عبر رمز QR'), to: '/tools/idgate' },
    { icon: Briefcase, title: t('vacancies'), subtitle: L('Find or post positions', 'ابحث أو انشر وظائف'), to: '/tools/vacancies' },
    { icon: Users, title: t('groups'), subtitle: L('Communicate with a node & below', 'التواصل مع مستوى وما دونه'), to: '/tools/groups' },
    { icon: Contact, title: t('directory'), subtitle: L('People & entities', 'الأشخاص والجهات'), to: '/directory' },
  ]

  const toolTx = TRANSACTIONS.filter((tx) => tx.area === 'tools')

  function openTool(key: TransactionKey) {
    if (key === 'tool.createVacancy' || key === 'tool.displayVacancy') {
      navigate('/tools/vacancies')
      return
    }
    setRecipient('')
    setSubject('')
    setBody('')
    setSheetKey(key)
  }

  function closeSheet() {
    setSheetKey(null)
  }

  const activeDef = sheetKey ? toolTx.find((d) => d.key === sheetKey) : undefined
  const noteKind = sheetKey ? NOTE_TOOL[sheetKey] : undefined
  const isContact = sheetKey === 'tool.contactRequest'
  const isComposable = isContact || !!noteKind

  function submit() {
    if (!sheetKey) return
    const ref = options.find((o) => o.key === recipient)?.ref
    if (isContact) {
      if (!ref) return
      sendContactRequest(ref)
    } else if (noteKind) {
      createNotification({ kind: noteKind, to: ref ? [ref] : [], subject, body })
    }
    closeSheet()
  }

  return (
    <div className="p-4 space-y-6 pb-8">
      <SectionHeader title={t('tools')} />

      <div className="grid grid-cols-2 gap-3">
        {launchers.map((l) => {
          const Icon = l.icon
          return (
            <Card key={l.to} onClick={() => navigate(l.to)} className="p-4 flex flex-col gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gate-50 text-gate-600">
                <Icon size={22} />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-800">{l.title}</div>
                <div className="text-xs text-slate-500">{l.subtitle}</div>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="space-y-2">
        <SectionHeader title={L('Supporting tools', 'أدوات مساندة')} />
        <Card className="divide-y divide-slate-100 overflow-hidden">
          {toolTx.map((def) => {
            const allowed = can(def.key)
            return (
              <Row
                key={def.key}
                onClick={allowed ? () => openTool(def.key) : undefined}
                className={cx(!allowed && 'opacity-60')}
                leading={
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <Info size={16} />
                  </div>
                }
                title={bl(def.label, lang)}
                subtitle={def.note ? bl(def.note, lang) : undefined}
                trailing={
                  allowed ? (
                    <ChevronRight size={16} className={cx('text-slate-300', isRtl && 'rotate-180')} />
                  ) : (
                    <Badge tone="amber">{t('canReceiveOnly')}</Badge>
                  )
                }
              />
            )
          })}
        </Card>
      </div>

      <Sheet
        open={!!sheetKey}
        onClose={closeSheet}
        title={activeDef ? bl(activeDef.label, lang) : undefined}
        footer={
          isComposable ? (
            <Button
              full
              onClick={submit}
              disabled={isContact ? !recipient : !subject.trim()}
            >
              <Send size={16} className="me-1.5" />
              {isContact ? t('send') : t('send')}
            </Button>
          ) : (
            <Button full variant="secondary" onClick={closeSheet}>
              {t('close')}
            </Button>
          )
        }
      >
        {activeDef?.note && (
          <p className="mb-4 text-sm text-slate-600">{bl(activeDef.note, lang)}</p>
        )}

        {isContact && (
          <Field label={t('to')} required>
            <Select value={recipient} onChange={(e) => setRecipient(e.target.value)}>
              <option value="">{L('Select a recipient', 'اختر مستلمًا')}</option>
              {options.map((o) => {
                const r = resolve(o.ref)
                return (
                  <option key={o.key} value={o.key}>
                    {r.displayName}
                  </option>
                )
              })}
            </Select>
          </Field>
        )}

        {noteKind && (
          <div className="space-y-3">
            <Field label={t('to')} hint={L('Optional recipient', 'مستلم اختياري')}>
              <Select value={recipient} onChange={(e) => setRecipient(e.target.value)}>
                <option value="">{L('No specific recipient', 'بدون مستلم محدد')}</option>
                {options.map((o) => {
                  const r = resolve(o.ref)
                  return (
                    <option key={o.key} value={o.key}>
                      {r.displayName}
                    </option>
                  )
                })}
              </Select>
            </Field>
            <Field label={t('subject')} required>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </Field>
            <Field label={t('body')}>
              <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
            </Field>
          </div>
        )}

        {!isComposable && (
          <p className="text-sm text-slate-500">
            {L('This tool is part of the IDGate demo and is illustrative only.', 'هذه الأداة جزء من العرض التوضيحي لـ IDGate وهي للتوضيح فقط.')}
          </p>
        )}
      </Sheet>
    </div>
  )
}
