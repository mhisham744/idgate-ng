import type {
  Country,
  Industry,
  LegalEntityType,
  NoteKind,
  OrgLevel,
  OrgType,
  RatingKey,
  StructureKind,
  TransactionKey,
  AppArea,
} from '@/types'

/** Bilingual label. */
export interface BL {
  en: string
  ar: string
}

// ── Internal-code building blocks (country dial code + city code + sequence) ────
/** International dial codes per country — first part of a personal internal code. */
export const COUNTRY_DIAL: Record<Country, string> = {
  Egypt: '20',
  USA: '1',
  France: '33',
  Germany: '49',
  India: '91',
}

/** Known city codes; unknown cities fall back to the first three letters uppercased. */
export const CITY_CODE: Record<string, string> = {
  Cairo: 'CAI',
  Giza: 'GIZ',
  Alexandria: 'ALX',
  'New Jersey': 'NJ',
  'New York': 'NYC',
  Geneva: 'GVA',
  Paris: 'PAR',
  Berlin: 'BER',
  Mumbai: 'BOM',
}

export function cityCode(city: string): string {
  const key = (city || '').trim()
  return CITY_CODE[key] ?? (key ? key.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'XXX' : 'XXX')
}

/** Build a personal internal code: `<dial>-<city>-<6-digit sequence>` (e.g. 20-CAI-000123). */
export function makeInternalCode(country: Country, city: string, seq: number): string {
  return `${COUNTRY_DIAL[country] ?? '0'}-${cityCode(city)}-${String(seq).padStart(6, '0')}`
}

export const ORG_TYPE_LABELS: Record<OrgType, BL> = {
  Com: { en: 'Company', ar: 'شركة' },
  Uni: { en: 'University', ar: 'جامعة' },
  Sch: { en: 'School', ar: 'مدرسة' },
  REs: { en: 'Residential', ar: 'سكني' },
  Clb: { en: 'Club', ar: 'نادٍ' },
  Fac: { en: 'Faculty', ar: 'كلية' },
  Bank: { en: 'Bank', ar: 'بنك' },
  Fin: { en: 'Financial', ar: 'مالية' },
  Shp: { en: 'Shop', ar: 'متجر' },
  Gov: { en: 'Governmental', ar: 'حكومي' },
}

export const LEGAL_TYPE_LABELS: Record<LegalEntityType, BL> = {
  LLC: { en: 'Limited Liability Co.', ar: 'شركة ذات مسؤولية محدودة' },
  JSC: { en: 'Joint Stock Co.', ar: 'شركة مساهمة' },
  OPC: { en: 'One Person Co.', ar: 'شركة الشخص الواحد' },
  SPS: { en: 'Sole Proprietorship', ar: 'منشأة فردية' },
  GPS: { en: 'General Partnership', ar: 'شركة تضامن' },
  PLS: { en: 'Limited Partnership', ar: 'توصية بسيطة' },
  BFC: { en: 'Branch of Foreign Co.', ar: 'فرع شركة أجنبية' },
  FCBO: { en: 'Foreign Co. Branch Office', ar: 'مكتب تمثيل أجنبي' },
  REO: { en: 'Representative Office', ar: 'مكتب تمثيل' },
  NON: { en: 'Non-formal / Unregistered', ar: 'غير رسمي' },
}

export const ORG_LEVEL_LABELS: Record<OrgLevel, BL> = {
  Holding: { en: 'Holding', ar: 'قابضة' },
  Individual: { en: 'Individual', ar: 'مستقلة' },
  Branch: { en: 'Branch', ar: 'فرع' },
}

export const INDUSTRY_LABELS: Record<Industry, BL> = {
  Manufacturing: { en: 'Manufacturing', ar: 'تصنيع' },
  Education: { en: 'Education', ar: 'تعليم' },
  Energy: { en: 'Energy', ar: 'طاقة' },
  IT: { en: 'IT', ar: 'تقنية معلومات' },
  Sports: { en: 'Sports', ar: 'رياضة' },
  Governmental: { en: 'Governmental', ar: 'حكومي' },
  Finance: { en: 'Finance', ar: 'مالية' },
}

export const STRUCTURE_LABELS: Record<StructureKind, BL> = {
  corporate: { en: 'Corporate Structure', ar: 'الهيكل المؤسسي' },
  relation: { en: 'Relation Structure', ar: 'هيكل العلاقات' },
  organization: { en: 'Organization Structure', ar: 'الهيكل التنظيمي' },
  geographical: { en: 'Geographical Structure', ar: 'الهيكل الجغرافي' },
}

