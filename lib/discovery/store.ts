import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { DiscoveryData, WizardStep, RapportItem } from './types'

interface ValidationState {
  [key: string]: boolean
}

interface DiscoveryStore {
  // Session data
  sessionId: string
  data: DiscoveryData
  validation: ValidationState
  currentStep: WizardStep
  startTime: number
  lastSaveTime: number
  isDirty: boolean

  // Actions
  initSession: (sessionId?: string) => void
  updateData: (path: string, value: any) => void
  setData: (data: Partial<DiscoveryData>) => void
  addRapportItem: (text: string) => void
  setCurrentStep: (step: WizardStep) => void
  validateStep: (step: WizardStep) => boolean
  markSaved: () => void
  markDirty: () => void
  reset: () => void
  loadSession: (data: DiscoveryData) => void
}

const createInitialData = (): DiscoveryData => ({
  client: {
    firstName: '',
    lastName: '',
    dob: '',
    zip: '',
    state: '',
    county: '',
    household: [],
    contact: {
      email: '',
      phone: ''
    }
  },
  discovery: {
    source: 'unknown',
    situationSummary: '',
    status: {
      losingCoverage: false,
      payingTooMuch: false,
      uninsured: false
    },
    understoodTwoCallFlow: false
  },
  coverage: {
    current: {
      carrier: '',
      channel: '',
      cobraOffered: false,
      cobraCost: null,
      lastDay: '',
      deductible: null,
      oopm: null,
      copays: '',
      network: '',
      premium: null,
      likes: '',
      dislikes: ''
    }
  },
  income: {
    year: 2025,
    amount: null,
    basis: ''
  },
  health: {
    conditions: [],
    medications: []
  },
  doctors: [],
  priorities: [],
  dentalVision: {
    dental: false,
    vision: false
  },
  lifeInsurance: {
    has: false,
    type: '',
    cashValue: null,
    throughEmployer: false
  },
  budget: {
    text: '',
    min: null,
    max: null
  },
  nextCall: {
    proposedSlots: [],
    spouseJoining: false,
    screenShareOk: false,
    inviteEmail: ''
  },
  privateMpEducation: {
    understood: false
  },
  rapport: [],
  meta: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    agent: '',
    sessionId: '',
    callDuration: 0
  }
})

// Helper to set nested object values using path
const setNestedValue = (obj: any, path: string, value: any) => {
  const keys = path.split('.')
  const lastKey = keys.pop()!
  const target = keys.reduce((acc, key) => {
    if (!acc[key]) acc[key] = {}
    return acc[key]
  }, obj)
  target[lastKey] = value
  return obj
}

export const useDiscoveryStore = create<DiscoveryStore>()(
  devtools(
    persist(
      (set, get) => ({
        sessionId: '',
        data: createInitialData(),
        validation: {},
        currentStep: 'intro',
        startTime: Date.now(),
        lastSaveTime: 0,
        isDirty: false,

        initSession: (sessionId?: string) => {
          const id = sessionId || `discovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          const initialData = createInitialData()
          initialData.meta.sessionId = id
          initialData.meta.createdAt = new Date().toISOString()
          
          set({
            sessionId: id,
            data: initialData,
            validation: {},
            currentStep: 'intro',
            startTime: Date.now(),
            lastSaveTime: 0,
            isDirty: false
          })
        },

        updateData: (path: string, value: any) => {
          set((state) => {
            const newData = { ...state.data }
            setNestedValue(newData, path, value)
            newData.meta.updatedAt = new Date().toISOString()
            return { 
              data: newData,
              isDirty: true
            }
          })
        },

        setData: (data: Partial<DiscoveryData>) => {
          set((state) => ({
            data: {
              ...state.data,
              ...data,
              meta: {
                ...state.data.meta,
                updatedAt: new Date().toISOString()
              }
            },
            isDirty: true
          }))
        },

        addRapportItem: (text: string) => {
          if (!text.trim()) return
          
          set((state) => {
            const newRapport: RapportItem = {
              ts: new Date().toISOString(),
              text: text.trim()
            }
            return {
              data: {
                ...state.data,
                rapport: [...state.data.rapport, newRapport],
                meta: {
                  ...state.data.meta,
                  updatedAt: new Date().toISOString()
                }
              },
              isDirty: true
            }
          })
        },

        setCurrentStep: (step: WizardStep) => {
          set({ currentStep: step })
        },

        validateStep: (step: WizardStep) => {
          const { data } = get()
          let isValid = true

          switch (step) {
            case 'intro':
              isValid = data.discovery.source !== 'unknown'
              break
            case 'purpose':
              isValid = data.discovery.understoodTwoCallFlow === true
              break
            case 'confirm-info':
              isValid = !!(data.client.zip && data.client.state)
              break
            case 'situation':
              isValid = !!data.discovery.situationSummary
              break
            case 'qualification':
              isValid = data.discovery.status.losingCoverage || 
                       data.discovery.status.payingTooMuch || 
                       data.discovery.status.uninsured
              break
            case 'closing':
              isValid = data.nextCall.proposedSlots.length > 0 && 
                       !!data.nextCall.inviteEmail
              break
          }

          set((state) => ({
            validation: {
              ...state.validation,
              [step]: isValid
            }
          }))

          return isValid
        },

        markSaved: () => {
          set({
            lastSaveTime: Date.now(),
            isDirty: false
          })
        },

        markDirty: () => {
          set({ isDirty: true })
        },

        reset: () => {
          set({
            sessionId: '',
            data: createInitialData(),
            validation: {},
            currentStep: 'intro',
            startTime: Date.now(),
            lastSaveTime: 0,
            isDirty: false
          })
        },

        loadSession: (data: DiscoveryData) => {
          set({
            sessionId: data.meta.sessionId,
            data,
            validation: {},
            currentStep: 'intro',
            isDirty: false,
            lastSaveTime: Date.now()
          })
        }
      }),
      {
        name: 'discovery-session',
        partialize: (state) => ({
          sessionId: state.sessionId,
          data: state.data,
          currentStep: state.currentStep
        })
      }
    )
  )
)