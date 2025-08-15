import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface ImportContact {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  howHeard?: string
}

function normalizeEmail(email?: string): string | undefined {
  return email?.toLowerCase().trim()
}

function normalizePhone(phone?: string): string | undefined {
  if (!phone) return undefined
  // Strip all non-digits
  return phone.replace(/\D/g, '')
}

export async function POST(request: NextRequest) {
  try {
    const contacts: ImportContact[] = await request.json()
    
    let createdCount = 0
    let skippedCount = 0
    let errorCount = 0
    const errors: string[] = []
    
    for (const contact of contacts) {
      try {
        // Validate required fields
        if (!contact.firstName || !contact.lastName) {
          errorCount++
          errors.push(`Missing name for contact: ${JSON.stringify(contact)}`)
          continue
        }
        
        const normalizedEmail = normalizeEmail(contact.email)
        const normalizedPhone = normalizePhone(contact.phone)
        
        // Must have email or phone
        if (!normalizedEmail && !normalizedPhone) {
          errorCount++
          errors.push(`Contact must have email or phone: ${contact.firstName} ${contact.lastName}`)
          continue
        }
        
        // Check for duplicates
        const existingWhere: any[] = []
        if (normalizedEmail) {
          existingWhere.push({ email: normalizedEmail })
        }
        if (normalizedPhone) {
          existingWhere.push({ phone: normalizedPhone })
        }
        
        const existing = await prisma.contact.findFirst({
          where: {
            OR: existingWhere
          }
        })
        
        if (existing) {
          skippedCount++
          continue
        }
        
        // Create the contact
        const newContact = await prisma.contact.create({
          data: {
            firstName: contact.firstName.trim(),
            lastName: contact.lastName.trim(),
            email: normalizedEmail || '',
            phone: normalizedPhone || '',
            howHeard: contact.howHeard?.trim() || null,
            stage: 'NEW_LEAD',
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
        
        // Auto-create follow-up task
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(10, 0, 0, 0)
        
        await prisma.task.create({
          data: {
            contactId: newContact.id,
            title: 'Call new lead',
            dueAt: tomorrow,
            status: 'OPEN',
            source: 'SYSTEM'
          }
        })
        
        createdCount++
      } catch (error) {
        errorCount++
        errors.push(`Error importing ${contact.firstName} ${contact.lastName}: ${error}`)
      }
    }
    
    return NextResponse.json({
      success: true,
      createdCount,
      skippedCount,
      errorCount,
      errors: errors.slice(0, 10), // Limit error messages
      totalProcessed: contacts.length
    })
  } catch (error) {
    console.error('[Import] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to import contacts',
        details: String(error)
      },
      { status: 500 }
    )
  }
}