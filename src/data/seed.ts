import type {
  ContactRequest,
  DelegationItem,
  Group,
  LegalEntity,
  Message,
  NormalCharacter,
  Notification,
  Position,
  Post,
  Profile,
  StructureKind,
  StructureNode,
  TransactionKey,
  Vacancy,
  VirtualCharacter,
} from '@/types'
import { STRUCTURE_ROOT_CODE } from '@/types'
import { colorFor } from '@/lib/identity'

export interface AppData {
  normals: NormalCharacter[]
  entities: LegalEntity[]
  structures: StructureNode[]
  profiles: Profile[]
  delegations: DelegationItem[]
  positions: Position[]
  virtuals: VirtualCharacter[]
  groups: Group[]
  posts: Post[]
  messages: Message[]
  notifications: Notification[]
  vacancies: Vacancy[]
  contactRequests: ContactRequest[]
  linkRequests: import('@/types').LinkRequest[]
}

// time helpers (runtime app code — Date is fine here)
const ago = (mins: number) => new Date(Date.now() - mins * 60000).toISOString()

// ── Structure tree DSL ───────────────────────────────────────────────────────
type TreeSpec = { [name: string]: TreeSpec } | string[]

function buildStructure(entityId: string, kind: StructureKind): {
  push: (spec: TreeSpec) => void
  nodes: StructureNode[]
  root: StructureNode
} {
  const nodes: StructureNode[] = []
  let counter = 0
  const code = STRUCTURE_ROOT_CODE[kind]
  const root: StructureNode = {
    id: `${entityId}.${kind}.root`,
    entityId,
    kind,
    code,
    name: kind,
    level: 0,
    parentId: null,
  }
  nodes.push(root)

  function walk(spec: TreeSpec, parentId: string, level: number) {
    if (Array.isArray(spec)) {
      for (const name of spec) {
        counter += 1
        nodes.push({ id: `${entityId}.${kind}.${counter}`, entityId, kind, code, name, level, parentId })
      }
      return
    }
    for (const [name, children] of Object.entries(spec)) {
      counter += 1
      const id = `${entityId}.${kind}.${counter}`
      nodes.push({ id, entityId, kind, code, name, level, parentId })
      walk(children, id, level + 1)
    }
  }

  return {
    root,
    nodes,
    push: (spec: TreeSpec) => walk(spec, root.id, 1),
  }
}

/** Find a structure node id by (entity, kind, name). Throws in dev if missing. */
function nodeId(nodes: StructureNode[], entityId: string, kind: StructureKind, name: string): string {
  const n = nodes.find((x) => x.entityId === entityId && x.kind === kind && x.name === name)
  return n ? n.id : ''
}

// ── Permission helpers ──────────────────────────────────────────────────────
const CRUD = { create: true, change: true, display: true, delete: true }
const CD = { create: true, change: false, display: true, delete: false }
const D = { create: false, change: false, display: true, delete: false }

function grant(keys: TransactionKey[], set = CD): Profile['permissions'] {
  const out: Profile['permissions'] = {}
  for (const k of keys) out[k] = { ...set }
  return out
}

// A generous "full communication" profile — everything a role commonly needs.
const FULL_COMMS: TransactionKey[] = [
  'post.send', 'post.react', 'post.comment', 'post.forward', 'post.save', 'post.follow',
  'msg.send', 'msg.reply', 'msg.replyAll', 'msg.forward', 'msg.delete', 'msg.save',
  'note.task', 'note.calendar', 'note.offer', 'note.voting', 'note.event', 'note.training', 'note.tender', 'note.other',
  'tool.idgateCode', 'tool.idgatePass', 'tool.idgateNote', 'tool.complaint', 'tool.meeting', 'tool.conference',
  'tool.contactRequest', 'tool.delegationDisplay', 'tool.linkRequest', 'tool.createVacancy', 'tool.displayVacancy',
  'tool.talentAcquisition', 'tool.advertising', 'tool.publishing', 'tool.valuation', 'tool.location',
]

// A restricted "member/subscriber" profile — receive-oriented, minimal creation.
const MEMBER_COMMS: TransactionKey[] = [
  'post.send', 'post.react', 'post.comment', 'post.forward', 'post.save', 'post.follow',
  'msg.send', 'msg.reply', 'msg.replyAll', 'msg.forward', 'msg.delete', 'msg.save',
  'tool.idgateCode', 'tool.idgateNote', 'tool.complaint', 'tool.meeting', 'tool.conference',
  'tool.contactRequest', 'tool.delegationDisplay', 'tool.linkRequest', 'tool.displayVacancy', 'tool.location',
]

