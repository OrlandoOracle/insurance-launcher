import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const sampleLeads = [
  {
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@example.com',
    phone: '(555) 123-4567',
    source: 'Website',
    stage: 'NEW' as const,
    tags: JSON.stringify(['hot-lead', 'insurance']),
  },
  {
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@example.com',
    phone: '(555) 234-5678',
    source: 'Referral',
    stage: 'WORKING' as const,
    tags: JSON.stringify(['referral', 'auto-insurance']),
  },
  {
    firstName: 'Michael',
    lastName: 'Williams',
    email: 'michael.williams@example.com',
    phone: '(555) 345-6789',
    source: 'Social Media',
    stage: 'QUALIFIED' as const,
    tags: JSON.stringify(['facebook', 'life-insurance']),
  },
  {
    firstName: 'Emily',
    lastName: 'Davis',
    email: 'emily.davis@example.com',
    phone: '(555) 456-7890',
    source: 'Website',
    stage: 'BOOKED' as const,
    tags: JSON.stringify(['scheduled', 'home-insurance']),
  },
  {
    firstName: 'Robert',
    lastName: 'Brown',
    email: 'robert.brown@example.com',
    phone: '(555) 567-8901',
    source: 'Import',
    stage: 'CLOSED' as const,
    tags: JSON.stringify(['customer', 'multi-policy']),
  },
  {
    firstName: 'Jennifer',
    lastName: 'Martinez',
    email: 'jennifer.martinez@example.com',
    phone: '(555) 678-9012',
    source: 'Referral',
    stage: 'NEW' as const,
    tags: JSON.stringify(['warm-lead']),
  },
  {
    firstName: 'David',
    lastName: 'Garcia',
    email: 'david.garcia@example.com',
    phone: '(555) 789-0123',
    source: 'Website',
    stage: 'WORKING' as const,
    tags: JSON.stringify(['health-insurance']),
  },
  {
    firstName: 'Lisa',
    lastName: 'Anderson',
    email: 'lisa.anderson@example.com',
    phone: '(555) 890-1234',
    source: 'Social Media',
    stage: 'QUALIFIED' as const,
    tags: JSON.stringify(['linkedin', 'business-insurance']),
  },
]

async function main() {
  console.log('Seeding leads...')
  
  // Check if we already have leads
  const existingLeads = await prisma.lead.count()
  
  if (existingLeads > 0) {
    console.log(`Already have ${existingLeads} leads in database`)
    return
  }
  
  // Create sample leads
  for (const lead of sampleLeads) {
    const created = await prisma.lead.create({
      data: {
        ...lead,
        lastContacted: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
      }
    })
    console.log(`Created lead: ${created.firstName} ${created.lastName}`)
    
    // Add some activities for some leads
    if (Math.random() > 0.5) {
      await prisma.activity.create({
        data: {
          contactId: created.id,
          type: Math.random() > 0.5 ? 'CALL' : 'EMAIL',
          summary: 'Initial contact',
          date: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000),
        }
      })
    }
  }
  
  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })