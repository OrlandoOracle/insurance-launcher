'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { DashboardKPIs } from '@/components/dashboard-kpis'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { LeadIntakeForm } from '@/components/lead-intake-form'
import { GlobalHotkeys } from '@/components/global-hotkeys'
import { TaskReminders } from '@/components/task-reminders'
import { createTask } from '@/app/actions/tasks'
import { toast } from 'sonner'
import Link from 'next/link'
import { AlertCircle, Phone, Users, DollarSign, TrendingUp, BarChart3, Plus, Upload } from 'lucide-react'

interface DashboardClientProps {
  initialData: {
    todayKPIs: any
    weekKPIs: any
    tasks: any[]
    overdueTasks: any[]
    settings: any
  }
}

export default function DashboardClient({ initialData }: DashboardClientProps) {
  const [timeline, setTimeline] = useState<'today' | 'week'>('today')
  const [showIntakeForm, setShowIntakeForm] = useState(false)
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTaskData, setNewTaskData] = useState({
    title: '',
    dueAt: ''
  })

  // Debug mount
  useEffect(() => { 
    console.log('[DashboardClient] mounted', { initialData })
  }, [])

  // Defensive defaults to prevent crashes
  const t = initialData?.todayKPIs ?? { dials: 0, connects: 0, closes: 0, revenue: 0, conversionRate: '0' }
  const w = initialData?.weekKPIs ?? { dials: 0, connects: 0, closes: 0, revenue: 0, conversionRate: '0' }
  const tasks = Array.isArray(initialData?.tasks) ? initialData.tasks : []
  const settings = initialData?.settings ?? {}
  const overdueTasks = Array.isArray(initialData?.overdueTasks) ? initialData.overdueTasks : []

  const kpisToday = [
    { label: 'Dials', value: t.dials, icon: <Phone className="h-4 w-4" /> },
    { label: 'Connects', value: t.connects, icon: <Users className="h-4 w-4" /> },
    { label: 'Closes', value: t.closes, icon: <TrendingUp className="h-4 w-4" /> },
    { label: 'Revenue', value: `$${Number(t.revenue ?? 0).toLocaleString()}`, icon: <DollarSign className="h-4 w-4" /> },
    { label: 'Conversion', value: `${t.conversionRate}%`, icon: <BarChart3 className="h-4 w-4" /> },
  ]

  const kpisWeek = [
    { label: 'Dials', value: w.dials, icon: <Phone className="h-4 w-4" /> },
    { label: 'Connects', value: w.connects, icon: <Users className="h-4 w-4" /> },
    { label: 'Closes', value: w.closes, icon: <TrendingUp className="h-4 w-4" /> },
    { label: 'Revenue', value: `$${Number(w.revenue ?? 0).toLocaleString()}`, icon: <DollarSign className="h-4 w-4" /> },
    { label: 'Conversion', value: `${w.conversionRate}%`, icon: <BarChart3 className="h-4 w-4" /> },
  ]

  const handleCreateTask = async () => {
    try {
      await createTask({
        title: newTaskData.title,
        dueAt: newTaskData.dueAt ? new Date(newTaskData.dueAt) : undefined
      })
      
      toast.success('Task created')
      setNewTaskData({ title: '', dueAt: '' })
      setShowNewTask(false)
      
      // Refresh tasks
      window.location.reload()
    } catch (error) {
      console.error('Error creating task:', error)
      toast.error('Failed to create task')
    }
  }

  return (
    <>
      <GlobalHotkeys onNewLead={() => setShowIntakeForm(true)} />
      <TaskReminders />
      
      <div className="space-y-8 py-6">
        {/* Overdue tasks alert */}
        {overdueTasks.length > 0 && (
          <div className="container mx-auto px-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
              <span className="text-sm font-medium text-red-900">
                You have {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''} that need attention
              </span>
              <Link href="/tasks" className="ml-auto">
                <Button size="sm" variant="outline">View Tasks</Button>
              </Link>
            </div>
          </div>
        )}

        {/* KPIs Row */}
        <DashboardKPIs
          kpisToday={kpisToday}
          kpisWeek={kpisWeek}
          timeline={timeline}
          onTimelineChange={setTimeline}
        />

        {/* 50/50 split: My Tasks and Quick Actions */}
        <div className="container mx-auto px-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* My Tasks (left) */}
            <Card className="min-h-[260px]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>My Tasks</CardTitle>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setShowNewTask(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {(!tasks || tasks.length === 0) ? (
                  <p className="text-sm text-muted-foreground">No open tasks</p>
                ) : (
                  <ul className="space-y-2">
                    {tasks.slice(0, 8).map((task: any) => (
                      <li key={task.id} className="text-sm flex items-start gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                        <div className="flex-1">
                          <span className="block">{task.title}</span>
                          {task.contact && (
                            <span className="text-xs text-muted-foreground">
                              {task.contact.firstName} {task.contact.lastName}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {tasks.length > 8 && (
                  <Link href="/tasks" className="text-sm text-primary hover:underline mt-3 inline-block">
                    View all {tasks.length} tasks →
                  </Link>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions (right) */}
            <Card className="min-h-[260px]">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  className="w-full" 
                  variant="default"
                  onClick={() => setShowIntakeForm(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Lead
                </Button>
                <Link href="/leads" className="block">
                  <Button className="w-full" variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Import CSV
                  </Button>
                </Link>
                {settings?.kixieUrl ? (
                  <a 
                    href={settings.kixieUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full" variant="outline">
                      <Phone className="mr-2 h-4 w-4" />
                      Open Kixie PowerDialer
                    </Button>
                  </a>
                ) : (
                  <Button className="w-full" variant="outline" disabled>
                    <Phone className="mr-2 h-4 w-4" />
                    Open Kixie PowerDialer
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Lead Intake Form Dialog */}
      <LeadIntakeForm 
        open={showIntakeForm} 
        onClose={() => {
          setShowIntakeForm(false)
          window.location.reload()
        }} 
      />

      {/* New Task Dialog */}
      <Dialog open={showNewTask} onOpenChange={setShowNewTask}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Task Title</label>
              <Input
                placeholder="Enter task title..."
                value={newTaskData.title}
                onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTaskData.title) {
                    handleCreateTask()
                  }
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Due Date (Optional)</label>
              <Input
                type="datetime-local"
                value={newTaskData.dueAt}
                onChange={(e) => setNewTaskData({ ...newTaskData, dueAt: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTask(false)}>Cancel</Button>
            <Button onClick={handleCreateTask} disabled={!newTaskData.title}>Create Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}