'use client'

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { KPICards } from "@/components/kpi-cards"
import { TaskList } from "@/components/task-list"
import { getKPIs } from "@/app/actions/kpis"
import { getTasks, getOverdueTasks } from "@/app/actions/tasks"
import { getSettings } from "@/app/actions/settings"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Upload, Phone, Calendar, AlertCircle } from "lucide-react"
import { LeadIntakeForm } from "@/components/lead-intake-form"
import { GlobalHotkeys } from "@/components/global-hotkeys"
import { TaskReminders } from "@/components/task-reminders"

export default function DashboardPage() {
  const [showIntakeForm, setShowIntakeForm] = useState(false)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [todayKPIs, weekKPIs, tasks, overdueTasks, settings] = await Promise.all([
      getKPIs(0),
      getKPIs(7),
      getTasks('OPEN'),
      getOverdueTasks(),
      getSettings()
    ])
    
    setData({ todayKPIs, weekKPIs, tasks, overdueTasks, settings })
    setLoading(false)
  }

  if (loading || !data) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  const { todayKPIs, weekKPIs, tasks, overdueTasks, settings } = data
  
  return (
    <>
    <GlobalHotkeys onNewLead={() => setShowIntakeForm(true)} />
    <TaskReminders />
    <div className="space-y-6">
      {overdueTasks.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-sm font-medium text-red-900">
            You have {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''} that need attention
          </span>
          <Link href="/tasks" className="ml-auto">
            <Button size="sm" variant="outline">View Tasks</Button>
          </Link>
        </div>
      )}
      
      <div>
        <h2 className="text-2xl font-bold mb-4">Today's Performance</h2>
        <KPICards {...todayKPIs} />
      </div>
      
      <div>
        <h2 className="text-2xl font-bold mb-4">Last 7 Days</h2>
        <KPICards {...weekKPIs} />
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <TaskList tasks={tasks} />
        
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => setShowIntakeForm(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Lead
              </Button>
              
              <Link href="/import">
                <Button className="w-full justify-start" variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Import CSV
                </Button>
              </Link>
              
              <a href={settings.kixieUrl} target="_blank" rel="noopener noreferrer">
                <Button className="w-full justify-start" variant="outline">
                  <Phone className="mr-2 h-4 w-4" />
                  Open Kixie PowerDialer
                </Button>
              </a>
              
              {settings.icsCalendarUrl && (
                <Link href="/tasks">
                  <Button className="w-full justify-start" variant="outline">
                    <Calendar className="mr-2 h-4 w-4" />
                    Open Today's Calendar
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    
    <LeadIntakeForm 
      open={showIntakeForm} 
      onClose={() => {
        setShowIntakeForm(false)
        loadData()
      }} 
    />
    </>
  )
}