import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { LeadDetailClient } from '@/components/lead/LeadDetailClient'

export default async function LeadDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      activities: {
        orderBy: { createdAt: 'desc' }
      },
      tasks: {
        orderBy: [
          { status: 'asc' },
          { dueAt: 'asc' },
          { createdAt: 'desc' }
        ]
      }
    }
  })

  if (!lead) {
    notFound()
  }

  return (
    <section className="h-full flex flex-col">
      <LeadDetailClient initialLead={lead} />
    </section>
  )
}