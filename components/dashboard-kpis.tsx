'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Phone, Users, DollarSign, TrendingUp, BarChart3 } from 'lucide-react'

type KPI = { 
  label: string
  value: number | string
  icon?: React.ReactNode
}

interface KPIData {
  dials: number
  connects: number
  closes: number
  revenue: number
  conversionRate: string
}

type Props = {
  kpisToday: KPI[]
  kpisWeek: KPI[]
  timeline: 'today' | 'week'
  onTimelineChange: (t: 'today' | 'week') => void
}

export function DashboardKPIs({ kpisToday, kpisWeek, timeline, onTimelineChange }: Props) {
  const kpis = timeline === 'today' ? kpisToday : kpisWeek

  return (
    <div className="container mx-auto px-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Performance Metrics</h2>
        <div className="inline-flex gap-2">
          <Button 
            size="sm"
            variant={timeline === 'today' ? 'default' : 'outline'} 
            onClick={() => onTimelineChange('today')}
          >
            Today
          </Button>
          <Button 
            size="sm"
            variant={timeline === 'week' ? 'default' : 'outline'} 
            onClick={() => onTimelineChange('week')}
          >
            Last 7 Days
          </Button>
        </div>
      </div>

      {/* Horizontal scroll container */}
      <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-4 pb-2 snap-x snap-mandatory">
          {kpis.map((kpi, idx) => (
            <Card
              key={idx}
              className="min-w-[240px] w-[240px] snap-start shrink-0"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <span className="text-sm text-muted-foreground">{kpi.label}</span>
                  {kpi.icon && <span className="text-muted-foreground">{kpi.icon}</span>}
                </div>
                <div className="mt-3 text-2xl font-semibold tabular-nums">
                  {String(kpi.value ?? 0)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}