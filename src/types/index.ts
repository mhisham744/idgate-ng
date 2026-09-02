/**
 * IDGate domain model.
 *
 * The concept rests on THREE dimensions of "personality":
 *  1. NormalCharacter  — a natural person. Permanent, free personal account.
 *  2. LegalEntity      — a corporate/institutional account (company, ministry, university, club, bank...).
 *  3. VirtualCharacter — a "Position" acquired by a natural person FROM a legal entity.
 *                        Inactive until LINKED to a natural person (its "host").
 *
 * A NormalCharacter acts THROUGH an Account: either its personal account, or any
 * active VirtualCharacter it hosts. Only a natural person can use features/communicate.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Enumerations (mirrors the workbook drop-lists)
// ─────────────────────────────────────────────────────────────────────────────

export type OrgLevel = 'Holding' | 'Individual' | 'Branch'

/** Org. Type — 2nd part of the virtual-character address (…@Domain.<OrgType>.<Legal>) */
export type OrgType =
  | 'Com' // Company
  | 'Uni' // University
  | 'Sch' // School
  | 'REs' // Residential
  | 'Clb' // Club
  | 'Fac' // Faculty
  | 'Bank'
  | 'Fin' // Financial
  | 'Shp' // Shop
  | 'Gov' // Governmental

/** Legal Entity type — 3rd part of the address */
export type LegalEntityType =
  | 'LLC'
  | 'JSC'
  | 'OPC'
  | 'SPS'
  | 'GPS'
  | 'PLS'
  | 'BFC'
  | 'FCBO'
  | 'REO'
  | 'NON'

export type Industry =
  | 'Manufacturing'
  | 'Education'
  | 'Energy'
  | 'IT'
  | 'Sports'
  | 'Governmental'
  | 'Finance'

export type Country = 'Egypt' | 'USA' | 'France' | 'Germany' | 'India'
export type Language = 'Arabic' | 'English' | 'French' | 'German' | 'Hindi'
export type PrivacyLevel = 'public' | 'contacts' | 'closed'

/** The four communication structures every legal entity builds. Default root codes per workbook. */
export type StructureKind = 'corporate' | 'relation' | 'organization' | 'geographical'

export const STRUCTURE_ROOT_CODE: Record<StructureKind, number> = {
  corporate: 1000,
  relation: 2000,
  organization: 3000,
  geographical: 4000,
}

// ─────────────────────────────────────────────────────────────────────────────
// Transactions & permissions (the app "features")
// ─────────────────────────────────────────────────────────────────────────────

/** App areas — the five bottom tabs. */
export type AppArea = 'home' | 'messages' | 'notification' | 'tools' | 'settings'

/** Every actionable feature in the app. Profiles grant permission levels per transaction. */
export type TransactionKey =
  // Home
  | 'post.send'
  | 'post.react'
  | 'post.comment'
  | 'post.forward'
  | 'post.save'
  | 'post.follow'
  // Messages
  | 'msg.send'
  | 'msg.reply'
  | 'msg.replyAll'
  | 'msg.forward'
  | 'msg.delete'
  | 'msg.save'
  // Notification tools (require accept/reject/clarify/complete/close)
  | 'note.task'
  | 'note.calendar'
  | 'note.offer'
  | 'note.voting'
  | 'note.event'
  | 'note.training'
  | 'note.tender'
  | 'note.other'
  // Tools
  | 'tool.idgateCode'
  | 'tool.idgatePass'
  | 'tool.idgateNote'
  | 'tool.complaint'
  | 'tool.meeting'
  | 'tool.conference'
  | 'tool.contactRequest'
  | 'tool.delegationDisplay'
  | 'tool.linkRequest'
  | 'tool.createVacancy'
  | 'tool.displayVacancy'
  | 'tool.talentAcquisition'
  | 'tool.advertising'
  | 'tool.publishing'
  | 'tool.valuation'
  | 'tool.location'
  // Master-data admin transactions (used by profiles)
  | 'admin.createVirtualAccount'
  | 'admin.changeVirtualAccount'
  | 'admin.deleteVirtualAccount'
  | 'admin.createLinkRequest'
  | 'admin.acceptLinkRequest'
  | 'admin.createGroupNormal'
  | 'admin.createGroupVirtual'