export const APP_AREA_LABELS: Record<AppArea, BL> = {
  home: { en: 'Home', ar: 'الرئيسية' },
  messages: { en: 'Messages', ar: 'الرسائل' },
  notification: { en: 'Statements', ar: 'الإفادات' },
  tools: { en: 'Tools', ar: 'الأدوات' },
  settings: { en: 'Settings', ar: 'الإعدادات' },
}

export const NOTE_KIND_LABELS: Record<NoteKind, BL> = {
  task: { en: 'Task Note', ar: 'مهمة' },
  calendar: { en: 'Calendar Note', ar: 'موعد' },
  offer: { en: 'Offer Note', ar: 'عرض' },
  voting: { en: 'Voting', ar: 'تصويت' },
  event: { en: 'Event', ar: 'حدث' },
  training: { en: 'Training / Course', ar: 'تدريب' },
  tender: { en: 'Tender / Purchase order', ar: 'مناقصة / أمر شراء' },
  complaint: { en: 'Complaint Note', ar: 'شكوى' },
  idgate: { en: 'IDGate Note', ar: 'ملاحظة' },
  meeting: { en: 'Meeting Request', ar: 'طلب اجتماع' },
  conference: { en: 'Conference Call', ar: 'مكالمة جماعية' },
  valuation: { en: 'Valuation', ar: 'تقييم' },
  election: { en: 'Election', ar: 'انتخاب' },
  other: { en: 'Other Note', ar: 'أخرى' },
}

/** "Still under development…" note shown on postponed/demo-only tools. */
export const DEMO_NOTE: BL = {
  en: 'Still under development and displayed as a demo for illustrative only.',
  ar: 'لا يزال قيد التطوير ويُعرض كنموذج توضيحي فقط.',
}

/** Rating scale for a Valuation note's recipient reaction (worst → best). */
export const RATING_LABELS: Record<RatingKey, BL> = {
  nill: { en: 'Nill', ar: 'لا شيء' },
  low: { en: 'Low', ar: 'منخفض' },
  belowAverage: { en: 'Below average', ar: 'أقل من المتوسط' },
  average: { en: 'Average', ar: 'متوسط' },
  aboveAverage: { en: 'Above average', ar: 'أعلى من المتوسط' },
  good: { en: 'Good', ar: 'جيد' },
  veryGood: { en: 'Very good', ar: 'جيد جدًا' },
  perfect: { en: 'Perfect', ar: 'ممتاز' },
  excellent: { en: 'Excellent', ar: 'رائع' },
  outstanding: { en: 'Outstanding', ar: 'متميز' },
}

/** Order of the rating scale for dropdowns. */
export const RATING_ORDER: RatingKey[] = [
  'nill',
  'low',
  'belowAverage',
  'average',
  'aboveAverage',
  'good',
  'veryGood',
  'perfect',
  'excellent',
  'outstanding',
]

/** "Type" field options for assessment tools. */
export type EvalType = 'subject' | 'event' | 'performance' | 'person' | 'organization'

export const EVAL_TYPE_LABELS: Record<EvalType, BL> = {
  subject: { en: 'Subject', ar: 'موضوع' },
  event: { en: 'Event', ar: 'حدث' },
  performance: { en: 'Performance', ar: 'أداء' },
  person: { en: 'Person', ar: 'شخص' },
  organization: { en: 'Organization', ar: 'منظمة' },
}

/** Assessment tools (valuation/voting/election) and the Type options each offers. */
export const ASSESSMENT_TYPE_OPTIONS: Partial<Record<TransactionKey, EvalType[]>> = {
  'tool.valuation': ['subject', 'event', 'performance'],
  'tool.voting': ['subject', 'event', 'performance'],
  'tool.election': ['person', 'organization'],
}

/** Maps an assessment tool key to the note kind it creates. */
export const ASSESSMENT_TOOL_KIND: Partial<Record<TransactionKey, NoteKind>> = {
  'tool.valuation': 'valuation',
  'tool.voting': 'voting',
  'tool.election': 'election',
}

/** Fully-interactive tools (open a compose sheet); every other tools row is demo-only. */
export const INTERACTIVE_TOOLS: TransactionKey[] = ['tool.valuation', 'tool.voting', 'tool.election']

/** Notification kinds that require an accept/reject/clarify/complete/close cycle. */
export const RESPONSE_NOTE_KINDS: NoteKind[] = [
  'task',
  'calendar',
  'offer',
  'voting',
  'event',
  'training',
  'tender',
  'meeting',
  'conference',
  'valuation',
  'election',
]

