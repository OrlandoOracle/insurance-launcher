'use server'

import { prisma } from '@/lib/db'
import { Lead, Activity, Outcome, ActivityType, Direction, LeadStage } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export async function getContacts(filters?: {
  search?: string
  stage?: string
  source?: string
  stages?: LeadStage[]
  tags?: string[]
  noNextAction?: boolean
}) {
  const where: any = {}
  
  if (filters?.stage && filters.stage !== 'all') {
    where.stage = filters.stage
  }
  
  if (filters?.stages && filters.stages.length > 0) {
    where.stage = { in: filters.stages }
  }
  
  if (filters?.source && filters.source !== 'all') {
    where.source = filters.source
  }
  
  if (filters?.search) {
    where.OR = [
      { firstName: { contains: filters.search, mode: 'insensitive' } },
      { lastName: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
      { phone: { contains: filters.search } },
      { source: { contains: filters.search, mode: 'insensitive' } },
    ]
  }
  
  let contacts = await prisma.lead.findMany({
    where,
    include: {
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 1
      },
      tasks: {
        where: { status: 'OPEN' },
        orderBy: { dueAt: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
  
  // Filter by tags if specified
  if (filters?.tags && filters.tags.length > 0) {
    contacts = contacts.filter(contact => {
      const contactTags = JSON.parse(contact.tags || '[]')
      return filters.tags!.some(tag => contactTags.includes(tag))
    })
  }
  
  // Filter by no next action if specified
  if (filters?.noNextAction) {
    contacts = contacts.filter(contact => contact.tasks.length === 0)
  }
  
  return contacts
}

export async function getAllTags(): Promise<string[]> {
  try {
    const contacts = await prisma.lead.findMany({
      select: { tags: true }
    })
    
    const tagSet = new Set<string>()
    contacts.forEach(contact => {
      const tags = JSON.parse(contact.tags || '[]')
      tags.forEach((tag: string) => tagSet.add(tag))
    })
    
    return Array.from(tagSet).sort()
  } catch (error: any) {
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.warn('[Contacts:Tags] Table missing, returning empty array')
      return []
    }
    console.error('[Contacts:Tags] Error fetching tags:', error)
    throw error
  }
}

export async function getContact(id: string) {
  return prisma.lead.findUnique({
    where: { id },
    include: {
      activities: {
        orderBy: { createdAt: 'desc' }
      },
      tasks: {
        orderBy: { createdAt: 'desc' }
      }
    }
  })
}

export async function createContact(data: {
  firstName: string
  lastName: string
  email: string
  phone: string
  source?: string
  ghlUrl?: string
  tags?: string[]
}) {
  // Check for duplicates
  const existingWhere: any[] = []
  if (data.email) {
    existingWhere.push({ email: data.email })
  }
  if (data.phone) {
    existingWhere.push({ phone: data.phone })
  }
  
  if (existingWhere.length > 0) {
    const existing = await prisma.lead.findFirst({
      where: { OR: existingWhere }
    })
    
    if (existing) {
      throw new Error('A contact with this email or phone already exists')
    }
  }
  
  const contact = await prisma.lead.create({
    data: {
      ...data,
      tags: JSON.stringify(data.tags || [])
    }
  })
  
  // Add activity
  await prisma.activity.create({
    data: {
      contactId: contact.id,
      type: 'NOTE',
      summary: 'Created via form'
    }
  })
  
  revalidatePath('/leads')
  return contact
}

export async function updateContact(id: string, data: Partial<{
  firstName: string
  lastName: string
  email: string
  phone: string
  source: string
  ghlUrl: string
  tags: string[]
  stage: LeadStage
}>) {
  const updateData: any = { ...data }
  if (data.tags) {
    updateData.tags = JSON.stringify(data.tags)
  }
  
  const contact = await prisma.lead.update({
    where: { id },
    data: updateData
  })
  
  revalidatePath('/leads')
  revalidatePath(`/leads/${id}`)
  return contact
}

export async function deleteContact(id: string) {
  await prisma.lead.delete({
    where: { id }
  })
  
  revalidatePath('/leads')
}

export async function addActivity(contactId: string, data: {
  type: ActivityType
  summary: string
  details?: string
  direction?: Direction
  outcome?: Outcome
  revenue?: number
}) {
  const activity = await prisma.activity.create({
    data: {
      ...data,
      contactId
    }
  })
  
  // Handle follow-up logic for dials without connect
  if (data.outcome === 'DIAL' && data.type === 'CALL') {
    // Create follow-up task automatically
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(10, 0, 0, 0)
    
    await prisma.task.create({
      data: {
        contactId,
        title: 'Follow up on call attempt',
        dueAt: tomorrow,
        source: 'SYSTEM'
      }
    })
  }
  
  // Handle connect logic
  if (data.outcome === 'CONNECT') {
    // Will prompt for next steps in UI
  }
  
  // Handle close logic
  if (data.outcome === 'CLOSE') {
    // Mark all open tasks as done
    await prisma.task.updateMany({
      where: {
        contactId,
        status: 'OPEN'
      },
      data: {
        status: 'DONE'
      }
    })
  }
  
  revalidatePath(`/leads/${contactId}`)
  return activity
}

export async function importContacts(contacts: Array<{
  firstName: string
  lastName: string
  email: string
  phone: string
  source?: string
}>) {
  const results = {
    imported: 0,
    skipped: 0,
    errors: [] as string[]
  }
  
  for (const contact of contacts) {
    try {
      // Check for duplicates
      const existing = await prisma.lead.findFirst({
        where: {
          OR: [
            { email: contact.email },
            { phone: contact.phone }
          ]
        }
      })
      
      if (existing) {
        results.skipped++
        continue
      }
      
      // Create new contact
      const newContact = await prisma.lead.create({
        data: {
          ...contact,
          tags: '[]'
        }
      })
      
      // Add import activity
      await prisma.activity.create({
        data: {
          contactId: newContact.id,
          type: 'NOTE',
          summary: 'Imported via CSV'
        }
      })
      
      results.imported++
    } catch (error) {
      results.errors.push(`Failed to import ${contact.email}: ${error}`)
    }
  }
  
  revalidatePath('/leads')
  return results
}