/** Permission levels a profile may grant per transaction. */
export interface PermissionSet {
  create: boolean
  change: boolean
  display: boolean
  delete: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Master data — Natural person
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Assurance tier earned by a personal account through identity proofing:
 *   basic     — contact channels (mobile/email) verified only
 *   verified  — + national-ID document + face/liveness + registry match
 *   authority — + cleared to act as an entity Admin / Managing Director
 */
export type VerificationLevel = 'basic' | 'verified' | 'authority'

export interface VerificationInfo {
  level: VerificationLevel
  contact?: boolean
  document?: boolean
  liveness?: boolean
  registry?: boolean
  verifiedAt?: string
}

export interface NormalCharacter {
  id: string
  firstName: string
  surname: string
  fullName: string
  gender: 'Male' | 'Female'
  dateOfBirth?: string
  nationalities: Country[]
  residenceCountry: Country
  city: string
  address1?: string
  nationalId?: string
  passports?: string[]
  drivingLicense?: string
  /** Identity-proofing outcome for this personal account (KYC). */
  verification?: VerificationInfo
  motherTongue: Language
  languages?: { language: Language; level: 'Basic' | 'Average' | 'Fluent' }[]
  contacts: {
    mobile: string
    landline?: string
    email?: string
    linkedIn?: string
    facebook?: string
    whatsApp?: string
  }
  education?: { school?: string; university?: string; postgraduate?: string; phd?: string }
  career?: { title?: string; profession?: string; field?: string; industry?: string; history?: string }
  vacancyNotification?: boolean
  privacy: {
    personalInfo: PrivacyLevel
    contactsInfo: PrivacyLevel
    education: PrivacyLevel
    career: PrivacyLevel
  }
  avatarColor: string // deterministic avatar tint
}

// ─────────────────────────────────────────────────────────────────────────────
// Master data — Legal entity (Corporate)
// ─────────────────────────────────────────────────────────────────────────────

export type EntityStatus = 'draft' | 'pending' | 'active' | 'rejected'

export interface LegalEntity {
  id: string
  communicationCode: string // Communication Area root (e.g. AABBCC123456789)
  entityCode: string
  formalName: string
  commercialName: string
  searchName: string
  orgLevel: OrgLevel
  orgType: OrgType
  legalEntityType: LegalEntityType
  mainIndustry: Industry
  subsidiaryIndustry?: string[]
  countryOfRegistration: Country
  cityOfRegistration?: string
  headquarterAddress?: string
  operationCountry?: Country
  /** Domain used in the virtual-character address (…@<domain>.OrgType.Legal). */
  domain: string
  status: EntityStatus
  dateOfOperation?: string
  /** Formal docs presented to the "investment authority" (the app). */
  documents: { commercialRegistration?: boolean; taxCard?: boolean; vatCertificate?: boolean }
  /** The Admin who opened the account (a natural person). */
  adminNormalId: string
  /** The responsible CEO/Managing Director natural person, auto-granted full authority on activation. */
  managingDirectorNormalId?: string
  logoColor: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Communication structures
// ─────────────────────────────────────────────────────────────────────────────

export interface StructureNode {
  id: string
  entityId: string
  kind: StructureKind
  code: number
  name: string
  level: number // 0 = root, 1 = level1, ...
  parentId: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Authorization
// ─────────────────────────────────────────────────────────────────────────────

export interface Profile {
  id: string
  entityId: string
  name: string
  /** Sparse map: only transactions with any granted level are listed. */
  permissions: Partial<Record<TransactionKey, PermissionSet>>
}

export interface DelegationItem {
  id: string
  entityId: string
  subject: string
  limit: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Positions & Virtual characters
// ─────────────────────────────────────────────────────────────────────────────

export interface Position {
  id: string
  entityId: string
  name: string // e.g. "CEO", "طالب بكالوريوس"
  description?: string
}

/**
 * A Virtual Character = a Position instance placed within the four structures,
 * granted a profile & delegation, optionally LINKED to a natural person (host).
 */
export interface VirtualCharacter {
  id: string
  entityId: string
  positionId: string
  positionName: string
  // one node id chosen from each structure
  structure: {
    corporate?: string
    relation?: string
    organization?: string
    geographical?: string
  }
  positionCode?: string
  additionalCodes?: string[]
  profileIds: string[]
  delegationSubjects: string[]
  delegationLimits: string[]
  delegationDisplay: boolean
  delegateOthers: boolean
  duration: { open: boolean; from?: string; to?: string }
  displayHistory: boolean
  location: PrivacyLevel
  /** Linked natural person id, or null when unlinked/inactive. */
  linkedNormalId: string | null
  status: 'unlinked' | 'active' | 'blocked'
  createdAt: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Groups (built from structures / positions / individuals)
// ─────────────────────────────────────────────────────────────────────────────

export interface Group {
  id: string
  entityId: string
  ownerVirtualId: string
  name: string
  // selection criteria — any combination
  positionName?: string
  corporateNodeId?: string
  relationNodeId?: string
  organizationNodeId?: string
  geographicalNodeId?: string
  explicitMemberIds?: string[] // individual virtual-character ids
}

// ─────────────────────────────────────────────────────────────────────────────
// Communication artefacts
// ─────────────────────────────────────────────────────────────────────────────

/** The identity that authored/received something: a personal account OR a virtual character. */
export type ActorRef =
  | { kind: 'normal'; normalId: string }
  | { kind: 'virtual'; virtualId: string }

export interface Post {
  id: string
  author: ActorRef
  body: string
  createdAt: string
  category: 'friend' | 'news' | 'report' | 'event' | 'advertising' | 'data'
  reactions: number
  comments: { id: string; author: ActorRef; body: string; createdAt: string }[]
  reactedBy: string[] // account keys
  savedBy: string[]
}

export interface Message {
  id: string
  from: ActorRef
  to: ActorRef[]
  cc?: ActorRef[]
  subject: string
  body: string
  createdAt: string
  threadId: string
  readBy: string[]
  savedBy: string[]
}

export type NoteKind =
  | 'task'
  | 'calendar'
  | 'offer'
  | 'voting'
  | 'event'
  | 'training'
  | 'tender'
  | 'complaint'
  | 'idgate'
  | 'meeting'
  | 'conference'
  | 'other'

export type NoteStatus = 'pending' | 'accepted' | 'rejected' | 'clarify' | 'completed' | 'closed'

export interface Notification {
  id: string
  kind: NoteKind
  from: ActorRef
  to: ActorRef[]
  subject: string
  body: string
  createdAt: string
  targetDate?: string
  /** Whether this note type expects an accept/reject/clarify/complete/close reaction. */
  needsResponse: boolean
  status: NoteStatus
  /** Voting tally when kind === 'voting'. */
  votes?: { accept: number; reject: number }
  history: { at: string; by: ActorRef; action: string }[]
}

// A job vacancy posted by a company (Tools → Create Vacancy).
export interface Vacancy {
  id: string
  entityId: string
  postedByVirtualId: string
  title: string
  positionName?: string
  location?: string
  industry?: Industry
  description: string
  createdAt: string
  applicants: string[] // normalIds
}

// ─────────────────────────────────────────────────────────────────────────────
// Contacts / linking requests
// ─────────────────────────────────────────────────────────────────────────────

export interface ContactRequest {
  id: string
  from: ActorRef
  to: ActorRef
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: string
}

export interface LinkRequest {
  id: string
  entityId: string
  virtualId: string
  /** natural person the entity wants to link this position to. */
  targetNormalId: string
  direction: 'entity-to-person' | 'person-to-entity'
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Session
// ─────────────────────────────────────────────────────────────────────────────

/** The "account" a natural person is currently acting as. */
export type ActiveAccount =
  | { kind: 'normal'; normalId: string }
  | { kind: 'virtual'; virtualId: string }

export interface Session {
  /** The signed-in natural person. */
  normalId: string | null
  /** Which of their accounts is currently active (personal or a hosted virtual). */
  active: ActiveAccount | null
}
