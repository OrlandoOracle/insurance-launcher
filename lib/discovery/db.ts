import { prisma } from '@/lib/db'

/**
 * Get the most recent discovery session for a client
 */
export async function getDiscoverySessionByClientId(clientId: string) {
  return prisma.discoverySession.findFirst({
    where: { clientId },
    orderBy: { updatedAt: 'desc' },
    select: { 
      id: true, 
      sessionId: true,
      clientId: true, 
      clientName: true,
      updatedAt: true,
      createdAt: true
    }
  })
}

/**
 * Create a new discovery session for a client
 */
export async function createDiscoverySessionForClient(args: {
  clientId: string
  clientName?: string
  seed?: any // optional initial payload
}) {
  // Generate a unique session ID
  const sessionId = `discovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  // Create default discovery data structure
  const defaultPayload = {
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
      sessionId,
      clientId: args.clientId
    }
  }
  
  // Merge with any seed data provided
  const jsonPayload = args.seed ? { ...defaultPayload, ...args.seed } : defaultPayload
  
  // Parse client name if provided
  if (args.clientName) {
    const nameParts = args.clientName.split(' ')
    if (nameParts.length >= 2) {
      jsonPayload.client.firstName = nameParts[0]
      jsonPayload.client.lastName = nameParts.slice(1).join(' ')
    } else {
      jsonPayload.client.firstName = args.clientName
    }
  }
  
  return prisma.discoverySession.create({
    data: {
      sessionId,
      clientId: args.clientId,
      clientName: args.clientName ?? null,
      jsonPayload,
      yamlPayload: '',
      rapport: []
    },
    select: { 
      id: true, 
      sessionId: true,
      clientId: true, 
      createdAt: true 
    }
  })
}

/**
 * Get all discovery sessions for a client
 */
export async function getDiscoverySessionsByClientId(clientId: string) {
  return prisma.discoverySession.findMany({
    where: { clientId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      sessionId: true,
      clientName: true,
      createdAt: true,
      updatedAt: true
    }
  })
}