// ─────────────────────────────────────────────────────────────────────────────
// Transaction catalog — grouped by app area. Order mirrors the workbook.
// ─────────────────────────────────────────────────────────────────────────────

export interface TxDef {
  key: TransactionKey
  area: AppArea
  label: BL
  /** Whether a plain natural-person personal account may CREATE this (per the Test-Normal sheet). */
  personalCanCreate: boolean
  note?: BL
}

export const TRANSACTIONS: TxDef[] = [
  // Home
  { key: 'post.send', area: 'home', label: { en: 'Send New Post', ar: 'نشر منشور' }, personalCanCreate: true },
  { key: 'post.react', area: 'home', label: { en: 'Reaction', ar: 'تفاعل' }, personalCanCreate: true },
  { key: 'post.comment', area: 'home', label: { en: 'Comment', ar: 'تعليق' }, personalCanCreate: true },
  { key: 'post.forward', area: 'home', label: { en: 'Forward', ar: 'إعادة توجيه' }, personalCanCreate: true },
  { key: 'post.save', area: 'home', label: { en: 'Save', ar: 'حفظ' }, personalCanCreate: true },
  { key: 'post.follow', area: 'home', label: { en: 'Follow', ar: 'متابعة' }, personalCanCreate: true },
  // Messages
  { key: 'msg.send', area: 'messages', label: { en: 'Send New Message', ar: 'رسالة جديدة' }, personalCanCreate: true },
  { key: 'msg.reply', area: 'messages', label: { en: 'Reply', ar: 'رد' }, personalCanCreate: true },
  { key: 'msg.replyAll', area: 'messages', label: { en: 'Reply to All', ar: 'رد على الجميع' }, personalCanCreate: true },
  { key: 'msg.forward', area: 'messages', label: { en: 'Forward', ar: 'إعادة توجيه' }, personalCanCreate: true },
  { key: 'msg.delete', area: 'messages', label: { en: 'Delete', ar: 'حذف' }, personalCanCreate: false },
  { key: 'msg.save', area: 'messages', label: { en: 'Save', ar: 'حفظ' }, personalCanCreate: true },
  // Notification tools — personal can RECEIVE only, not create
  { key: 'note.task', area: 'notification', label: NOTE_KIND_LABELS.task, personalCanCreate: false, note: { en: 'To-Do list / duties. Awaits accept/reject/clarify/complete/close.', ar: 'قائمة مهام. تحتاج قبول/رفض/توضيح/إنهاء/إغلاق.' } },
  { key: 'note.calendar', area: 'notification', label: NOTE_KIND_LABELS.calendar, personalCanCreate: false, note: { en: 'Appointment booking (e.g. a doctor scheduling patients).', ar: 'حجز موعد.' } },
  { key: 'note.offer', area: 'notification', label: NOTE_KIND_LABELS.offer, personalCanCreate: false },
  { key: 'note.voting', area: 'notification', label: NOTE_KIND_LABELS.voting, personalCanCreate: false, note: { en: 'General assembly / board resolution voting.', ar: 'تصويت جمعية عمومية / مجلس إدارة.' } },
  { key: 'note.event', area: 'notification', label: NOTE_KIND_LABELS.event, personalCanCreate: false },
  { key: 'note.training', area: 'notification', label: NOTE_KIND_LABELS.training, personalCanCreate: false },
  { key: 'note.tender', area: 'notification', label: NOTE_KIND_LABELS.tender, personalCanCreate: false },
  { key: 'note.other', area: 'notification', label: NOTE_KIND_LABELS.other, personalCanCreate: false },
  // Tools — IDGate Code is now the embedded box at the top of the Tools page (not a list row).
  // Contact Request / Delegation Display / Link Request moved to Settings.
  // Interactive assessment tools:
  { key: 'tool.valuation', area: 'tools', label: NOTE_KIND_LABELS.valuation, personalCanCreate: true, note: { en: 'Rate a subject, event or performance — the recipient picks a rating and closes.', ar: 'قيّم موضوعًا أو حدثًا أو أداءً — يختار المستلم تقييمًا ثم يغلق.' } },
  { key: 'tool.voting', area: 'tools', label: NOTE_KIND_LABELS.voting, personalCanCreate: true, note: { en: 'Agree/disagree ballot over one or more subjects.', ar: 'تصويت بالموافقة/الرفض على موضوع أو أكثر.' } },
  { key: 'tool.election', area: 'tools', label: NOTE_KIND_LABELS.election, personalCanCreate: true, note: { en: 'Agree/disagree ballot over one or more persons or organizations.', ar: 'تصويت بالموافقة/الرفض على أشخاص أو منظمات.' } },
  // Postponed / demo-only tools:
  { key: 'tool.idgatePass', area: 'tools', label: { en: 'IDGate Pass', ar: 'تصريح IDGate' }, personalCanCreate: false, note: DEMO_NOTE },
  { key: 'tool.idgateNote', area: 'tools', label: NOTE_KIND_LABELS.idgate, personalCanCreate: false, note: DEMO_NOTE },
  { key: 'tool.complaint', area: 'tools', label: NOTE_KIND_LABELS.complaint, personalCanCreate: false, note: DEMO_NOTE },
  { key: 'tool.meeting', area: 'tools', label: NOTE_KIND_LABELS.meeting, personalCanCreate: false, note: DEMO_NOTE },
  { key: 'tool.conference', area: 'tools', label: NOTE_KIND_LABELS.conference, personalCanCreate: false, note: DEMO_NOTE },
  { key: 'tool.createVacancy', area: 'tools', label: { en: 'Create Vacancy', ar: 'نشر وظيفة' }, personalCanCreate: false, note: DEMO_NOTE },
  { key: 'tool.displayVacancy', area: 'tools', label: { en: 'Find Vacancy', ar: 'البحث عن وظائف' }, personalCanCreate: false, note: DEMO_NOTE },
  { key: 'tool.talentAcquisition', area: 'tools', label: { en: 'Talent Acquisition', ar: 'استقطاب المواهب' }, personalCanCreate: false, note: DEMO_NOTE },
  { key: 'tool.advertising', area: 'tools', label: { en: 'Advertising', ar: 'إعلان' }, personalCanCreate: false, note: DEMO_NOTE },
  { key: 'tool.publishing', area: 'tools', label: { en: 'Publishing Note', ar: 'نشر خبر' }, personalCanCreate: false, note: DEMO_NOTE },
  { key: 'tool.location', area: 'tools', label: { en: 'Location', ar: 'الموقع' }, personalCanCreate: false, note: DEMO_NOTE },
  { key: 'tool.camera', area: 'tools', label: { en: 'Camera', ar: 'الكاميرا' }, personalCanCreate: false, note: DEMO_NOTE },
  { key: 'tool.videos', area: 'tools', label: { en: 'Videos', ar: 'الفيديوهات' }, personalCanCreate: false, note: DEMO_NOTE },
  { key: 'tool.calculator', area: 'tools', label: { en: 'Calculator', ar: 'الآلة الحاسبة' }, personalCanCreate: false, note: DEMO_NOTE },
  { key: 'tool.converter', area: 'tools', label: { en: 'Converter', ar: 'المحوّل' }, personalCanCreate: false, note: DEMO_NOTE },
]

