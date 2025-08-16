import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { formatToYAML } from '@/lib/discovery/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, data, yamlPayload, callDuration } = body

    if (!sessionId || !data) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Update call duration if provided
    if (callDuration) {
      data.meta.callDuration = callDuration
    }

    // Generate YAML if not provided
    const yaml = yamlPayload || formatToYAML(data)

    // Extract key fields for database columns
    const clientName = data.client.firstName && data.client.lastName
      ? `${data.client.firstName} ${data.client.lastName}`
      : data.client.firstName || data.client.lastName || null

    // Extract clientId if present in metadata
    const clientId = data.meta?.clientId || null

    // Upsert the discovery session
    const session = await prisma.discoverySession.upsert({
      where: { sessionId },
      update: {
        clientId,
        clientName,
        primaryDob: data.client.dob || null,
        zip: data.client.zip || null,
        state: data.client.state || null,
        county: data.client.county || null,
        jsonPayload: data,
        yamlPayload: yaml,
        rapport: data.rapport || []
      },
      create: {
        sessionId,
        clientId,
        clientName,
        primaryDob: data.client.dob || null,
        zip: data.client.zip || null,
        state: data.client.state || null,
        county: data.client.county || null,
        jsonPayload: data,
        yamlPayload: yaml,
        rapport: data.rapport || []
      }
    })

    return NextResponse.json({
      success: true,
      sessionId: session.sessionId,
      id: session.id
    })

  } catch (error) {
    console.error('[Discovery Save] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save discovery session' },
      { status: 500 }
    )
  }
}