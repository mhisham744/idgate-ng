import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Lang = 'en' | 'ar'

type Dict = Record<string, { en: string; ar: string }>

/** UI string table. Domain data (org/position names) stays as authored in seed. */
export const STRINGS: Dict = {
  appName: { en: 'IDGate', ar: 'IDGate' },
  tagline: { en: 'Identity Gate', ar: 'بوابة الهوية' },
  subtitle: {
    en: 'One identity. Every role. Official communication.',
    ar: 'هوية واحدة. كل الصفات. تواصل رسمي.',
  },

  // nav / areas
  home: { en: 'Home', ar: 'الرئيسية' },
  messages: { en: 'Messages', ar: 'الرسائل' },
  notification: { en: 'Statements', ar: 'الإفادات' },
  tools: { en: 'Tools', ar: 'الأدوات' },
  settings: { en: 'Settings', ar: 'الإعدادات' },
  directory: { en: 'Directory', ar: 'الدليل' },

  // account switcher
  switchAccount: { en: 'Switch Account', ar: 'تبديل الحساب' },
  personalAccount: { en: 'Personal Account', ar: 'الحساب الشخصي' },
  actingAs: { en: 'Acting as', ar: 'تعمل بصفة' },
  yourAccounts: { en: 'Your accounts', ar: 'حساباتك' },
  virtualAccounts: { en: 'Virtual identities', ar: 'الشخصيات الافتراضية' },
  active: { en: 'Active', ar: 'نشط' },
  inactive: { en: 'Inactive', ar: 'غير نشط' },
  blocked: { en: 'Blocked', ar: 'محظور' },

  // generic
  create: { en: 'Create', ar: 'إنشاء' },
  change: { en: 'Change', ar: 'تعديل' },
  display: { en: 'Display', ar: 'عرض' },
  delete: { en: 'Delete', ar: 'حذف' },
  save: { en: 'Save', ar: 'حفظ' },
  cancel: { en: 'Cancel', ar: 'إلغاء' },
  next: { en: 'Next', ar: 'التالي' },
  back: { en: 'Back', ar: 'رجوع' },
  done: { en: 'Done', ar: 'تم' },
  send: { en: 'Send', ar: 'إرسال' },
  search: { en: 'Search', ar: 'بحث' },
  close: { en: 'Close', ar: 'إغلاق' },
  open: { en: 'Open', ar: 'مفتوح' },
  yes: { en: 'Yes', ar: 'نعم' },
  no: { en: 'No', ar: 'لا' },
  optional: { en: 'optional', ar: 'اختياري' },
  required: { en: 'required', ar: 'إلزامي' },
  add: { en: 'Add', ar: 'إضافة' },
  select: { en: 'Select', ar: 'اختيار' },
  members: { en: 'members', ar: 'أعضاء' },
  empty: { en: 'Nothing here yet.', ar: 'لا يوجد شيء هنا بعد.' },

  // onboarding
  signIn: { en: 'Enter as', ar: 'ادخل باسم' },
  chooseIdentity: { en: 'Choose a natural person to sign in', ar: 'اختر شخصية طبيعية لتسجيل الدخول' },
  enterApp: { en: 'Enter IDGate', ar: 'ادخل IDGate' },

  // home
  newPost: { en: 'Share an update', ar: 'شارك تحديثًا' },
  feed: { en: 'Feed', ar: 'التغذية' },
  comment: { en: 'Comment', ar: 'تعليق' },
  comments: { en: 'Comments', ar: 'التعليقات' },
  forward: { en: 'Forward', ar: 'توجيه' },
  follow: { en: 'Follow', ar: 'متابعة' },
  writePost: { en: "What's happening?", ar: 'بماذا تفكر؟' },
  writeComment: { en: 'Write a comment…', ar: 'اكتب تعليقًا…' },

  // messages
  newMessage: { en: 'New Message', ar: 'رسالة جديدة' },
  to: { en: 'To', ar: 'إلى' },
  cc: { en: 'Cc', ar: 'نسخة' },
  bcc: { en: 'Bcc', ar: 'نسخة مخفية' },
  subject: { en: 'Subject', ar: 'الموضوع' },
  body: { en: 'Message', ar: 'النص' },
  reply: { en: 'Reply', ar: 'رد' },
  replyAll: { en: 'Reply all', ar: 'رد على الكل' },
  inbox: { en: 'Inbox', ar: 'الوارد' },
  attach: { en: 'Attach', ar: 'إرفاق' },
  attachments: { en: 'Attachments', ar: 'المرفقات' },
  from: { en: 'From', ar: 'من' },
  communications: { en: 'messages', ar: 'رسائل' },
  searchRecipients: { en: 'Search people or groups…', ar: 'ابحث عن أشخاص أو مجموعات…' },
  searchSubject: { en: 'Search by subject…', ar: 'ابحث بالموضوع…' },

  // status bar / presence
  calendar: { en: 'Calendar', ar: 'التقويم' },
  status: { en: 'Status', ar: 'الحالة' },
  duties: { en: 'Duties', ar: 'الواجبات' },
  unread: { en: 'Unread', ar: 'غير مقروء' },
  noUnread: { en: 'Nothing unread.', ar: 'لا يوجد غير مقروء.' },
  presenceActive: { en: 'Active', ar: 'متاح' },
  presenceBusy: { en: 'Busy', ar: 'مشغول' },
  presenceAway: { en: 'Away', ar: 'بعيد' },
  presenceClosed: { en: 'Closed', ar: 'مغلق' },
  noDayItems: { en: 'Nothing on this day.', ar: 'لا شيء في هذا اليوم.' },

  // notifications
  createNotification: { en: 'Create Notification', ar: 'إنشاء تنبيه' },
  pending: { en: 'Pending', ar: 'قيد الانتظار' },
  accept: { en: 'Accept', ar: 'قبول' },
  reject: { en: 'Reject', ar: 'رفض' },
  clarify: { en: 'Clarify', ar: 'توضيح' },
  complete: { en: 'Complete', ar: 'إنهاء' },
  closed: { en: 'Closed', ar: 'مغلق' },
  vote: { en: 'Vote', ar: 'تصويت' },
  type: { en: 'Type', ar: 'النوع' },
  targetDate: { en: 'Target date', ar: 'التاريخ المستهدف' },
  targetTime: { en: 'Target time', ar: 'الوقت المستهدف' },
  targetVenue: { en: 'Target venue', ar: 'المكان' },
  sent: { en: 'Sent', ar: 'مُرسَل' },
  received: { en: 'Received', ar: 'وارد' },
  freeze: { en: 'Freeze', ar: 'تجميد' },
  frozen: { en: 'Frozen', ar: 'مُجمّد' },
  editNote: { en: 'Edit note', ar: 'تعديل التنبيه' },
  conversation: { en: 'Conversation', ar: 'المحادثة' },
  replyToClarification: { en: 'Reply…', ar: 'رد…' },
  clarifyHint: { en: 'Explain in ≤20 words', ar: 'وضّح في 20 كلمة أو أقل' },
  searchNotifications: { en: 'Search by subject…', ar: 'ابحث بالموضوع…' },
  addAttachment: { en: 'Attach file', ar: 'إرفاق ملف' },
  needsResponse: { en: 'Awaiting response', ar: 'بانتظار الرد' },
  noPermission: {
    en: 'Your active identity is not authorized to create this. Switch to a role whose profile grants it.',
    ar: 'صفتك الحالية غير مخوّلة بإنشاء هذا. بدّل إلى صفة يمنحها بروفايلها.',
  },
  canReceiveOnly: { en: 'Receive only', ar: 'استقبال فقط' },

  // tools
  idgateCode: { en: 'IDGate Code', ar: 'كود IDGate' },
  idgateCodeDesc: {
    en: 'Your QR identity badge — use it as a membership or employee code at the gate.',
    ar: 'بطاقة هويتك QR — استخدمها ككود عضوية أو موظف عند البوابة.',
  },
  scanToVerify: { en: 'Scan to verify identity', ar: 'امسح للتحقق من الهوية' },
  vacancies: { en: 'Vacancies', ar: 'الوظائف' },
  postVacancy: { en: 'Post a Vacancy', ar: 'نشر وظيفة' },
  apply: { en: 'Apply', ar: 'تقديم' },
  applied: { en: 'Applied', ar: 'تم التقديم' },
  groups: { en: 'Groups', ar: 'المجموعات' },
  createGroup: { en: 'Create Group', ar: 'إنشاء مجموعة' },

  // tools — assessment & moved/demo tools
  valuation: { en: 'Valuation', ar: 'تقييم' },
  voting: { en: 'Voting', ar: 'تصويت' },
  election: { en: 'Election', ar: 'انتخاب' },
  supportingTools: { en: 'Supporting tools', ar: 'أدوات مساندة' },
  demoNote: {
    en: 'Still under development and displayed as a demo for illustrative only.',
    ar: 'لا يزال قيد التطوير ويُعرض كنموذج توضيحي فقط.',
  },
  ratingScale: { en: 'Rating scale', ar: 'مقياس التقييم' },
  agree: { en: 'Agree', ar: 'موافق' },
  disagree: { en: 'Disagree', ar: 'غير موافق' },
  addSubject: { en: 'Add subject', ar: 'إضافة موضوع' },
  results: { en: 'Results', ar: 'النتائج' },
  contactRequest: { en: 'Contact Request', ar: 'طلب تواصل' },
  delegationDisplay: { en: 'Delegation Display Request', ar: 'طلب عرض صلاحيات' },

  // settings / master data
  masterData: { en: 'Master Data', ar: 'البيانات الأساسية' },
  personalMasterData: { en: 'Personal Account', ar: 'الحساب الشخصي' },
  myEntities: { en: 'My Organizations', ar: 'مؤسساتي' },
  registerEntity: { en: 'Register an Organization', ar: 'تسجيل مؤسسة' },
  orgSetup: { en: 'Organization Setup', ar: 'إعداد المؤسسة' },
  communicationStructure: { en: 'Communication Structure', ar: 'هيكل التواصل' },
  authorization: { en: 'Authorization Profiles', ar: 'بروفايلات الصلاحيات' },
  positions: { en: 'Positions', ar: 'الوظائف' },
  virtualAccountsMd: { en: 'Virtual Accounts', ar: 'الحسابات الافتراضية' },
  language: { en: 'Language', ar: 'اللغة' },
  aboutConcept: { en: 'About the concept', ar: 'عن الفكرة' },
  simulation: { en: 'Guided Simulation', ar: 'محاكاة إرشادية' },
  logout: { en: 'Sign out', ar: 'تسجيل الخروج' },

  // entity / linking
  linkRequest: { en: 'Link Request', ar: 'طلب ربط' },
  link: { en: 'Link', ar: 'ربط' },
  unlink: { en: 'Unlink', ar: 'فك الربط' },
  linkedTo: { en: 'Linked to', ar: 'مرتبط بـ' },
  unlinked: { en: 'Unlinked (dormant)', ar: 'غير مرتبط (خامل)' },
  block: { en: 'Block', ar: 'حظر' },
  entityStatusDraft: { en: 'Draft', ar: 'مسودة' },
  entityStatusPending: { en: 'Pending verification', ar: 'قيد التحقق' },
  entityStatusActive: { en: 'Active', ar: 'مفعّل' },
  activate: { en: 'Verify & Activate', ar: 'تحقق وتفعيل' },

  // ── Final-test additions ──────────────────────────────────────────────────────
  // home — reactions, images, identity photo
  react: { en: 'React', ar: 'تفاعل' },
  reactLike: { en: 'Like', ar: 'إعجاب' },
  reactDislike: { en: 'Dislike', ar: 'عدم إعجاب' },
  reactHappy: { en: 'Happy', ar: 'سعيد' },
  reactSad: { en: 'Sad', ar: 'حزين' },
  addImage: { en: 'Add image', ar: 'إضافة صورة' },
  removeImage: { en: 'Remove image', ar: 'إزالة الصورة' },
  addPhoto: { en: 'Add photo', ar: 'إضافة صورة' },
  photo: { en: 'Photo', ar: 'صورة' },

  // messages — folders, star, labels, drafts, move, search
  allMessages: { en: 'All messages', ar: 'كل الرسائل' },
  starred: { en: 'Starred', ar: 'المميّزة' },
  drafts: { en: 'Drafts', ar: 'المسودات' },
  draft: { en: 'Draft', ar: 'مسودة' },
  labels: { en: 'Labels', ar: 'التصنيفات' },
  star: { en: 'Star', ar: 'تمييز بنجمة' },
  unstar: { en: 'Unstar', ar: 'إلغاء التمييز' },
  move: { en: 'Move', ar: 'نقل' },
  moveToLabel: { en: 'Move to label', ar: 'نقل إلى تصنيف' },
  newLabel: { en: 'New label', ar: 'تصنيف جديد' },
  labelName: { en: 'Label name', ar: 'اسم التصنيف' },
  parentLabel: { en: 'Parent label', ar: 'التصنيف الأعلى' },
  noLabels: { en: 'No labels yet.', ar: 'لا توجد تصنيفات بعد.' },
  saveDraft: { en: 'Save draft', ar: 'حفظ كمسودة' },
  advancedSearch: { en: 'Advanced search', ar: 'بحث متقدم' },
  searchFrom: { en: 'From', ar: 'من' },
  searchTo: { en: 'To', ar: 'إلى' },
  dateFrom: { en: 'From date', ar: 'من تاريخ' },
  dateTo: { en: 'To date', ar: 'إلى تاريخ' },
  openAttachment: { en: 'Open', ar: 'فتح' },
  download: { en: 'Download', ar: 'تنزيل' },

  // statements (notifications) — folders, states, search, unfreeze
  statements: { en: 'Statements', ar: 'الإفادات' },
  accepted: { en: 'Accepted', ar: 'مقبول' },
  rejected: { en: 'Rejected', ar: 'مرفوض' },
  unfreeze: { en: 'Unfreeze', ar: 'إلغاء التجميد' },
  tool: { en: 'Tool', ar: 'الأداة' },
  toolType: { en: 'Tool type', ar: 'نوع الأداة' },
  notificationTool: { en: 'Notification', ar: 'تنبيه' },
  allItems: { en: 'All', ar: 'الكل' },

  // ── Master-data additions (personal account) ──────────────────────────────────
  middleName: { en: 'Middle name', ar: 'الاسم الأوسط' },
  firstName: { en: 'First name', ar: 'الاسم الأول' },
  surname: { en: 'Surname', ar: 'اسم العائلة' },
  gender: { en: 'Gender', ar: 'النوع' },
  nationality: { en: 'Nationality', ar: 'الجنسية' },
  nationality1: { en: 'Nationality 1', ar: 'الجنسية 1' },
  nationality2: { en: 'Nationality 2', ar: 'الجنسية 2' },
  nationality3: { en: 'Nationality 3', ar: 'الجنسية 3' },
  residenceCountry: { en: 'Residence country', ar: 'بلد الإقامة' },
  passport: { en: 'Passport #', ar: 'رقم جواز السفر' },
  address: { en: 'Address', ar: 'العنوان' },
  motherTongue: { en: 'Mother tongue', ar: 'اللغة الأم' },
  fluencyLevel: { en: 'Fluency level', ar: 'مستوى الإتقان' },
  language1: { en: 'Language 1', ar: 'اللغة 1' },
  language2: { en: 'Language 2', ar: 'اللغة 2' },
  levelBasic: { en: 'Basic', ar: 'مبتدئ' },
  levelAverage: { en: 'Average', ar: 'متوسط' },
  levelFluent: { en: 'Fluent', ar: 'متقن' },
  privacy: { en: 'Privacy', ar: 'الخصوصية' },
  privacyPersonal: { en: 'Personal info', ar: 'المعلومات الشخصية' },
  privacyContacts: { en: 'Contact info', ar: 'بيانات التواصل' },
  privacyEducation: { en: 'Education', ar: 'التعليم' },
  privacyCareer: { en: 'Career', ar: 'المهنة' },
  privacyPublic: { en: 'Public', ar: 'عام' },
  privacyContactsOnly: { en: 'Contacts', ar: 'جهات الاتصال' },
  privacyClosed: { en: 'Closed', ar: 'مغلق' },
  cv: { en: 'CV', ar: 'السيرة الذاتية' },
  attachCv: { en: 'Attach CV', ar: 'إرفاق السيرة الذاتية' },
  specialtiesSkills: { en: 'Specialties & Skills', ar: 'التخصصات والمهارات' },
  projectExperience: { en: 'Project Experience', ar: 'خبرات المشاريع' },
  trainingCertifications: { en: 'Training and Certifications', ar: 'التدريب والشهادات' },
  targetJob: { en: 'Target Job', ar: 'الوظيفة المستهدفة' },

  // ── Master-data additions (organization — virtual entities) ────────────────────
  virtualEntity: { en: 'Virtual entity', ar: 'الكيان الافتراضي' },
  addVirtualEntity: { en: 'Add virtual entity', ar: 'إضافة كيان افتراضي' },
  editVirtualEntity: { en: 'Edit virtual entity', ar: 'تعديل الكيان الافتراضي' },
  displayVirtualEntity: { en: 'Display virtual entity', ar: 'عرض الكيان الافتراضي' },
  deleteVirtualEntity: { en: 'Delete virtual entity', ar: 'حذف الكيان الافتراضي' },
  edit: { en: 'Edit', ar: 'تعديل' },

  // ── Final Test 3&4: Link/Contact + Directory/Grouping ──────────────────────────
  connAuto: { en: 'Auto', ar: 'تلقائي' },
  connManual: { en: 'Manual', ar: 'يدوي' },
  disconnect: { en: 'Disconnect', ar: 'فصل الاتصال' },
  connectionEnded: { en: 'Connection ended', ar: 'انتهى الاتصال' },
  pendingApprovals: { en: 'Requests awaiting your approval', ar: 'طلبات بانتظار موافقتك' },
  nodeCriteria: { en: 'Include everyone under a structure node', ar: 'شمل كل من يتبع عقدة في الهيكل' },
  virtualHistory: { en: 'Virtual accounts', ar: 'الحسابات الافتراضية' },
  statusPresent: { en: 'Present', ar: 'حتى الآن' },
  statusBlocked: { en: 'Blocked', ar: 'محظور' },
  statusUnlinked: { en: 'Unlinked', ar: 'غير مرتبط' },
}

export function tr(key: keyof typeof STRINGS | string, lang: Lang): string {
  const entry = STRINGS[key as string]
  if (!entry) return key as string
  return entry[lang]
}

interface I18nStore {
  lang: Lang
  setLang: (l: Lang) => void
  toggle: () => void
}

export const useI18n = create<I18nStore>()(
  persist(
    (set, get) => ({
      lang: 'en',
      setLang: (lang) => set({ lang }),
      toggle: () => set({ lang: get().lang === 'en' ? 'ar' : 'en' }),
    }),
    { name: 'idgate.lang' },
  ),
)

/** Convenience hook returning `{ lang, t, dir, isRtl }`. */
export function useLang() {
  const lang = useI18n((s) => s.lang)
  const t = (key: keyof typeof STRINGS | string) => tr(key, lang)
  return { lang, t, dir: lang === 'ar' ? ('rtl' as const) : ('ltr' as const), isRtl: lang === 'ar' }
}

/** Pick the right side of a bilingual label. */
export function bl(label: { en: string; ar: string } | undefined, lang: Lang): string {
  if (!label) return ''
  return label[lang]
}
