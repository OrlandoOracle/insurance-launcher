import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { ok: false, error: 'Lead ID is required' },
        { status: 400 }
      )
    }

    // Check if lead exists
    const lead = await prisma.lead.findUnique({
      where: { id }
    })

    if (!lead) {
      return NextResponse.json(
        { ok: false, error: 'Lead not found' },
        { status: 404 }
      )
    }

    // Update lead stage to NO_SHOW and set noShowAt
    const updatedLead = await prisma.lead.update({
      where: { id },
      data: {
        stage: 'NO_SHOW',
        noShowAt: new Date()
      }
    })

    return NextResponse.json({
      ok: true,
      lead: updatedLead
    })

  } catch (error: any) {
    console.error('[Mark No-Show] Error:', error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to mark as no-show' },
      { status: 500 }
    )
  }
}