import { prisma } from '@/lib/db'
import DashboardClient from '@/components/dashboard-client'
import ErrorBoundary from '@/components/dev/ErrorBoundary'

async function getKPIData(daysAgo: number = 0) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - daysAgo)
  startDate.setHours(0, 0, 0, 0)
  
  try {
    const [activities, leads] = await Promise.all([
      prisma.activity.findMany({
        where: {
          date: { gte: startDate }
        }
      }),
      prisma.lead.findMany({
        where: {
          createdAt: { gte: startDate }
        }
      })
    ])
    
    const dials = activities.filter((a: any) => a.type === 'CALL').reduce((sum: any, a: any) => sum + (a.count || 1), 0)
    const connects = activities.filter((a: any) => a.outcome === 'CONNECTED').reduce((sum: any, a: any) => sum + (a.count || 1), 0)
    const closes = activities.filter((a: any) => a.outcome === 'CLOSED').reduce((sum: any, a: any) => sum + (a.count || 1), 0)
    const revenue = activities.filter((a: any) => a.outcome === 'CLOSED').reduce((sum: any, a: any) => sum + (a.revenue || 0), 0)
    const conversionRate = dials > 0 ? ((closes / dials) * 100).toFixed(1) : '0'
    
    return { dials, connects, closes, revenue, conversionRate }
  } catch (error) {
    console.error('[KPIs] Error:', error)
    return { dials: 0, connects: 0, closes: 0, revenue: 0, conversionRate: '0' }
  }
}

async function getTasks() {
  try {
    const tasks = await prisma.task.findMany({
      where: {
        status: 'OPEN',
        archivedAt: null
      },
      include: {
        contact: true
      },
      orderBy: [
        { dueAt: 'asc' },
        { createdAt: 'desc' }
      ],
      take: 5
    })
    return tasks
  } catch (error) {
    console.error('[Tasks] Error:', error)
    return []
  }
}

async function getOverdueTasks() {
  try {
    const tasks = await prisma.task.findMany({
      where: {
        status: 'OPEN',
        dueAt: { lt: new Date() },
        archivedAt: null
      }
    })
    return tasks
  } catch (error) {
    console.error('[Overdue Tasks] Error:', error)
    return []
  }
}

async function getSettings() {
  try {
    const settings = await prisma.setting.findFirst({
      where: { id: 'singleton' }
    })
    return settings || { 
      kixieUrl: 'https://app.kixie.com',
      icsCalendarUrl: null,
      dataDir: './data',
      ghlOppsUrl: null,
      chromeProfileDir: null
    }
  } catch (error) {
    console.error('[Settings] Error:', error)
    return { 
      kixieUrl: 'https://app.kixie.com',
      icsCalendarUrl: null,
      dataDir: './data',
      ghlOppsUrl: null,
      chromeProfileDir: null
    }
  }
}

export default async function DashboardPage() {
  const [todayKPIs, weekKPIs, tasks, overdueTasks, settings] = await Promise.all([
    getKPIData(0),
    getKPIData(7),
    getTasks(),
    getOverdueTasks(),
    getSettings()
  ])

  return (
    <section className="h-full flex flex-col">
      <div
        className="min-h-0 grow overflow-auto"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <ErrorBoundary>
          <DashboardClient 
            initialData={{
              todayKPIs,
              weekKPIs,
              tasks,
              overdueTasks,
              settings
            }}
          />
        </ErrorBoundary>
      </div>
    </section>
  )
}