// ─────────────────────────────────────────────────────────────────────────────
export function buildSeed(): AppData {
  const structures: StructureNode[] = []
  const profiles: Profile[] = []
  const delegations: DelegationItem[] = []
  const positions: Position[] = []
  const virtuals: VirtualCharacter[] = []
  const groups: Group[] = []

  // ── Natural persons ────────────────────────────────────────────────────────
  const normals: NormalCharacter[] = [
    {
      id: 'n_hossam',
      firstName: 'Hossam', surname: 'Fouad', fullName: 'Hossam Fouad',
      gender: 'Male', dateOfBirth: '1985-04-12',
      nationalities: ['Egypt'], residenceCountry: 'Egypt', city: 'Cairo', address1: 'Zamalek, Cairo',
      nationalId: '28504120100913', passports: ['A1234567'],
      verification: { level: 'authority', contact: true, document: true, liveness: true, registry: true, verifiedAt: '2021-03-02T09:00:00Z' },
      motherTongue: 'Arabic',
      languages: [{ language: 'English', level: 'Fluent' }, { language: 'French', level: 'Average' }],
      contacts: { mobile: '+20 100 123 4567', email: 'hossam.fouad@mail.com', linkedIn: 'in/hossamfouad' },
      education: { university: 'Cairo University', postgraduate: 'MBA' },
      career: { title: 'CEO', profession: 'Engineer', field: 'Management', industry: 'FMCG' },
      privacy: { personalInfo: 'contacts', contactsInfo: 'contacts', education: 'public', career: 'public' },
      avatarColor: colorFor('Hossam Fouad'),
    },
    {
      id: 'n_mohamed',
      firstName: 'Mohamed', surname: 'Hisham', fullName: 'Mohamed Hisham',
      gender: 'Male', dateOfBirth: '1990-09-03',
      nationalities: ['Egypt'], residenceCountry: 'Egypt', city: 'Giza', address1: 'Dokki, Giza',
      nationalId: '29009030101234',
      verification: { level: 'verified', contact: true, document: true, liveness: true, registry: true, verifiedAt: '2022-07-18T14:30:00Z' },
      motherTongue: 'Arabic',
      languages: [{ language: 'English', level: 'Fluent' }],
      contacts: { mobile: '+20 101 987 6543', email: 'mohamed.hisham@mail.com' },
      education: { university: 'Cairo University' },
      career: { title: 'CFO', profession: 'Accountant', field: 'Accounting', industry: 'Finance' },
      privacy: { personalInfo: 'contacts', contactsInfo: 'closed', education: 'public', career: 'public' },
      avatarColor: colorFor('Mohamed Hisham'),
    },
    {
      id: 'n_sara',
      firstName: 'Sara', surname: 'Adel', fullName: 'Sara Adel',
      gender: 'Female', dateOfBirth: '1996-01-22',
      nationalities: ['Egypt'], residenceCountry: 'Egypt', city: 'Cairo',
      nationalId: '29601220102345',
      verification: { level: 'verified', contact: true, document: true, liveness: true, registry: true, verifiedAt: '2023-11-05T10:15:00Z' },
      motherTongue: 'Arabic',
      languages: [{ language: 'English', level: 'Fluent' }, { language: 'German', level: 'Basic' }],
      contacts: { mobile: '+20 102 555 1212', email: 'sara.adel@mail.com' },
      education: { university: 'Cairo University' },
      career: { profession: 'Data Analyst', field: 'Data Analysis', industry: 'Education' },
      vacancyNotification: true,
      privacy: { personalInfo: 'public', contactsInfo: 'contacts', education: 'public', career: 'public' },
      avatarColor: colorFor('Sara Adel'),
    },
  ]

  // helper to add a virtual char
  let vseq = 0
  function addVirtual(
    entityId: string,
    positionName: string,
    struct: VirtualCharacter['structure'],
    opts: Partial<VirtualCharacter> & { profileIds: string[] },
  ): VirtualCharacter {
    vseq += 1
    const posId = `${entityId}.pos.${positionName}`
    const vc: VirtualCharacter = {
      id: `v_${entityId}_${vseq}`,
      entityId,
      positionId: posId,
      positionName,
      structure: struct,
      profileIds: opts.profileIds,
      delegationSubjects: opts.delegationSubjects ?? [],
      delegationLimits: opts.delegationLimits ?? [],
      delegationDisplay: opts.delegationDisplay ?? true,
      delegateOthers: opts.delegateOthers ?? false,
      duration: opts.duration ?? { open: true },
      displayHistory: opts.displayHistory ?? true,
      location: opts.location ?? 'contacts',
      linkedNormalId: opts.linkedNormalId ?? null,
      status: opts.linkedNormalId ? 'active' : 'unlinked',
      createdAt: opts.createdAt ?? ago(60 * 24 * 30),
      positionCode: opts.positionCode,
      additionalCodes: opts.additionalCodes,
    }
    virtuals.push(vc)
    return vc
  }

  function addPositions(entityId: string, names: string[]) {
    for (const name of names) positions.push({ id: `${entityId}.pos.${name}`, entityId, name })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 1) NESTLE EGYPT — Multinational Company (Com / JSC)
  // ═══════════════════════════════════════════════════════════════════════════
  const nestle: LegalEntity = {
    id: 'e_nestle',
    communicationCode: 'AABBCC123456789',
    entityCode: 'ABC123456789',
    formalName: 'Nestle Egypt for Food Industries',
    commercialName: 'Nestle Egypt',
    searchName: 'Nestle',
    orgLevel: 'Individual', orgType: 'Com', legalEntityType: 'JSC', mainIndustry: 'Manufacturing',
    subsidiaryIndustry: ['FMCG', 'Dairy'],
    countryOfRegistration: 'Egypt', cityOfRegistration: 'Cairo', operationCountry: 'Egypt',
    domain: 'Nestle', status: 'active', dateOfOperation: ago(60 * 24 * 400),
    documents: { commercialRegistration: true, taxCard: true, vatCertificate: true },
    adminNormalId: 'n_hossam', managingDirectorNormalId: 'n_hossam',
    logoColor: '#0d5eaf',
  }
  {
    const e = nestle.id
    const corp = buildStructure(e, 'corporate')
    corp.push({
      'Head Office': [],
      'MENA': { 'North Africa': ['Legal Entity Egypt', 'Legal Entity Tunisia'], 'Gulf': [] },
      'Europe': { 'Western Europe': [], 'Russia': [] },
      'North America': { 'USA': ['Legal Entity 1 USA', 'Legal Entity 2 USA'], 'Canada': [] },
      'Asia & China': [],
    })
    const rel = buildStructure(e, 'relation')
    rel.push({
      'Shareholders': ['Preferred shares', 'Common shares', 'Employee shares'],
      'Board of Directors': ['Under-age members', 'Executive members', 'Independent members'],
      'Employees': ['Permanent', 'Annual', 'Fixed-term', 'Outsourced'],
    })
    const org = buildStructure(e, 'organization')
    org.push({
      'Operations': ['Production', 'Supply Chain', 'Maintenance', 'Quality Control', 'Warehousing'],
      'Sales': ['Key Accounts', 'Retail', 'Wholesale'],
      'Marketing': ['E-marketing', 'Advertising', 'Design'],
      'Finance': ['General Ledger', 'AP', 'AR', 'Treasury'],
      'HR': ['Recruitment', 'L&D'],
    })
    const geo = buildStructure(e, 'geographical')
    geo.push({
      'Egypt': { 'Cairo': ['Zamalek', 'Maadi', 'Nasr City'], 'Giza': ['6 October', 'Mohandessin', 'Haram'] },
      'Tunisia': [],
      'USA': ['New Jersey', 'New York', 'Manhattan'],
      'Switzerland': ['Geneva'],
    })
    structures.push(...corp.nodes, ...rel.nodes, ...org.nodes, ...geo.nodes)

    profiles.push(
      { id: 'p_nestle_exec', entityId: e, name: 'Executive (full authority)', permissions: { ...grant(FULL_COMMS, CRUD), 'admin.createVirtualAccount': CRUD, 'admin.changeVirtualAccount': CRUD, 'admin.createLinkRequest': CRUD, 'admin.acceptLinkRequest': CRUD, 'admin.createGroupVirtual': CRUD, 'admin.createGroupNormal': CRUD } },
      { id: 'p_nestle_mgr', entityId: e, name: 'Manager', permissions: grant(FULL_COMMS, CD) },
      { id: 'p_nestle_staff', entityId: e, name: 'Staff', permissions: grant(MEMBER_COMMS, CD) },
    )
    delegations.push(
      { id: 'd_nestle_1', entityId: e, subject: 'Approve purchase orders', limit: 'Up to EGP 5,000,000' },
      { id: 'd_nestle_2', entityId: e, subject: 'Sign employment contracts', limit: 'Permanent & annual' },
      { id: 'd_nestle_3', entityId: e, subject: 'Bank transfers', limit: 'Up to EGP 1,000,000' },
    )
    const posNames = ['Common shareholder', 'Independent Board Member', 'CEO', 'Finance Director', 'COO', 'Supply Chain Director', 'Store Keeper', 'Human Resources Specialist']
    addPositions(e, posNames)
    const N = (kind: StructureKind, name: string) => nodeId(structures, e, kind, name)

    addVirtual(e, 'Common shareholder', { corporate: N('corporate', 'Legal Entity Egypt'), relation: N('relation', 'Common shares') }, { profileIds: ['p_nestle_staff'], linkedNormalId: 'n_hossam', duration: { open: true } })
    addVirtual(e, 'Independent Board Member', { corporate: N('corporate', 'Legal Entity Egypt'), relation: N('relation', 'Independent members') }, { profileIds: ['p_nestle_mgr'], linkedNormalId: 'n_mohamed' })
    addVirtual(e, 'CEO', { corporate: N('corporate', 'Legal Entity Egypt'), relation: N('relation', 'Permanent'), organization: N('organization', 'Operations'), geographical: N('geographical', 'Cairo') }, { profileIds: ['p_nestle_exec'], linkedNormalId: 'n_hossam', delegationSubjects: ['Approve purchase orders', 'Sign employment contracts', 'Bank transfers'], delegationLimits: ['Up to EGP 5,000,000', 'Permanent & annual', 'Up to EGP 1,000,000'], delegateOthers: true, positionCode: 'EMP-1001', additionalCodes: ['INS-55501'] })
    addVirtual(e, 'Finance Director', { corporate: N('corporate', 'Legal Entity Tunisia'), relation: N('relation', 'Permanent'), organization: N('organization', 'Finance'), geographical: N('geographical', 'Tunisia') }, { profileIds: ['p_nestle_mgr'], linkedNormalId: 'n_mohamed', delegationSubjects: ['Bank transfers'], delegationLimits: ['Up to EGP 1,000,000'], positionCode: 'EMP-1002' })
    addVirtual(e, 'COO', { corporate: N('corporate', 'Legal Entity 2 USA'), relation: N('relation', 'Permanent'), organization: N('organization', 'Operations'), geographical: N('geographical', 'New Jersey') }, { profileIds: ['p_nestle_exec'], linkedNormalId: 'n_hossam', positionCode: 'EMP-1003' })
    addVirtual(e, 'Supply Chain Director', { corporate: N('corporate', 'Legal Entity 2 USA'), relation: N('relation', 'Annual'), organization: N('organization', 'Supply Chain'), geographical: N('geographical', 'New York') }, { profileIds: ['p_nestle_mgr'], linkedNormalId: 'n_mohamed' })
    addVirtual(e, 'Store Keeper', { corporate: N('corporate', 'Legal Entity 2 USA'), relation: N('relation', 'Fixed-term'), organization: N('organization', 'Warehousing') }, { profileIds: ['p_nestle_staff'] })
    addVirtual(e, 'Human Resources Specialist', { corporate: N('corporate', 'Head Office'), relation: N('relation', 'Outsourced'), organization: N('organization', 'Recruitment'), geographical: N('geographical', 'Geneva') }, { profileIds: ['p_nestle_staff'], linkedNormalId: 'n_mohamed' })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2) GEZIRA SPORTING CLUB — Club (Clb / JSC)
  // ═══════════════════════════════════════════════════════════════════════════
  const gezira: LegalEntity = {
    id: 'e_gezira',
    communicationCode: 'AABBCC223456789', entityCode: 'ABC223456789',
    formalName: 'Gezira Sporting Club', commercialName: 'Gezira Sporting Club', searchName: 'Gezira',
    orgLevel: 'Individual', orgType: 'Clb', legalEntityType: 'JSC', mainIndustry: 'Sports',
    countryOfRegistration: 'Egypt', cityOfRegistration: 'Cairo', operationCountry: 'Egypt',
    domain: 'GeziraSportingClub', status: 'active', dateOfOperation: ago(60 * 24 * 500),
    documents: { commercialRegistration: true, taxCard: true },
    adminNormalId: 'n_hossam', managingDirectorNormalId: 'n_hossam',
    logoColor: '#166534',
  }
  {
    const e = gezira.id
    const corp = buildStructure(e, 'corporate')
    corp.push({ 'Head Office': [], 'Zamalek Branch': [], '6 October Branch': [], 'Tagamoa Branch': [] })
    const rel = buildStructure(e, 'relation')
    rel.push({
      'Board of Directors': ['Under-age members', 'Executive members', 'Independent members'],
      'Employees': ['Permanent', 'Annual', 'Sports contracts', 'Outsourced'],
      'Members': ['Honorary', 'Working', 'Affiliated', 'Associate', 'Athletic', 'Foreign'],
    })
    const org = buildStructure(e, 'organization')
    org.push({
      'Sports Management': { 'Football': ['Players', 'Technical', 'Analysis'], 'Basketball': [], 'Swimming': [] },
      'Subscriptions Management': [],
      'Finance': ['General Ledger', 'AP', 'AR & Subscriptions', 'Treasury'],
      'HR': ['Recruitment', 'L&D'],
    })
    const geo = buildStructure(e, 'geographical')
    geo.push({ 'Egypt': { 'Cairo': ['Zamalek', 'Nasr City', 'Tagamoa', 'Dokki'], 'Giza': ['6 October', 'Maadi'] } })
    structures.push(...corp.nodes, ...rel.nodes, ...org.nodes, ...geo.nodes)

    profiles.push(
      { id: 'p_gezira_exec', entityId: e, name: 'Board / Executive', permissions: { ...grant(FULL_COMMS, CRUD), 'admin.createVirtualAccount': CRUD, 'admin.createLinkRequest': CRUD, 'admin.acceptLinkRequest': CRUD, 'admin.createGroupVirtual': CRUD } },
      { id: 'p_gezira_staff', entityId: e, name: 'Staff / Coach', permissions: grant(FULL_COMMS, CD) },
      { id: 'p_gezira_member', entityId: e, name: 'Member', permissions: grant(MEMBER_COMMS, CD) },
    )
    delegations.push(
      { id: 'd_gezira_1', entityId: e, subject: 'Approve memberships', limit: 'All types' },
      { id: 'd_gezira_2', entityId: e, subject: 'Book facilities', limit: 'Own branch' },
    )
    const posNames = ['Under-age Board Member', 'Football Manager', 'Swimming Coach', 'Data Analyst', 'Subscriptions Head', 'Working Member', 'Athletic Member', 'Foreign Member', 'Family Member']
    addPositions(e, posNames)
    const N = (kind: StructureKind, name: string) => nodeId(structures, e, kind, name)

    addVirtual(e, 'Under-age Board Member', { corporate: N('corporate', 'Head Office'), relation: N('relation', 'Under-age members') }, { profileIds: ['p_gezira_exec'], linkedNormalId: 'n_hossam' })
    addVirtual(e, 'Football Manager', { corporate: N('corporate', 'Zamalek Branch'), relation: N('relation', 'Annual'), organization: N('organization', 'Football'), geographical: N('geographical', 'Zamalek') }, { profileIds: ['p_gezira_staff'], linkedNormalId: 'n_mohamed', positionCode: 'EMP-2001' })
    addVirtual(e, 'Swimming Coach', { corporate: N('corporate', 'Head Office'), relation: N('relation', 'Annual'), organization: N('organization', 'Swimming'), geographical: N('geographical', 'Zamalek') }, { profileIds: ['p_gezira_staff'], linkedNormalId: 'n_hossam' })
    addVirtual(e, 'Data Analyst', { corporate: N('corporate', 'Head Office'), relation: N('relation', 'Permanent'), organization: N('organization', 'Analysis'), geographical: N('geographical', 'Zamalek') }, { profileIds: ['p_gezira_staff'], linkedNormalId: 'n_mohamed' })
    addVirtual(e, 'Subscriptions Head', { corporate: N('corporate', 'Tagamoa Branch'), relation: N('relation', 'Permanent'), organization: N('organization', 'Subscriptions Management'), geographical: N('geographical', 'Tagamoa') }, { profileIds: ['p_gezira_exec'], linkedNormalId: 'n_hossam' })
    addVirtual(e, 'Working Member', { corporate: N('corporate', 'Zamalek Branch'), relation: N('relation', 'Working'), geographical: N('geographical', 'Zamalek') }, { profileIds: ['p_gezira_member'], linkedNormalId: 'n_mohamed', positionCode: 'MEM-3301' })
    addVirtual(e, 'Athletic Member', { corporate: N('corporate', '6 October Branch'), relation: N('relation', 'Athletic'), geographical: N('geographical', '6 October') }, { profileIds: ['p_gezira_member'], linkedNormalId: 'n_hossam', positionCode: 'MEM-3302' })
    addVirtual(e, 'Foreign Member', { corporate: N('corporate', 'Tagamoa Branch'), relation: N('relation', 'Foreign'), geographical: N('geographical', 'Tagamoa') }, { profileIds: ['p_gezira_member'] })
    // The "Family Member" account referenced in the App.Structure sheet
    addVirtual(e, 'Family Member', { corporate: N('corporate', 'Zamalek Branch'), relation: N('relation', 'Affiliated'), geographical: N('geographical', 'Zamalek') }, { profileIds: ['p_gezira_member'], linkedNormalId: 'n_hossam', positionCode: 'MEM-3303' })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3) MINISTRY OF ELECTRICITY — Government (Gov / JSC)
  // ═══════════════════════════════════════════════════════════════════════════
  const moe: LegalEntity = {
    id: 'e_moe',
    communicationCode: 'AABBCC323456789', entityCode: 'ABC987654321',
    formalName: 'Egyptian Ministry of Electricity and Renewable Energy',
    commercialName: 'Ministry of Electricity', searchName: 'Ministry of Electricity',
    orgLevel: 'Individual', orgType: 'Gov', legalEntityType: 'JSC', mainIndustry: 'Energy',
    countryOfRegistration: 'Egypt', cityOfRegistration: 'Cairo', operationCountry: 'Egypt',
    domain: 'MinistryOfElectricity', status: 'active', dateOfOperation: ago(60 * 24 * 600),
    documents: { commercialRegistration: true, taxCard: true, vatCertificate: true },
    adminNormalId: 'n_mohamed', managingDirectorNormalId: 'n_mohamed',
    logoColor: '#b45309',
  }
  {
    const e = moe.id
    const corp = buildStructure(e, 'corporate')
    corp.push({ 'Ministry of Electricity': { 'Electricity Authority': [], 'Renewable Energy Authority': [] } })
    const rel = buildStructure(e, 'relation')
    rel.push({
      'Parliament Energy Committee': [],
      'Board of Directors': ['Staff members', 'Executive members', 'Independent members'],
      'Employees': ['Permanent', 'Annual', 'Fixed-term', 'Outsourced'],
      'Subscribers': ['Current account', 'Prepaid', 'Special', 'Temporary'],
    })
    const org = buildStructure(e, 'organization')
    org.push({
      'Operations': ['Installations', 'Engineering', 'Quality', 'Maintenance'],
      'Subscriptions': [],
      'Contracts & Procurement': ['Contracts', 'Procurement'],
      'Finance': ['General Ledger', 'AP', 'AR', 'Treasury'],
      'HR': ['Recruitment', 'L&D'],
    })
    const geo = buildStructure(e, 'geographical')
    geo.push({ 'Egypt': { 'Cairo': ['Zamalek', 'Nasr City', 'Maadi'], 'Giza': ['6 October', 'Mohandessin', 'Haram'] } })
    structures.push(...corp.nodes, ...rel.nodes, ...org.nodes, ...geo.nodes)

    profiles.push(
      { id: 'p_moe_exec', entityId: e, name: 'Executive', permissions: { ...grant(FULL_COMMS, CRUD), 'admin.createVirtualAccount': CRUD, 'admin.createLinkRequest': CRUD } },
      { id: 'p_moe_staff', entityId: e, name: 'Staff', permissions: grant(FULL_COMMS, CD) },
      { id: 'p_moe_sub', entityId: e, name: 'Subscriber', permissions: grant(['post.react', 'post.comment', 'post.save', 'post.follow', 'msg.send', 'msg.reply', 'msg.save', 'tool.idgateCode', 'tool.complaint', 'tool.contactRequest', 'tool.location'], D) },
    )
    delegations.push(
      { id: 'd_moe_1', entityId: e, subject: 'Approve grid contracts', limit: 'Up to EGP 20,000,000' },
      { id: 'd_moe_2', entityId: e, subject: 'Subscription tariff changes', limit: 'Residential only' },
    )
    const posNames = ['Energy Committee Member', 'Board Member', 'Operations Sector Head', 'Finance Director', 'Current-account Subscriber', 'Prepaid Subscriber', 'Special Subscriber', 'Subscriptions Section Head']
    addPositions(e, posNames)
    const N = (kind: StructureKind, name: string) => nodeId(structures, e, kind, name)

    addVirtual(e, 'Energy Committee Member', { corporate: N('corporate', 'Electricity Authority'), relation: N('relation', 'Parliament Energy Committee') }, { profileIds: ['p_moe_exec'], linkedNormalId: 'n_hossam' })
    addVirtual(e, 'Board Member', { corporate: N('corporate', 'Electricity Authority'), relation: N('relation', 'Executive members') }, { profileIds: ['p_moe_exec'], linkedNormalId: 'n_mohamed' })
    addVirtual(e, 'Operations Sector Head', { corporate: N('corporate', 'Electricity Authority'), relation: N('relation', 'Permanent'), organization: N('organization', 'Operations'), geographical: N('geographical', 'Cairo') }, { profileIds: ['p_moe_staff'], linkedNormalId: 'n_hossam', positionCode: 'EMP-4001' })
    addVirtual(e, 'Finance Director', { corporate: N('corporate', 'Electricity Authority'), relation: N('relation', 'Permanent'), organization: N('organization', 'Finance'), geographical: N('geographical', 'Cairo') }, { profileIds: ['p_moe_staff'], linkedNormalId: 'n_mohamed', positionCode: 'EMP-4002' })
    addVirtual(e, 'Current-account Subscriber', { corporate: N('corporate', 'Electricity Authority'), relation: N('relation', 'Current account'), geographical: N('geographical', 'Mohandessin') }, { profileIds: ['p_moe_sub'], linkedNormalId: 'n_hossam', positionCode: 'SUB-9001', additionalCodes: ['METER-771201'] })
    addVirtual(e, 'Prepaid Subscriber', { corporate: N('corporate', 'Electricity Authority'), relation: N('relation', 'Prepaid'), geographical: N('geographical', '6 October') }, { profileIds: ['p_moe_sub'], linkedNormalId: 'n_mohamed', positionCode: 'SUB-9002', additionalCodes: ['METER-771202'] })
    addVirtual(e, 'Special Subscriber', { corporate: N('corporate', 'Electricity Authority'), relation: N('relation', 'Special'), geographical: N('geographical', 'Maadi') }, { profileIds: ['p_moe_sub'], linkedNormalId: 'n_hossam', positionCode: 'SUB-9003' })
    addVirtual(e, 'Subscriptions Section Head', { corporate: N('corporate', 'Electricity Authority'), relation: N('relation', 'Outsourced'), organization: N('organization', 'Subscriptions'), geographical: N('geographical', 'Zamalek') }, { profileIds: ['p_moe_staff'], linkedNormalId: 'n_mohamed' })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4) CAIRO UNIVERSITY — University (Uni / JSC)
  // ═══════════════════════════════════════════════════════════════════════════
  const univ: LegalEntity = {
    id: 'e_univ',
    communicationCode: 'AABBCC423456789', entityCode: 'ABC423456789',
    formalName: 'Cairo University', commercialName: 'Cairo University', searchName: 'Cairo University',
    orgLevel: 'Individual', orgType: 'Uni', legalEntityType: 'JSC', mainIndustry: 'Education',
    countryOfRegistration: 'Egypt', cityOfRegistration: 'Giza', operationCountry: 'Egypt',
    domain: 'CairoUniversity', status: 'active', dateOfOperation: ago(60 * 24 * 700),
    documents: { commercialRegistration: true, taxCard: true },
    adminNormalId: 'n_hossam', managingDirectorNormalId: 'n_hossam',
    logoColor: '#7c3aed',
  }
  {
    const e = univ.id
    const corp = buildStructure(e, 'corporate')
    corp.push({ 'Cairo University': { 'Faculty of Engineering': ['Civil', 'Electrical'], 'Faculty of Medicine': ['Human', 'Dental'], 'Faculty of Commerce': [] } })
    const rel = buildStructure(e, 'relation')
    rel.push({
      'Board of Trustees': [],
      'Teaching Staff': ['PhD holders', 'Masters holders', 'Diploma holders'],
      'Employees': ['Permanent', 'Annual', 'Fixed-term', 'Outsourced'],
      'Students': ['Regular', 'Affiliated', 'International', 'Distance'],
    })
    const org = buildStructure(e, 'organization')
    org.push({
      'Faculty of Engineering': ['Civil Eng.', 'Electrical Eng.'],
      'Faculty of Medicine': [],
      'Faculty of Commerce': [],
      'Public Relations': ['Advertising', 'Design'],
      'Finance': ['General Ledger', 'AR', 'Treasury'],
      'HR': ['Recruitment', 'L&D'],
    })
    const geo = buildStructure(e, 'geographical')
    geo.push({ 'Egypt': { 'Cairo': ['Giza', 'Dokki'] } })
    structures.push(...corp.nodes, ...rel.nodes, ...org.nodes, ...geo.nodes)

    profiles.push(
      { id: 'p_univ_faculty', entityId: e, name: 'Faculty', permissions: grant(FULL_COMMS, CD) },
      { id: 'p_univ_student', entityId: e, name: 'Student', permissions: grant(MEMBER_COMMS, D) },
      { id: 'p_univ_admin', entityId: e, name: 'Administration', permissions: { ...grant(FULL_COMMS, CRUD), 'admin.createVirtualAccount': CRUD, 'admin.createLinkRequest': CRUD } },
    )
    const posNames = ['Professor', 'Assistant Professor', 'Bachelor Student', 'Masters Student', 'PhD Student']
    addPositions(e, posNames)
    const N = (kind: StructureKind, name: string) => nodeId(structures, e, kind, name)

    addVirtual(e, 'Professor', { corporate: N('corporate', 'Faculty of Medicine'), relation: N('relation', 'PhD holders'), organization: N('organization', 'Faculty of Medicine'), geographical: N('geographical', 'Giza') }, { profileIds: ['p_univ_faculty'], linkedNormalId: 'n_hossam', positionCode: 'EMP-5001' })
    addVirtual(e, 'Assistant Professor', { corporate: N('corporate', 'Civil'), relation: N('relation', 'Masters holders'), organization: N('organization', 'Civil Eng.'), geographical: N('geographical', 'Giza') }, { profileIds: ['p_univ_faculty'], linkedNormalId: 'n_mohamed', positionCode: 'EMP-5002' })
    addVirtual(e, 'Bachelor Student', { corporate: N('corporate', 'Faculty of Commerce'), relation: N('relation', 'Regular'), geographical: N('geographical', 'Giza') }, { profileIds: ['p_univ_student'], linkedNormalId: 'n_sara', positionCode: 'STU-88001', additionalCodes: ['Year 1'] })
    addVirtual(e, 'Masters Student', { corporate: N('corporate', 'Faculty of Medicine'), relation: N('relation', 'Affiliated') }, { profileIds: ['p_univ_student'], linkedNormalId: 'n_mohamed', positionCode: 'STU-88002', additionalCodes: ['Part 1'] })
    addVirtual(e, 'PhD Student', { corporate: N('corporate', 'Electrical'), relation: N('relation', 'Distance') }, { profileIds: ['p_univ_student'], linkedNormalId: 'n_hossam', positionCode: 'STU-88003', additionalCodes: ['Thesis'] })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5) TRAFFIC AUTHORITY — Government (Gov / JSC) — lighter
  // ═══════════════════════════════════════════════════════════════════════════
  const traffic: LegalEntity = {
    id: 'e_traffic',
    communicationCode: 'AABBCC523456789', entityCode: 'ABC523456789',
    formalName: 'Egyptian Ministry of Interior — Traffic Authority',
    commercialName: 'Traffic Authority', searchName: 'Traffic Authority',
    orgLevel: 'Individual', orgType: 'Gov', legalEntityType: 'JSC', mainIndustry: 'Governmental',
    countryOfRegistration: 'Egypt', cityOfRegistration: 'Cairo', operationCountry: 'Egypt',
    domain: 'TrafficAuthority', status: 'active', dateOfOperation: ago(60 * 24 * 650),
    documents: { commercialRegistration: true, taxCard: true },
    adminNormalId: 'n_mohamed', managingDirectorNormalId: 'n_mohamed',
    logoColor: '#334155',
  }
  {
    const e = traffic.id
    const corp = buildStructure(e, 'corporate')
    corp.push({ 'Ministry of Interior': { 'Traffic Dept.': [], 'Immigration Dept.': [], 'Civil Status Dept.': [] } })
    const rel = buildStructure(e, 'relation')
    rel.push({
      'Employees': ['Permanent', 'Annual', 'Outsourced'],
      'Licenses': ['Private licenses', 'Transport licenses', 'Diplomatic licenses', 'Government licenses'],
    })
    const org = buildStructure(e, 'organization')
    org.push({ 'Licensing': ['Review', 'Issuance', 'Receiving'], 'Inspection': ['Private inspection', 'Light transport', 'Heavy transport'], 'Finance': [] })
    const geo = buildStructure(e, 'geographical')
    geo.push({ 'Egypt': { 'Cairo': ['East Cairo', 'South Cairo', 'North Cairo', 'Zamalek', 'Maadi'], 'Giza': ['6 October', 'Mohandessin'] } })
    structures.push(...corp.nodes, ...rel.nodes, ...org.nodes, ...geo.nodes)

    profiles.push(
      { id: 'p_traffic_officer', entityId: e, name: 'Officer', permissions: { ...grant(FULL_COMMS, CD), 'admin.createVirtualAccount': CRUD } },
      { id: 'p_traffic_license', entityId: e, name: 'License holder', permissions: grant(['msg.send', 'msg.reply', 'tool.idgateCode', 'tool.complaint', 'tool.contactRequest', 'tool.location', 'post.react', 'post.comment', 'post.save'], D) },
    )
    const posNames = ['Inspection Manager', 'Financial Director', 'Private Driving License', 'First-degree License', 'Second-degree License', 'Third-degree License']
    addPositions(e, posNames)
    const N = (kind: StructureKind, name: string) => nodeId(structures, e, kind, name)

    addVirtual(e, 'Inspection Manager', { corporate: N('corporate', 'Traffic Dept.'), relation: N('relation', 'Permanent'), organization: N('organization', 'Inspection'), geographical: N('geographical', 'East Cairo') }, { profileIds: ['p_traffic_officer'], linkedNormalId: 'n_hossam', positionCode: 'EMP-6001' })
    addVirtual(e, 'Private Driving License', { corporate: N('corporate', 'Traffic Dept.'), relation: N('relation', 'Private licenses'), geographical: N('geographical', 'Mohandessin') }, { profileIds: ['p_traffic_license'], linkedNormalId: 'n_hossam', positionCode: 'LIC-770012' })
    addVirtual(e, 'First-degree License', { corporate: N('corporate', 'Traffic Dept.'), relation: N('relation', 'Transport licenses'), geographical: N('geographical', 'Zamalek') }, { profileIds: ['p_traffic_license'], linkedNormalId: 'n_mohamed', positionCode: 'LIC-770013' })
    addVirtual(e, 'Third-degree License', { corporate: N('corporate', 'Traffic Dept.'), relation: N('relation', 'Transport licenses'), geographical: N('geographical', '6 October') }, { profileIds: ['p_traffic_license'], linkedNormalId: 'n_sara', positionCode: 'LIC-770014' })
  }

  const entities = [nestle, gezira, moe, univ, traffic]

  // ── Groups (built from structures) ──────────────────────────────────────────
  const gN = (e: string, kind: StructureKind, name: string) => nodeId(structures, e, kind, name)
  const nestleCEO = virtuals.find((v) => v.entityId === 'e_nestle' && v.positionName === 'CEO')!
  const geziraSub = virtuals.find((v) => v.entityId === 'e_gezira' && v.positionName === 'Subscriptions Head')!
  const moeBoard = virtuals.find((v) => v.entityId === 'e_moe' && v.positionName === 'Board Member')!
  groups.push(
    { id: 'g_nestle_board_gulf', entityId: 'e_nestle', ownerVirtualId: nestleCEO.id, name: 'Board Members — Gulf', positionName: 'Independent Board Member', corporateNodeId: gN('e_nestle', 'corporate', 'Gulf'), relationNodeId: gN('e_nestle', 'relation', 'Board of Directors') },
    { id: 'g_nestle_egypt_staff', entityId: 'e_nestle', ownerVirtualId: nestleCEO.id, name: 'Staff — Legal Entity Egypt working in Egypt', corporateNodeId: gN('e_nestle', 'corporate', 'Legal Entity Egypt'), relationNodeId: gN('e_nestle', 'relation', 'Employees'), geographicalNodeId: gN('e_nestle', 'geographical', 'Egypt') },
    { id: 'g_gezira_foreign', entityId: 'e_gezira', ownerVirtualId: geziraSub.id, name: 'Foreign members — Head Office', relationNodeId: gN('e_gezira', 'relation', 'Foreign') },
    { id: 'g_moe_prepaid', entityId: 'e_moe', ownerVirtualId: moeBoard.id, name: 'Prepaid subscribers — 6 October', relationNodeId: gN('e_moe', 'relation', 'Prepaid'), geographicalNodeId: gN('e_moe', 'geographical', '6 October') },
  )

  // ── Feed posts ───────────────────────────────────────────────────────────────
  const posts: Post[] = [
    { id: 'post_1', author: { kind: 'virtual', virtualId: nestleCEO.id }, category: 'news', body: 'Nestle Egypt reports 12% growth in the North Africa region this quarter. Proud of every team across our legal entities. 📈', createdAt: ago(45), reactions: 34, reactedBy: [], savedBy: [], comments: [{ id: 'c1', author: { kind: 'virtual', virtualId: virtuals.find((v) => v.positionName === 'Finance Director' && v.entityId === 'e_nestle')!.id }, body: 'Great numbers — Tunisia contributed strongly.', createdAt: ago(40) }] },
    { id: 'post_2', author: { kind: 'virtual', virtualId: virtuals.find((v) => v.entityId === 'e_moe' && v.positionName === 'Operations Sector Head')!.id }, category: 'report', body: 'Scheduled maintenance on the Cairo grid this Friday 2–5 AM. Prepaid & current-account subscribers in 6 October and Mohandessin may notice brief interruptions.', createdAt: ago(120), reactions: 8, reactedBy: [], savedBy: [], comments: [] },
    { id: 'post_3', author: { kind: 'virtual', virtualId: virtuals.find((v) => v.entityId === 'e_gezira' && v.positionName === 'Football Manager')!.id }, category: 'event', body: '⚽ Junior football tryouts open at the Zamalek branch this weekend. Working & athletic members welcome to register their kids.', createdAt: ago(200), reactions: 51, reactedBy: [], savedBy: [], comments: [] },
    { id: 'post_4', author: { kind: 'virtual', virtualId: virtuals.find((v) => v.entityId === 'e_univ' && v.positionName === 'Professor')!.id }, category: 'data', body: 'Registration for the new AI in Medicine elective is now open for Masters and PhD students at the Faculty of Medicine.', createdAt: ago(300), reactions: 22, reactedBy: [], savedBy: [], comments: [] },
    { id: 'post_5', author: { kind: 'normal', normalId: 'n_sara' }, category: 'friend', body: 'Just finished my first data-analysis project at Cairo University — looking for opportunities in the education sector! 🎓', createdAt: ago(500), reactions: 15, reactedBy: [], savedBy: [], comments: [] },
    { id: 'post_6', author: { kind: 'virtual', virtualId: virtuals.find((v) => v.entityId === 'e_nestle' && v.positionName === 'Human Resources Specialist')!.id }, category: 'advertising', body: 'We are hiring! Supply Chain Analyst roles now open across our Egypt and USA legal entities. Check the Vacancies tab. 🚀', createdAt: ago(700), reactions: 40, reactedBy: [], savedBy: [], comments: [] },
  ]

  // ── Messages ────────────────────────────────────────────────────────────────
  const messages: Message[] = [
    { id: 'm_1', threadId: 't_1', from: { kind: 'virtual', virtualId: virtuals.find((v) => v.entityId === 'e_nestle' && v.positionName === 'Finance Director')!.id }, to: [{ kind: 'virtual', virtualId: nestleCEO.id }], subject: 'Q3 Budget review', body: 'Hi Hossam, attaching the Q3 numbers for your review before the board meeting. The Tunisia entity is ahead of plan.', createdAt: ago(90), readBy: [], savedBy: [] },
    { id: 'm_2', threadId: 't_1', from: { kind: 'virtual', virtualId: nestleCEO.id }, to: [{ kind: 'virtual', virtualId: virtuals.find((v) => v.entityId === 'e_nestle' && v.positionName === 'Finance Director')!.id }], subject: 'Re: Q3 Budget review', body: 'Thanks Mohamed — looks solid. Let us present this Thursday.', createdAt: ago(80), readBy: [], savedBy: [] },
    { id: 'm_3', threadId: 't_2', from: { kind: 'virtual', virtualId: virtuals.find((v) => v.entityId === 'e_gezira' && v.positionName === 'Subscriptions Head')!.id }, to: [{ kind: 'virtual', virtualId: virtuals.find((v) => v.entityId === 'e_gezira' && v.positionName === 'Working Member')!.id }], subject: 'Membership renewal', body: 'Dear member, your working membership at the Zamalek branch is due for renewal next month.', createdAt: ago(400), readBy: [], savedBy: [] },
  ]

  // ── Notifications (tools) ─────────────────────────────────────────────────────
  const notifications: Notification[] = [
    { id: 'nt_1', kind: 'task', from: { kind: 'virtual', virtualId: nestleCEO.id }, to: [{ kind: 'virtual', virtualId: virtuals.find((v) => v.entityId === 'e_nestle' && v.positionName === 'Supply Chain Director')!.id }], subject: 'Prepare Q4 supply forecast', body: 'Please prepare the Q4 supply forecast for the USA legal entities by end of week.', createdAt: ago(150), targetDate: new Date(Date.now() + 3 * 864e5).toISOString(), needsResponse: true, status: 'pending', history: [] },
    { id: 'nt_2', kind: 'voting', from: { kind: 'virtual', virtualId: moeBoard.id }, to: [{ kind: 'virtual', virtualId: virtuals.find((v) => v.entityId === 'e_moe' && v.positionName === 'Energy Committee Member')!.id }], subject: 'Approve renewable tariff resolution', body: 'Board resolution #2026-14: approve the new residential renewable-energy tariff. Please cast your vote.', createdAt: ago(220), needsResponse: true, status: 'pending', votes: { accept: 4, reject: 1 }, history: [] },
    { id: 'nt_3', kind: 'calendar', from: { kind: 'virtual', virtualId: virtuals.find((v) => v.entityId === 'e_gezira' && v.positionName === 'Swimming Coach')!.id }, to: [{ kind: 'virtual', virtualId: virtuals.find((v) => v.entityId === 'e_gezira' && v.positionName === 'Athletic Member')!.id }], subject: 'Swimming session — Saturday 6 PM', body: 'Booked your private swimming session at the Zamalek pool for Saturday 6 PM.', createdAt: ago(260), targetDate: new Date(Date.now() + 2 * 864e5).toISOString(), needsResponse: true, status: 'pending', history: [] },
    { id: 'nt_4', kind: 'idgate', from: { kind: 'virtual', virtualId: geziraSub.id }, to: [{ kind: 'virtual', virtualId: virtuals.find((v) => v.entityId === 'e_gezira' && v.positionName === 'Family Member')!.id }], subject: 'Welcome to Gezira Sporting Club', body: 'Your family membership is active. Use your IDGate Code at the gate.', createdAt: ago(1000), needsResponse: false, status: 'closed', history: [] },
  ]

  // ── Vacancies ──────────────────────────────────────────────────────────────
  const hrNestle = virtuals.find((v) => v.entityId === 'e_nestle' && v.positionName === 'Human Resources Specialist')!
  const vacancies: Vacancy[] = [
    { id: 'vac_1', entityId: 'e_nestle', postedByVirtualId: hrNestle.id, title: 'Supply Chain Analyst', positionName: 'Supply Chain Director', location: 'New York', industry: 'Manufacturing', description: 'Analyze demand & optimize the supply chain across USA legal entities.', createdAt: ago(720), applicants: [] },
    { id: 'vac_2', entityId: 'e_nestle', postedByVirtualId: hrNestle.id, title: 'Financial Analyst (Cairo)', location: 'Cairo', industry: 'Finance', description: 'Support the Egypt finance team with reporting & budgeting.', createdAt: ago(900), applicants: [] },
    { id: 'vac_3', entityId: 'e_univ', postedByVirtualId: virtuals.find((v) => v.entityId === 'e_univ' && v.positionName === 'Professor')!.id, title: 'Teaching Assistant — Data Analysis', location: 'Giza', industry: 'Education', description: 'Assist with undergraduate data-analysis labs at the Faculty of Commerce.', createdAt: ago(1100), applicants: [] },
  ]

  const contactRequests: ContactRequest[] = [
    { id: 'cr_1', from: { kind: 'normal', normalId: 'n_sara' }, to: { kind: 'virtual', virtualId: hrNestle.id }, status: 'pending', createdAt: ago(30) },
  ]

  return {
    normals, entities, structures, profiles, delegations, positions, virtuals, groups,
    posts, messages, notifications, vacancies, contactRequests, linkRequests: [],
  }
}
