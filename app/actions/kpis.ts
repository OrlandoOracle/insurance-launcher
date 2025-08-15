'use server'

import { prisma } from '@/lib/db'
import { startOfDay, subDays } from 'date-fns'

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