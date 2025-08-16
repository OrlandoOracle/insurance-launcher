import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ActivityType } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const activity = await prisma.activity.create({
      data: {
        contactId: body.contactId,
        type: body.type as ActivityType,
        summary: body.summary,
        details: body.details,
        date: body.date ? new Date(body.date) : new Date(),
        count: body.count,
        revenue: body.revenue,
        notes: body.notes,
        voicemail: body.voicemail || false,
        smsSent: body.smsSent || false
      }
    })

    return NextResponse.json(activity)
  } catch (error) {
    console.error('[Activities API] Error creating activity:', error)
    return NextResponse.json(
      { error: 'Failed to create activity' },
      { status: 500 }
    )
  }
}