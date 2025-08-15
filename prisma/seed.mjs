import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'

// Ensure proper database path
const dataDir = process.env.DATA_DIR?.trim() || path.resolve(process.cwd(), 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}
const dbPath = path.join(dataDir, 'insurance-launcher.db')
process.env.DATABASE_URL = `file:${dbPath}`

console.log('[Seed] Using database at:', dbPath)

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')
  
  // Create or update settings (idempotent)
  const settings = await prisma.setting.upsert({
    where: { id: 'singleton' },
    update: {
      dataDir: dataDir
    },
    create: {
      id: 'singleton',
      kixieUrl: 'https://app.kixie.com',
      dataDir: dataDir
    }
  })
  console.log('✓ Settings configured')
  
  // Create sample contacts (idempotent - check by email)
  const contacts = [
    {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@example.com',
      phone: '(555) 123-4567',
      howHeard: 'Facebook Ad',
      stage: 'NEW_LEAD',
      tags: JSON.stringify(['hot-lead', 'facebook'])
    },
    {
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.j@example.com',
      phone: '(555) 234-5678',
      howHeard: 'Google Search',
      stage: 'NEW_LEAD',
      tags: JSON.stringify(['follow-up'])
    },
    {
      firstName: 'Mike',
      lastName: 'Williams',
      email: 'mike.w@example.com',
      phone: '(555) 345-6789',
      howHeard: 'Referral - Tom Brown',
      stage: 'NEW_LEAD',
      tags: JSON.stringify(['referral', 'priority'])
    },
    {
      firstName: 'Emily',
      lastName: 'Davis',
      email: 'emily.davis@example.com',
      phone: '(555) 456-7890',
      howHeard: 'LinkedIn',
      stage: 'NEW_LEAD',
      tags: JSON.stringify(['linkedin', 'professional'])
    },
    {
      firstName: 'Robert',
      lastName: 'Martinez',
      email: 'robert.m@example.com',
      phone: '(555) 567-8901',
      howHeard: 'Cold Call',
      stage: 'NEW_LEAD',
      tags: JSON.stringify(['cold-lead'])
    }
  ]
  
  let contactsCreated = 0
  for (const contactData of contacts) {
    const existing = await prisma.contact.findFirst({
      where: { email: contactData.email }
    })
    
    if (!existing) {
      const contact = await prisma.contact.create({
        data: contactData
      })
      contactsCreated++
      
      // Add some activities for specific contacts
      if (contactData.firstName === 'John') {
        await prisma.activity.create({
          data: {
            contactId: contact.id,
            type: 'CALL',
            summary: 'Initial call - Connected',
            outcome: 'CONNECT',
            direction: 'OUTBOUND'
          }
        })
        
        await prisma.activity.create({
          data: {
            contactId: contact.id,
            type: 'NOTE',
            summary: 'Interested in family coverage, has 2 kids'
          }
        })
      }
      
      if (contactData.firstName === 'Sarah') {
        await prisma.activity.create({
          data: {
            contactId: contact.id,
            type: 'CALL',
            summary: 'Call attempt - No answer',
            outcome: 'DIAL',
            direction: 'OUTBOUND'
          }
        })
      }
      
      if (contactData.firstName === 'Mike') {
        await prisma.activity.create({
          data: {
            contactId: contact.id,
            type: 'CALL',
            summary: 'Closed deal!',
            outcome: 'CLOSE',
            direction: 'OUTBOUND',
            revenue: 1500
          }
        })
      }
    }
  }
  console.log(`✓ ${contactsCreated} contacts created (${contacts.length - contactsCreated} already existed)`)
  
  // Create sample tasks (idempotent)
  const johnContact = await prisma.contact.findFirst({
    where: { firstName: 'John', lastName: 'Smith' }
  })
  
  const sarahContact = await prisma.contact.findFirst({
    where: { firstName: 'Sarah', lastName: 'Johnson' }
  })
  
  if (johnContact) {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(10, 0, 0, 0)
    
    const existingTask = await prisma.task.findFirst({
      where: {
        contactId: johnContact.id,
        title: 'Send quote for family plan'
      }
    })
    
    if (!existingTask) {
      await prisma.task.create({
        data: {
          contactId: johnContact.id,
          title: 'Send quote for family plan',
          dueAt: tomorrow,
          status: 'OPEN',
          source: 'MANUAL'
        }
      })
      console.log('✓ Created task for John')
    }
  }
  
  if (sarahContact) {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    
    const existingTask = await prisma.task.findFirst({
      where: {
        contactId: sarahContact.id,
        title: 'Follow up on initial call'
      }
    })
    
    if (!existingTask) {
      await prisma.task.create({
        data: {
          contactId: sarahContact.id,
          title: 'Follow up on initial call',
          dueAt: yesterday,
          status: 'OPEN',
          source: 'SYSTEM'
        }
      })
      console.log('✓ Created overdue task for Sarah')
    }
  }
  
  // Create general task
  const generalTask = await prisma.task.findFirst({
    where: {
      title: 'Review weekly KPIs',
      contactId: null
    }
  })
  
  if (!generalTask) {
    await prisma.task.create({
      data: {
        title: 'Review weekly KPIs',
        status: 'OPEN',
        source: 'MANUAL'
      }
    })
    console.log('✓ Created general task')
  }
  
  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })