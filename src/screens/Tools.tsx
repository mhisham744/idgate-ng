import { useMemo, useState } from 'react'
import { ChevronRight, Send, Info, Plus, X as XIcon, Bell, WalletCards, ShieldCheck, FilePlus2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store'
import { useLang, bl } from '@/i18n'
import { actorKey } from '@/lib/identity'
import { useResolveActor } from '@/components/identity'
import { useDirectory } from '@/lib/userScope'
import { RecipientPicker } from '@/components/RecipientPicker'
import type { PickerGroup } from '@/components/RecipientPicker'
import { CreateNotificationSheet } from '@/components/CreateNotificationSheet'
import { IssueCredentialSheet } from '@/components/IssueCredentialSheet'
import {
  Button,
  Card,
  Field,
  Input,
  Select,
  Row,
  Sheet,
  SectionHeader,
  cx,
} from '@/ui/primitives'
import { IDGateCodeCard } from '@/screens/IDGateCode'
import {
  TRANSACTIONS,
  INTERACTIVE_TOOLS,
  ASSESSMENT_TOOL_KIND,
  ASSESSMENT_TYPE_OPTIONS,
  EVAL_TYPE_LABELS,
} from '@/data/reference'
import type { EvalType } from '@/data/reference'
import type { ActorRef, TransactionKey } from '@/types'

export function Tools() {
  const { lang, t, isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)
  const resolve = useResolveActor()
  const navigate = useNavigate()

  const active = useStore((s) => s.active)
  const can = useStore((s) => s.can)
  const isVerifiedIssuer = useStore((s) => s.isVerifiedIssuer)
  const normals = useStore((s) => s.normals)
  const virtuals = useStore((s) => s.virtuals)
  const groups = useStore((s) => s.groups)
  const virtual = useStore((s) => s.virtual)
  const groupRecipients = useStore((s) => s.groupRecipients)
  const canCommunicate = useStore((s) => s.canCommunicate)

  const [assessKey, setAssessKey] = useState<TransactionKey | null>(null)
  const [demoKey, setDemoKey] = useState<TransactionKey | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [issueOpen, setIssueOpen] = useState(false)

  const meKey = active ? actorKey(active) : ''

  const toolTx = TRANSACTIONS.filter((tx) => tx.area === 'tools')
  // Credential/trust tools get their own section; keep them out of the generic list.
  const CRED_KEYS: TransactionKey[] = ['tool.wallet', 'tool.verifyCredential', 'tool.issueCredential', 'tool.requestToPay']
  const genericToolTx = toolTx.filter((tx) => !CRED_KEYS.includes(tx.key))
  const canIssue = !!active && can('tool.issueCredential') && isVerifiedIssuer(active)

  // Recipients + groups are scoped to the acting account's Directory.
  const dir = useDirectory()
  const recipientOptions = dir.people
  const pickerGroups = useMemo<PickerGroup[]>(
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

  function openTool(key: TransactionKey) {
    if (INTERACTIVE_TOOLS.includes(key)) setAssessKey(key)
    else setDemoKey(key)
  }

  const demoDef = demoKey ? toolTx.find((d) => d.key === demoKey) : undefined

  return (
    <div className="p-4 space-y-6 pb-8">
      {/* IDGate Code — embedded box at the top of the page */}
      <IDGateCodeCard />

      <div className="space-y-2">
        <SectionHeader title={t('supportingTools')} />
        <Card className="divide-y divide-slate-100 overflow-hidden">
          {/* Notification — the moved "Create Notification" composer. */}
          <Row
            onClick={() => setCreateOpen(true)}
            leading={
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <Bell size={16} />
              </div>
            }
            title={t('notificationTool')}
            trailing={
              <ChevronRight size={16} className={cx('text-slate-300', isRtl && 'rotate-180')} />
            }
          />
          {genericToolTx.map((def) => {
            const allowed = can(def.key)
            const interactive = INTERACTIVE_TOOLS.includes(def.key)
            const clickable = interactive ? allowed : true
            return (
              <Row
                key={def.key}
                onClick={clickable ? () => openTool(def.key) : undefined}
                className={cx(!clickable && 'opacity-60')}
                leading={
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <Info size={16} />
                  </div>
                }
                title={bl(def.label, lang)}
                trailing={
                  <ChevronRight size={16} className={cx('text-slate-300', isRtl && 'rotate-180')} />
                }
              />
            )
          })}
        </Card>
      </div>

      {/* Credentials & Trust (Strategy edition) */}
      <div className="space-y-2">
        <SectionHeader title={t('credentialsTrust')} />
        <Card className="divide-y divide-slate-100 overflow-hidden">
          <Row
            onClick={() => navigate('/tools/wallet')}
            leading={<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gate-50 text-gate-600"><WalletCards size={16} /></div>}
            title={t('wallet')}
            subtitle={t('walletDesc')}
            trailing={<ChevronRight size={16} className={cx('text-slate-300', isRtl && 'rotate-180')} />}
          />
          <Row
            onClick={() => navigate('/tools/verify')}
            leading={<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><ShieldCheck size={16} /></div>}
            title={t('verifyWithIdgate')}
            subtitle={t('verifyDesc')}
            trailing={<ChevronRight size={16} className={cx('text-slate-300', isRtl && 'rotate-180')} />}
          />
          {canIssue && (
            <Row
              onClick={() => setIssueOpen(true)}
              leading={<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><FilePlus2 size={16} /></div>}
              title={t('issueCredential')}
              subtitle={t('issueCredentialDesc')}
              trailing={<ChevronRight size={16} className={cx('text-slate-300', isRtl && 'rotate-180')} />}
            />
          )}
        </Card>
      </div>

      {/* Demo-only info sheet */}
      <Sheet
        open={!!demoKey}        onClose={() => setDemoKey(null)}
        title={demoDef ? bl(demoDef.label, lang) : undefined}
        footer={
          <Button full variant="secondary" onClick={() => setDemoKey(null)}>
            {t('close')}
          </Button>
        }
      >
        <p className="text-sm text-slate-600">{t('demoNote')}</p>
      </Sheet>

      {/* Interactive assessment compose sheet */}
      <AssessmentComposeSheet
        toolKey={assessKey}
        onClose={() => setAssessKey(null)}
        options={recipientOptions}
        groups={pickerGroups}
        expandGroup={expandGroup}
        resolveName={(r) => resolve(r).displayName}
        resolveLabel={(r) => {
          const info = resolve(r)
          return info.address ? `${info.displayName} — ${info.address}` : info.displayName
        }}
        isRtl={isRtl}
        lang={lang}
        t={t}
        L={L}
      />

      {/* Create Notification composer (moved here from the Statements page) */}
      <CreateNotificationSheet open={createOpen} onClose={() => setCreateOpen(false)} />

      {/* Issue a verifiable credential */}
      <IssueCredentialSheet open={issueOpen} onClose={() => setIssueOpen(false)} />
    </div>
  )
}

// ── Valuation / Voting / Election compose sheet ────────────────────────────────
function AssessmentComposeSheet({
  toolKey,
  onClose,
  options,
  groups,
  expandGroup,
  resolveName,
  resolveLabel,
  isRtl,
  lang,
  t,
  L,
}: {
  toolKey: TransactionKey | null
  onClose: () => void
  options: ActorRef[]
  groups: PickerGroup[]
  expandGroup: (id: string) => ActorRef[]
  resolveName: (r: ActorRef) => string
  resolveLabel: (r: ActorRef) => string
  isRtl: boolean
  lang: 'en' | 'ar'
  t: (k: string) => string
  L: (en: string, ar: string) => string
}) {
  const createNotification = useStore((s) => s.createNotification)

  const [evalType, setEvalType] = useState<EvalType | ''>('')
  const [toRefs, setToRefs] = useState<ActorRef[]>([])
  const [toGroups, setToGroups] = useState<string[]>([])
  const [subject, setSubject] = useState('')
  const [ballot, setBallot] = useState<string[]>([''])
  const [targetDate, setTargetDate] = useState('')
  const [targetTime, setTargetTime] = useState('')

  const kind = toolKey ? ASSESSMENT_TOOL_KIND[toolKey] : undefined
  const typeOptions = toolKey ? ASSESSMENT_TYPE_OPTIONS[toolKey] ?? [] : []
  const isBallot = kind === 'voting' || kind === 'election'
  const ballotLabel = kind === 'election' ? EVAL_TYPE_LABELS[evalType || 'person'] : undefined

  const reset = () => {
    setEvalType('')
    setToRefs([])
    setToGroups([])
    setSubject('')
    setBallot([''])
    setTargetDate('')
    setTargetTime('')
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

  const cleanBallot = ballot.map((b) => b.trim()).filter(Boolean)
  const valid =
    !!evalType &&
    to.length > 0 &&
    (isBallot ? cleanBallot.length > 0 : subject.trim().length > 0) &&
    targetDate.length > 0 &&
    targetTime.length > 0

  const close = () => {
    reset()
    onClose()
  }

  const title = toolKey ? t(kind === 'valuation' ? 'valuation' : kind === 'voting' ? 'voting' : 'election') : undefined

  return (
    <Sheet
      open={!!toolKey}
      onClose={close}
      title={title}
      footer={
        <Button
          full
          disabled={!valid}
          onClick={() => {
            if (!kind || !evalType) return
            const envelope = isBallot
              ? cleanBallot.length === 1
                ? cleanBallot[0]
                : `${cleanBallot[0]} (+${cleanBallot.length - 1})`
              : subject.trim()
            createNotification({
              kind,
              to,
              subject: envelope,
              body: '',
              evalType,
              ballot: isBallot ? cleanBallot : undefined,
              targetDate: targetDate || undefined,
              targetTime: targetTime || undefined,
            })
            close()
          }}
        >
          <Send size={16} className="me-1.5" />
          {t('send')}
        </Button>
      }
    >
      <div className="space-y-4 py-2">
        <Field label={t('type')} required>
          <Select value={evalType} onChange={(e) => setEvalType(e.target.value as EvalType)}>
            <option value="">{L('Select type…', 'اختر النوع…')}</option>
            {typeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {bl(EVAL_TYPE_LABELS[opt], lang)}
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

        {isBallot ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-700">
                {ballotLabel ? bl(ballotLabel, lang) : t('subject')}
              </span>
              <span className="text-rose-500">*</span>
            </div>
            {ballot.map((line, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={line}
                  onChange={(e) => setBallot((prev) => prev.map((x, idx) => (idx === i ? e.target.value : x)))}
                  className="flex-1"
                />
                {ballot.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setBallot((prev) => prev.filter((_, idx) => idx !== i))}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-rose-500"
                    aria-label={L('Remove', 'إزالة')}
                  >
                    <XIcon size={15} />
                  </button>
                )}
              </div>
            ))}
            <Button size="sm" variant="secondary" onClick={() => setBallot((prev) => [...prev, ''])}>
              <Plus size={14} className="me-1" />
              {t('addSubject')}
            </Button>
          </div>
        ) : (
          <Field label={t('subject')} required>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </Field>
        )}

        <Field label={t('targetDate')} required>
          <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </Field>
        <Field label={t('targetTime')} required>
          <Input type="time" value={targetTime} onChange={(e) => setTargetTime(e.target.value)} />
        </Field>
      </div>
    </Sheet>
  )
}
