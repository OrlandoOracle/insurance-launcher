import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
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

    // Update lead with provided data
    const updatedLead = await prisma.lead.update({
      where: { id },
      data: body
    })

    return NextResponse.json({
      ok: true,
      lead: updatedLead
    })

  } catch (error: any) {
    console.error('[Update Lead] Error:', error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to update lead' },
      { status: 500 }
    )
  }
}