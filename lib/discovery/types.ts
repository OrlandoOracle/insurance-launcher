export interface HouseholdMember {
  firstName: string
  lastName: string
  dob: string
  relationship: string
}

export interface Medication {
  name: string
  dose: string
  frequency: string
  purpose: string
}

export interface Doctor {
  firstName: string
  lastName: string
  specialty: string
  city: string
  state: string
  clinic: string
  notes: string
}

export interface TimeSlot {
  date: string
  start: string
  end: string
}

export interface RapportItem {
  ts: string
  text: string
}

export interface CurrentCoverage {
  carrier: string
  channel: 'employer' | 'marketplace' | 'private' | ''
  cobraOffered: boolean
  cobraCost: number | null
  lastDay: string
  deductible: number | null
  oopm: number | null
  copays: string
  network: string
  premium: number | null
  likes: string
  dislikes: string
}

export interface UninsuredCoverage {
  lastInsuredDate: string
  lastCarrier: string
  lastPlanDetails: string
  lastPremium: number | null
}

export interface DiscoveryData {
  client: {
    firstName: string
    lastName: string
    dob: string
    zip: string
    state: string
    county: string
    household: HouseholdMember[]
    contact: {
      email: string
      phone: string
    }
  }
  discovery: {
    source: 'publicsq' | 'instagram' | 'social' | 'dcdraino' | 'truth' | 'other' | 'unknown'
    sourceOther?: string
    situationSummary: string
    status: {
      losingCoverage: boolean
      payingTooMuch: boolean
      uninsured: boolean
    }
    understoodTwoCallFlow: boolean
  }
  coverage: {
    current: CurrentCoverage
    uninsured?: UninsuredCoverage
  }
  income: {
    year: number
    amount: number | null
    basis: 'gross' | 'after_tax' | ''
  }
  health: {
    conditions: string[]
    medications: Medication[]
  }
  doctors: Doctor[]
  priorities: string[]
  dentalVision: {
    dental: boolean
    vision: boolean
  }
  lifeInsurance: {
    has: boolean
    type: 'term' | 'whole' | 'unknown' | ''
    cashValue: number | null
    throughEmployer: boolean
  }
  budget: {
    text: string
    min: number | null
    max: number | null
  }
  nextCall: {
    proposedSlots: TimeSlot[]
    spouseJoining: boolean
    screenShareOk: boolean
    inviteEmail: string
  }
  privateMpEducation: {
    understood: boolean
  }
  rapport: RapportItem[]
  meta: {
    createdAt: string
    updatedAt: string
    agent: string
    sessionId: string
    callDuration?: number
  }
}

export const WIZARD_STEPS = [
  { id: 'intro', label: 'Introduction', required: true },
  { id: 'purpose', label: 'Purpose of Call', required: true },
  { id: 'confirm-info', label: 'Confirm Info', required: true },
  { id: 'situation', label: 'Situation', required: true },
  { id: 'qualification', label: 'Qualification', required: true },
  { id: 'education', label: 'Private vs Marketplace', required: false },
  { id: 'discounts', label: 'Discounts & Income', required: false },
  { id: 'health', label: 'Health & Medications', required: false },
  { id: 'doctors', label: 'Doctor Preferences', required: false },
  { id: 'priorities', label: 'Priorities', required: false },
  { id: 'dental-vision', label: 'Dental & Vision', required: false },
  { id: 'life', label: 'Life Insurance', required: false },
  { id: 'budget', label: 'Budget', required: false },
  { id: 'closing', label: 'Next Steps', required: true }
] as const

export type WizardStep = typeof WIZARD_STEPS[number]['id']

export const SOURCE_OPTIONS = [
  { value: 'publicsq', label: 'PublicSQ' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'social', label: 'Social Media' },
  { value: 'dcdraino', label: 'DC Draino' },
  { value: 'truth', label: 'Truth Social' },
  { value: 'other', label: 'Other' },
  { value: 'unknown', label: "Don't Know" }
] as const

export const CHANNEL_OPTIONS = [
  { value: 'employer', label: 'Through Employer' },
  { value: 'marketplace', label: 'Marketplace/Exchange' },
  { value: 'private', label: 'Private/Direct' }
] as const

export const PRIORITY_OPTIONS = [
  { value: 'catastrophic', label: 'Catastrophic Coverage' },
  { value: 'maternity', label: 'Maternity' },
  { value: 'preventive', label: 'Preventive Care' },
  { value: 'accident', label: 'Accident Protection' },
  { value: 'better', label: 'Better Overall Coverage' },
  { value: 'hsa', label: 'HSA Compatible' },
  { value: 'other', label: 'Other' }
] as const

export const RELATIONSHIP_OPTIONS = [
  { value: 'spouse', label: 'Spouse' },
  { value: 'child', label: 'Child' },
  { value: 'dependent', label: 'Dependent' },
  { value: 'other', label: 'Other' }
] as const