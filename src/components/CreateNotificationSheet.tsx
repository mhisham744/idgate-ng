import { useMemo, useRef, useState } from 'react'
import { FileText, Paperclip, X as XIcon } from 'lucide-react'
import { useStore } from '@/store'
import { useLang, bl } from '@/i18n'
import { actorKey, uid } from '@/lib/identity'
import { useResolveActor } from '@/components/identity'
import { useDirectory } from '@/lib/userScope'
import { RecipientPicker } from '@/components/RecipientPicker'
import type { PickerGroup } from '@/components/RecipientPicker'
import { NOTE_KIND_LABELS } from '@/data/reference'
import { Button, Field, Input, Textarea, Select, Sheet } from '@/ui/primitives'
import type { ActorRef, AttachmentMeta, NoteKind, TransactionKey } from '@/types'

const L = (isRtl: boolean, en: string, ar: string) => (isRtl ? ar : en)

function humanSize(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

// Notification kinds the create sheet offers, each with the permission key that gates it.
// (Voting and IDGate notes are intentionally not creatable.)
const CREATABLE_KINDS: { kind: NoteKind; permission: TransactionKey }[] = [
  { kind: 'task', permission: 'note.task' },
  { kind: 'calendar', permission: 'note.calendar' },
  { kind: 'offer', permission: 'note.offer' },
  { kind: 'event', permission: 'note.event' },
  { kind: 'training', permission: 'note.training' },
  { kind: 'tender', permission: 'note.tender' },
  { kind: 'other', permission: 'note.other' },
]

/**
 * The "Create Notification" composer — moved out of the Statements page and now
 * opened from the Tools page (the first "Notification" supporting-tool row).
 * Self-contained: it reads the acting account's Directory, the creatable note
 * kinds its profile grants, and calls `createNotification` directly.
 */
export function CreateNotificationSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang, isRtl } = useLang()
  const resolve = useResolveActor()

  const active = useStore((s) => s.active)
  const can = useStore((s) => s.can)
  const groupRecipients = useStore((s) => s.groupRecipients)
  const createNotification = useStore((s) => s.createNotification)

  const meKey = active ? actorKey(active) : ''

  // Recipients + groups are scoped to the acting account's Directory.
  const dir = useDirectory()
  const options = dir.people
  const groups = useMemo<PickerGroup[]>(
    () =>
      dir.groups.map((g) => ({
        id: g.id,
        name: g.name,
        count: groupRecipients(g.id).filter((r) => actorKey(r) !== meKey).length,
      })),
    [dir.groups, groupRecipients, meKey],
  )
  const expandGroup = (id: string): ActorRef[] =>
    groupRecipients(id).filter((r) => actorKey(r) !== meKey)

  const kinds = useMemo(() => CREATABLE_KINDS.filter((c) => can(c.permission)).map((c) => c.kind), [can])

  const resolveName = (r: ActorRef) => resolve(r).displayName
  const resolveLabel = (r: ActorRef) => {
    const info = resolve(r)
    return info.address ? `${info.displayName} — ${info.address}` : info.displayName
  }

  const [kind, setKind] = useState<NoteKind | ''>('')
  const [toRefs, setToRefs] = useState<ActorRef[]>([])
  const [toGroups, setToGroups] = useState<string[]>([])
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [targetTime, setTargetTime] = useState('')
  const [targetVenue, setTargetVenue] = useState('')
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setKind('')
    setToRefs([])
    setToGroups([])
    setSubject('')
    setBody('')
    setTargetDate('')
    setTargetTime('')
    setTargetVenue('')
    setAttachments([])
  }

  const to = useMemo(() => {
    const seen = new Set<string>()
    const out: ActorRef[] = []
    for (const r of [...toRefs, ...toGroups.flatMap(expandGroup)]) {
      const k = actorKey(r)
      if (!seen.has(k)) {
        seen.add(k)
        out.push(r)
      }
    }
    return out
  }, [toRefs, toGroups, expandGroup])

  const valid =
    !!kind &&
    to.length > 0 &&
    subject.trim().length > 0 &&
    body.trim().length > 0 &&
    targetDate.length > 0

  const onFiles = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach((f) => {
      const id = uid('att')
      setAttachments((prev) => [...prev, { id, name: f.name, size: f.size, type: f.type }])
      if (f.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = () =>
          setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, dataUrl: reader.result as string } : a)))
        reader.readAsDataURL(f)
      }
    })
  }

  const close = () => {
    reset()
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title={t('createNotification')}
      footer={
        <Button
          full
          disabled={!valid}
          onClick={() => {
            if (!kind || to.length === 0) return
            createNotification({
              kind,
              to,
              subject: subject.trim(),
              body: body.trim(),
              targetDate: targetDate || undefined,
              targetTime: targetTime || undefined,
              targetVenue: targetVenue.trim() || undefined,
              attachments: attachments.length ? attachments : undefined,
            })
            close()
          }}
        >
          {t('create')}
        </Button>
      }
    >
      <div className="space-y-4 py-2">
        <Field label={t('type')} required>
          <Select value={kind} onChange={(e) => setKind(e.target.value as NoteKind)}>
            <option value="">{L(isRtl, 'Select type…', 'اختر النوع…')}</option>
            {kinds.map((k) => (
              <option key={k} value={k}>
                {bl(NOTE_KIND_LABELS[k], lang)}
              </option>
            ))}
          </Select>
        </Field>

        <RecipientPicker
          label={t('to')}
          required
          options={options}
          groups={groups}
          refs={toRefs}
          groupIds={toGroups}
          onChangeRefs={setToRefs}
          onChangeGroupIds={setToGroups}
          resolveName={resolveName}
          resolveLabel={resolveLabel}
          placeholder={t('searchRecipients')}
          isRtl={isRtl}
        />

        <Field label={t('subject')} required>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </Field>
        <Field label={t('body')} required>
          <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>
        <Field label={t('targetDate')} required>
          <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </Field>
        <Field label={t('targetTime')} hint={t('optional')}>
          <Input type="time" value={targetTime} onChange={(e) => setTargetTime(e.target.value)} />
        </Field>
        <Field label={t('targetVenue')} hint={t('optional')}>
          <Input value={targetVenue} onChange={(e) => setTargetVenue(e.target.value)} />
        </Field>

        <div>
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              onFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-50"
          >
            <Paperclip size={14} /> {t('addAttachment')}
          </button>
          {attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {attachments.map((a) => (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 py-1.5 ps-2.5 pe-1 text-[11px] font-medium text-slate-600"
                >
                  {a.dataUrl && a.type.startsWith('image/') ? (
                    <img src={a.dataUrl} alt="" className="h-4 w-4 rounded object-cover" />
                  ) : (
                    <FileText size={12} />
                  )}
                  <span className="max-w-[9rem] truncate">{a.name}</span>
                  <span className="text-slate-400">{humanSize(a.size)}</span>
                  <button
                    type="button"
                    onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
                    className="flex h-4 w-4 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-300 hover:text-slate-700"
                    aria-label={L(isRtl, 'Remove', 'إزالة')}
                  >
                    <XIcon size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Sheet>
  )
}
