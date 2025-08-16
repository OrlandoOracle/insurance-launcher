'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Phone, Users, DollarSign, TrendingUp } from "lucide-react"

interface KPICardsProps {
  dials: number
  connects: number
  closes: number
  revenue: number
  conversionRate: string
}

interface DashboardKPIsProps {
  kpis: KPICardsProps
  timeline: 'today' | 'week'
  onTimelineChange: (timeline: 'today' | 'week') => void
}

export function DashboardKPIs({ kpis, timeline, onTimelineChange }: DashboardKPIsProps) {
  const kpiCards = [
    {
      title: "Dials",
      value: kpis.dials,
      icon: Phone,
    },
    {
      title: "Connects",
      value: kpis.connects,
      icon: Users,
    },
    {
      title: "Closes",
      value: kpis.closes,
      icon: TrendingUp,
    },
    {
      title: "Revenue",
      value: `$${kpis.revenue.toLocaleString()}`,
      icon: DollarSign,
    },
    {
      title: "Conversion",
      value: `${kpis.conversionRate}%`,
      icon: TrendingUp,
    },
  ]

  return (
    <section>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Performance Metrics</h2>
          <div className="flex items-center gap-2">
            <Button
              variant={timeline === 'today' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onTimelineChange('today')}
            >
              Today
            </Button>
            <Button
              variant={timeline === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onTimelineChange('week')}
            >
              Last 7 Days
            </Button>
          </div>
        </div>

        <div
          className="mt-4 -mx-4 px-4 overflow-x-auto overscroll-x-contain scrollbar-none"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="flex gap-4 md:gap-6 snap-x snap-mandatory">
            {kpiCards.map((kpi, index) => {
              const Icon = kpi.icon
              return (
                <Card 
                  key={index} 
                  className="snap-start shrink-0 min-w-[260px] sm:min-w-[300px] lg:min-w-[320px]"
                >
                  <CardHeader className="p-4 md:p-5 lg:p-6 pb-3 relative">
                    <Icon className="absolute top-4 right-4 md:top-5 md:right-5 lg:top-6 lg:right-6 h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 md:p-5 lg:p-6 pt-0">
                    <div className="text-2xl font-bold">{kpi.value}</div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}