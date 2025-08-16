'use client'

import { useEffect } from 'react'
import { useDiscoveryStore } from '@/lib/discovery/store'
import { DiscoveryData } from '@/lib/discovery/types'
import { PreviewPanel } from '@/components/discovery/PreviewPanel'
import { RapportPad } from '@/components/discovery/RapportPad'

interface EditorProps {
  session: {
    id: string
    sessionId: string
    clientName: string | null
    jsonPayload: any
    yamlPayload: string
    rapport: any
    createdAt: Date
    updatedAt: Date
  }
}

export default function DiscoveryEditor({ session }: EditorProps) {
  const { loadSession } = useDiscoveryStore()

  useEffect(() => {
    // Load the session data into the store
    const data = session.jsonPayload as DiscoveryData
    loadSession(data)
  }, [session])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Discovery Session</h1>
          <p className="text-muted-foreground mt-1">
            {session.clientName || 'Unknown Client'} - Created {new Date(session.createdAt).toLocaleDateString()}
          </p>
        </div>
        
        <PreviewPanel />
      </div>
      
      <RapportPad />
    </div>
  )
}