'use server'

import { prisma } from '@/lib/db'
import { startOfDay, subDays } from 'date-fns'
import { ActivityType } from '@prisma/client'
import { getKpis, getRangeFromPreset, type KpiRange } from '@/lib/kpi'
import { revalidatePath } from 'next/cache'

export async function getKPIs(days: number = 7) {
  try {
    const startDate = days === 0 ? startOfDay(new Date()) : subDays(startOfDay(new Date()), days - 1)
    
    const activities = await prisma.activity.findMany({
      where: {
        createdAt: {
          gte: startDate
        },
        type: 'CALL'
      }
    })
    
    const dials = activities.filter(a => a.outcome === 'DIAL').length
    const connects = activities.filter(a => a.outcome === 'CONNECT').length
    const closes = activities.filter(a => a.outcome === 'CLOSE').length
    const revenue = activities
      .filter(a => a.outcome === 'CLOSE' && a.revenue)
      .reduce((sum, a) => sum + (a.revenue || 0), 0)
    
    return {
      dials,
      connects,
      closes,
      revenue,
      conversionRate: dials > 0 ? ((closes / dials) * 100).toFixed(1) : '0'
    }
  } catch (error: any) {
    // Check if error is due to missing tables
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.warn('[KPI] Tables missing, returning empty KPI set. Run: npm run db:ensure')
      return {
        dials: 0,
        connects: 0,
        closes: 0,
        revenue: 0,
        conversionRate: '0'
      }
    }
    
    // Re-throw other errors
    console.error('[KPI] Error fetching KPIs:', error)
    throw error
  }
}

export async function getKPIsSafe(days: number = 7) {
  try {
    return await getKPIs(days)
  } catch (error) {
    console.error('[KPI] Failed to get KPIs, returning defaults:', error)
    return {
      dials: 0,
      connects: 0,
      closes: 0,
      revenue: 0,
      conversionRate: '0'
    }
  }
}

export interface LogKpiInput {
  type: ActivityType
  count?: number
  revenue?: number
  contactIds?: string[]
  notes?: string
  voicemail?: boolean
  smsSent?: boolean
  date?: Date
}

export async function logKpi(input: LogKpiInput) {
  try {
    const date = input.date || new Date()
    
    // Create activities for each contact or one general activity
    if (input.contactIds && input.contactIds.length > 0) {
      // Create an activity for each contact
      const activities = await Promise.all(
        input.contactIds.map(contactId =>
          prisma.activity.create({
            data: {
              contactId,
              type: input.type,
              date,
              count: input.count || 1,
              revenue: input.revenue,
              notes: input.notes,
              voicemail: input.voicemail || false,
              smsSent: input.smsSent || false,
              summary: getSummaryForKpi(input.type, input.count, input.revenue),
              details: input.notes
            }
          })
        )
      )
      
      revalidatePath('/')
      revalidatePath('/leads')
      return { success: true, activities }
    } else {
      // Create a single activity without a contact
      const activity = await prisma.activity.create({
        data: {
          type: input.type,
          date,
          count: input.count || 1,
          revenue: input.revenue,
          notes: input.notes,
          voicemail: input.voicemail || false,
          smsSent: input.smsSent || false,
          summary: getSummaryForKpi(input.type, input.count, input.revenue),
          details: input.notes
        }
      })
      
      revalidatePath('/')
      revalidatePath('/leads')
      return { success: true, activities: [activity] }
    }
  } catch (error) {
    console.error('[KPI] Error logging KPI:', error)
    return { success: false, error: 'Failed to log KPI' }
  }
}

function getSummaryForKpi(type: ActivityType, count?: number, revenue?: number): string {
  switch (type) {
    case ActivityType.DIAL:
      return `Logged ${count || 1} dial${(count || 1) > 1 ? 's' : ''}`
    case ActivityType.CONNECT:
      return `Logged ${count || 1} connect${(count || 1) > 1 ? 's' : ''}`
    case ActivityType.CLOSE:
      return `Logged ${count || 1} close${(count || 1) > 1 ? 's' : ''}`
    case ActivityType.REVENUE:
      return `Logged revenue: $${(revenue || 0).toLocaleString()}`
    default:
      return `Logged ${type.toLowerCase()} activity`
  }
}

export async function getKpisForRange(preset: string): Promise<any> {
  const range = getRangeFromPreset(preset)
  return getKpis(range)
}

export async function getKpisForCustomRange(from: Date, to: Date): Promise<any> {
  const range: KpiRange = { from, to }
  return getKpis(range)
}