import type {
  Industry,
  LegalEntityType,
  NoteKind,
  OrgLevel,
  OrgType,
  StructureKind,
  TransactionKey,
  AppArea,
} from '@/types'

/** Bilingual label. */
export interface BL {
  en: string
  ar: string
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
  notification: { en: 'Notifications', ar: 'التنبيهات' },
  tools: { en: 'Tools', ar: 'الأدوات' },
  settings: { en: 'Settings', ar: 'الإعدادات' },
}

export const NOTE_KIND_LABELS: Record<NoteKind, BL> = {
  task: { en: 'Task Note', ar: 'مهمة' },
  calendar: { en: 'Calendar Note', ar: 'موعد' },
  offer: { en: 'Offer Note', ar: 'عرض' },
  voting: { en: 'Voting Note', ar: 'تصويت' },
  event: { en: 'Event', ar: 'حدث' },
  training: { en: 'Training / Course', ar: 'تدريب' },
  tender: { en: 'Tender', ar: 'مناقصة' },
  complaint: { en: 'Complaint Note', ar: 'شكوى' },
  idgate: { en: 'IDGate Note', ar: 'ملاحظة' },
  meeting: { en: 'Meeting Request', ar: 'طلب اجتماع' },
  conference: { en: 'Conference Call', ar: 'مكالمة جماعية' },
  other: { en: 'Other Note', ar: 'أخرى' },
}

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
  // Tools
  { key: 'tool.idgateCode', area: 'tools', label: { en: 'IDGate Code', ar: 'كود IDGate' }, personalCanCreate: false, note: { en: 'QR badge — membership / employee code to enter a company, club, course or compound.', ar: 'كود QR كبطاقة عضوية/موظف للدخول.' } },
  { key: 'tool.idgatePass', area: 'tools', label: { en: 'IDGate Pass', ar: 'تصريح IDGate' }, personalCanCreate: false },
  { key: 'tool.idgateNote', area: 'tools', label: NOTE_KIND_LABELS.idgate, personalCanCreate: false, note: { en: 'One-way note, no reply needed.', ar: 'ملاحظة لا تحتاج رد.' } },
  { key: 'tool.complaint', area: 'tools', label: NOTE_KIND_LABELS.complaint, personalCanCreate: false },
  { key: 'tool.meeting', area: 'tools', label: NOTE_KIND_LABELS.meeting, personalCanCreate: true },
  { key: 'tool.conference', area: 'tools', label: NOTE_KIND_LABELS.conference, personalCanCreate: true },
  { key: 'tool.contactRequest', area: 'tools', label: { en: 'Contact Request', ar: 'طلب تواصل' }, personalCanCreate: true },
  { key: 'tool.delegationDisplay', area: 'tools', label: { en: 'Delegation Display Request', ar: 'طلب عرض صلاحيات' }, personalCanCreate: true },
  { key: 'tool.linkRequest', area: 'tools', label: { en: 'Link Request', ar: 'طلب ربط' }, personalCanCreate: true },
  { key: 'tool.createVacancy', area: 'tools', label: { en: 'Create Vacancy', ar: 'نشر وظيفة' }, personalCanCreate: false },
  { key: 'tool.displayVacancy', area: 'tools', label: { en: 'Find Vacancies', ar: 'البحث عن وظائف' }, personalCanCreate: true },
  { key: 'tool.talentAcquisition', area: 'tools', label: { en: 'Talent Acquisition', ar: 'استقطاب المواهب' }, personalCanCreate: false },
  { key: 'tool.advertising', area: 'tools', label: { en: 'Advertising', ar: 'إعلان' }, personalCanCreate: false },
  { key: 'tool.publishing', area: 'tools', label: { en: 'Publishing Note', ar: 'نشر خبر' }, personalCanCreate: false },
  { key: 'tool.valuation', area: 'tools', label: { en: 'Valuation', ar: 'تقييم' }, personalCanCreate: false },
  { key: 'tool.location', area: 'tools', label: { en: 'Location', ar: 'الموقع' }, personalCanCreate: true },
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
