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
  notification: { en: 'Notifications', ar: 'التنبيهات' },
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
