'use client'

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Phone, Users, DollarSign, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

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
  const [scrollPosition, setScrollPosition] = useState(0)

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

  const scrollLeft = () => {
    const container = document.getElementById('kpi-container')
    if (container) {
      container.scrollBy({ left: -300, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    const container = document.getElementById('kpi-container')
    if (container) {
      container.scrollBy({ left: 300, behavior: 'smooth' })
    }
  }

  return (
    <div className="space-y-4">
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

      <div className="relative">
        <button
          onClick={scrollLeft}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 sm:hidden bg-white/90 backdrop-blur rounded-full p-2 shadow-md"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        
        <button
          onClick={scrollRight}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 sm:hidden bg-white/90 backdrop-blur rounded-full p-2 shadow-md"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <div
          id="kpi-container"
          className={cn(
            "grid gap-4",
            "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
            "sm:overflow-visible overflow-x-auto scrollbar-hide",
            "snap-x snap-mandatory sm:snap-none"
          )}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {kpiCards.map((kpi, index) => {
            const Icon = kpi.icon
            return (
              <Card 
                key={index} 
                className={cn(
                  "min-w-[280px] sm:min-w-0",
                  "snap-center sm:snap-align-none",
                  index === 4 && "lg:col-span-1 sm:col-span-2"
                )}
              >
                <CardHeader className="p-5 pb-3 relative">
                  <Icon className="absolute top-5 right-5 h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <div className="text-2xl font-bold">{kpi.value}</div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}