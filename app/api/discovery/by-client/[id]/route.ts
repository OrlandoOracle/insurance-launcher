import { NextRequest, NextResponse } from 'next/server'
import { 
  getDiscoverySessionByClientId, 
  createDiscoverySessionForClient 
} from '@/lib/discovery/db'

/**
 * GET /api/discovery/by-client/[id]
 * Check if a discovery session exists for a client
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing clientId' }, 
        { status: 400 }
      )
    }

    const session = await getDiscoverySessionByClientId(id)
    
    if (!session) {
      return NextResponse.json({ 
        exists: false, 
        sessionId: null,
        clientId: id
      })
    }
    
    return NextResponse.json({ 
      exists: true, 
      sessionId: session.sessionId,
      id: session.id,
      clientId: session.clientId,
      clientName: session.clientName,
      updatedAt: session.updatedAt,
      createdAt: session.createdAt
    })
  } catch (error: any) {
    console.error('[Discovery By Client] GET Error:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Server error' }, 
      { status: 500 }
    )
  }
}

/**
 * POST /api/discovery/by-client/[id]
 * Create a new discovery session for a client
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing clientId' }, 
        { status: 400 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const { clientName, seed } = body ?? {}
    
    const created = await createDiscoverySessionForClient({ 
      clientId: id, 
      clientName, 
      seed 
    })
    
    return NextResponse.json({ 
      success: true,
      sessionId: created.sessionId,
      id: created.id,
      clientId: created.clientId,
      createdAt: created.createdAt
    })
  } catch (error: any) {
    console.error('[Discovery By Client] POST Error:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Server error' }, 
      { status: 500 }
    )
  }
}