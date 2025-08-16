import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import DiscoveryEditor from './editor'

interface PageProps {
  params: {
    sessionId: string
  }
}

export default async function DiscoverySessionPage({ params }: PageProps) {
  const session = await prisma.discoverySession.findUnique({
    where: { sessionId: params.sessionId }
  })

  if (!session) {
    notFound()
  }

  return <DiscoveryEditor session={session} />
}