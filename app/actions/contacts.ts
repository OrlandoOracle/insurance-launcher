'use server'

import { prisma } from '@/lib/db'
import { Contact, Activity, Outcome, ActivityType, Direction, Stage } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export async function getContacts(searchQuery?: string, stage?: Stage) {
  const where: any = {}
  
  if (stage) {
    where.stage = stage
  }
  
  if (searchQuery) {
    where.OR = [
      { firstName: { contains: searchQuery, mode: 'insensitive' } },
      { lastName: { contains: searchQuery, mode: 'insensitive' } },
      { email: { contains: searchQuery, mode: 'insensitive' } },
      { phone: { contains: searchQuery } },
      { howHeard: { contains: searchQuery, mode: 'insensitive' } },
    ]
  }
  
  return prisma.contact.findMany({
    where,
    include: {
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 1
      },
      tasks: {
        where: { status: 'OPEN' },
        orderBy: { dueAt: 'asc' },
        take: 1
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}

export async function getContact(id: string) {
  return prisma.contact.findUnique({
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
  howHeard?: string
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
    const existing = await prisma.contact.findFirst({
      where: { OR: existingWhere }
    })
    
    if (existing) {
      throw new Error('A contact with this email or phone already exists')
    }
  }
  
  const contact = await prisma.contact.create({
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
  howHeard: string
  ghlUrl: string
  tags: string[]
  stage: Stage
}>) {
  const updateData: any = { ...data }
  if (data.tags) {
    updateData.tags = JSON.stringify(data.tags)
  }
  
  const contact = await prisma.contact.update({
    where: { id },
    data: updateData
  })
  
  revalidatePath('/leads')
  revalidatePath(`/leads/${id}`)
  return contact
}

export async function deleteContact(id: string) {
  await prisma.contact.delete({
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
  howHeard?: string
}>) {
  const results = {
    imported: 0,
    skipped: 0,
    errors: [] as string[]
  }
  
  for (const contact of contacts) {
    try {
      // Check for duplicates
      const existing = await prisma.contact.findFirst({
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
      const newContact = await prisma.contact.create({
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