import { prisma } from '@/lib/db'
import { LeadsClient } from '@/components/leads-client'

export default async function LeadsPage() {
  // Fetch initial data on the server
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,  // Increased limit for scrolling test
    include: {
      activities: {
        orderBy: { date: 'desc' },
        take: 1
      }
    }
  })

  // Transform to match expected format
  const contacts = leads.map(lead => ({
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    source: lead.source,
    stage: lead.stage,
    lastContacted: lead.lastContacted,
    archivedAt: lead.archivedAt,
    noShowAt: lead.noShowAt,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
    ghlUrl: lead.ghlUrl,
    tags: lead.tags,
    activities: lead.activities
  }))

  return (
    <section className="h-full flex flex-col">
      <LeadsClient initialContacts={contacts} />
    </section>
  )
}