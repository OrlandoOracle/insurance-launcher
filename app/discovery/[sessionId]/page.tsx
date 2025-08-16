import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import DiscoveryEditor from './editor'

interface PageProps {
  params: Promise<{
    sessionId: string
  }>
}

export default async function DiscoverySessionPage({ params }: PageProps) {
  const { sessionId } = await params
  const session = await prisma.discoverySession.findUnique({
    where: { sessionId }
  })

  if (!session) {
    notFound()
  }

  return <DiscoveryEditor session={session} />
}