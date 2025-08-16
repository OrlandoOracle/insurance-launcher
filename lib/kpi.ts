import { prisma } from '@/lib/db'
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns'
import { ActivityType } from '@prisma/client'

export interface KpiRange {
  from: Date
  to: Date
}

export interface KpiData {
  dials: number
  connects: number
  closes: number
  revenue: number
  conversion: number
}

export async function getKpis(range: KpiRange): Promise<KpiData> {
  const [dials, connects, closes, revenue] = await Promise.all([
    prisma.activity.aggregate({
      _sum: { count: true },
      where: {
        type: ActivityType.DIAL,
        date: { gte: range.from, lte: range.to }
      }
    }),
    prisma.activity.aggregate({
      _sum: { count: true },
      where: {
        type: ActivityType.CONNECT,
        date: { gte: range.from, lte: range.to }
      }
    }),
    prisma.activity.aggregate({
      _sum: { count: true },
      where: {
        type: ActivityType.CLOSE,
        date: { gte: range.from, lte: range.to }
      }
    }),
    prisma.activity.aggregate({
      _sum: { revenue: true },
      where: {
        type: ActivityType.REVENUE,
        date: { gte: range.from, lte: range.to }
      }
    })
  ])

  const d = dials._sum.count ?? 0
  const c = connects._sum.count ?? 0
  const s = closes._sum.count ?? 0
  const r = Number(revenue._sum.revenue ?? 0)
  
  return {
    dials: d,
    connects: c,
    closes: s,
    revenue: r,
    conversion: c > 0 ? (s / c) : 0
  }
}

export async function getRecentActivities(contactId?: string, limit: number = 10) {
  return prisma.activity.findMany({
    where: contactId ? { contactId } : undefined,
    include: {
      contact: true
    },
    orderBy: { date: 'desc' },
    take: limit
  })
}

export function getRangeFromPreset(preset: string): KpiRange {
  const now = new Date()
  const today = startOfDay(now)
  
  switch (preset) {
    case 'today':
      return {
        from: today,
        to: endOfDay(now)
      }
    case 'week':
      return {
        from: startOfWeek(now, { weekStartsOn: 1 }),
        to: endOfWeek(now, { weekStartsOn: 1 })
      }
    case '7d':
      const sevenDaysAgo = new Date(now)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
      return {
        from: startOfDay(sevenDaysAgo),
        to: endOfDay(now)
      }
    case '30d':
      const thirtyDaysAgo = new Date(now)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
      return {
        from: startOfDay(thirtyDaysAgo),
        to: endOfDay(now)
      }
    default:
      return {
        from: today,
        to: endOfDay(now)
      }
  }
}