/** All transaction keys that a Profile editor can grant. Admin + feature transactions. */
export const PROFILE_GRANTABLE: TransactionKey[] = [
  ...TRANSACTIONS.map((t) => t.key),
  'admin.createVirtualAccount',
  'admin.changeVirtualAccount',
  'admin.deleteVirtualAccount',
  'admin.createLinkRequest',
  'admin.acceptLinkRequest',
  'admin.createGroupNormal',
  'admin.createGroupVirtual',
]

export const ADMIN_TX_LABELS: Partial<Record<TransactionKey, BL>> = {
  'admin.createVirtualAccount': { en: 'Create Virtual Account', ar: 'إنشاء حساب افتراضي' },
  'admin.changeVirtualAccount': { en: 'Change Virtual Account', ar: 'تعديل حساب افتراضي' },
  'admin.deleteVirtualAccount': { en: 'Delete Virtual Account', ar: 'حذف حساب افتراضي' },
  'admin.createLinkRequest': { en: 'Create Link Request', ar: 'إنشاء طلب ربط' },
  'admin.acceptLinkRequest': { en: 'Accept Link Request', ar: 'قبول طلب ربط' },
  'admin.createGroupNormal': { en: 'Create Group (Normal)', ar: 'إنشاء مجموعة أفراد' },
  'admin.createGroupVirtual': { en: 'Create Group (Virtual)', ar: 'إنشاء مجموعة افتراضية' },
}

export function txLabel(key: TransactionKey): BL {
  return TRANSACTIONS.find((t) => t.key === key)?.label ?? ADMIN_TX_LABELS[key] ?? { en: key, ar: key }
}
