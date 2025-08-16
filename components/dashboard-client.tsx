'use client'

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DashboardKPIs } from "@/components/dashboard-kpis"
import { TaskList } from "@/components/task-list"
import { createTask } from "@/app/actions/tasks"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Upload, Phone, Calendar, AlertCircle, GripVertical } from "lucide-react"
import { LeadIntakeForm } from "@/components/lead-intake-form"
import { GlobalHotkeys } from "@/components/global-hotkeys"
import { TaskReminders } from "@/components/task-reminders"
import { toast } from "sonner"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface DashboardCard {
  id: string
  component: React.ReactNode
  width?: 'full' | '2/3' | '1/3'
}

function SortableCard({ card }: { card: DashboardCard }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const widthClass = card.width === '2/3' ? 'lg:col-span-2' : card.width === '1/3' ? 'lg:col-span-1' : 'col-span-full'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${widthClass}`}
    >
      <div className="absolute top-3 left-3 z-10 cursor-move opacity-0 hover:opacity-100 transition-opacity" {...listeners} {...attributes}>
        <GripVertical className="h-5 w-5 text-gray-400" />
      </div>
      {card.component}
    </div>
  )
}

interface DashboardClientProps {
  initialData: {
    todayKPIs: any
    weekKPIs: any
    tasks: any[]
    overdueTasks: any[]
    settings: any
  }
}

export function DashboardClient({ initialData }: DashboardClientProps) {
  const [showIntakeForm, setShowIntakeForm] = useState(false)
  const [showNewTask, setShowNewTask] = useState(false)
  const [data, setData] = useState(initialData)
  const [timeline, setTimeline] = useState<'today' | 'week'>('today')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [newTaskData, setNewTaskData] = useState({
    title: '',
    dueAt: ''
  })

  const [cards, setCards] = useState<DashboardCard[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    const newCards: DashboardCard[] = [
      {
        id: 'tasks',
        width: '2/3',
        component: (
          <TaskList 
            tasks={data.tasks} 
            onAddTask={() => setShowNewTask(true)}
          />
        )
      },
      {
        id: 'quick-actions',
        width: '1/3',
        component: (
          <Card>
            <CardHeader className="p-5">
              <CardTitle className="text-xl font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
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
                
                <a href={data.settings.kixieUrl} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full justify-start" variant="outline">
                    <Phone className="mr-2 h-4 w-4" />
                    Open Kixie PowerDialer
                  </Button>
                </a>
                
                {data.settings.icsCalendarUrl && (
                  <Link href="/tasks">
                    <Button className="w-full justify-start" variant="outline">
                      <Calendar className="mr-2 h-4 w-4" />
                      Open Today's Calendar
                    </Button>
                  </Link>
                )}
              </div>
              {!data.settings.kixieUrl && !data.settings.icsCalendarUrl && (
                <p className="text-sm text-gray-400 mt-4">
                  Configure integrations in Settings
                </p>
              )}
            </CardContent>
          </Card>
        )
      }
    ]
    
    setCards(newCards)
  }, [data, timeline])

  const handleCreateTask = async () => {
    try {
      await createTask({
        title: newTaskData.title,
        dueAt: newTaskData.dueAt ? new Date(newTaskData.dueAt) : undefined
      })
      
      toast.success('Task created')
      setNewTaskData({ title: '', dueAt: '' })
      setShowNewTask(false)
      
      // Refresh tasks - in production you'd want a better solution
      window.location.reload()
    } catch (error) {
      console.error('Error creating task:', error)
      toast.error('Failed to create task')
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setCards((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
    
    setActiveId(null)
  }

  const { todayKPIs, weekKPIs, tasks, overdueTasks, settings } = data
  const currentKPIs = timeline === 'today' ? todayKPIs : weekKPIs
  
  return (
    <>
    <GlobalHotkeys onNewLead={() => setShowIntakeForm(true)} />
    <TaskReminders />
    <div className="container mx-auto px-4 py-6 md:py-8 space-y-8">
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
      
      <DashboardKPIs
        kpis={currentKPIs}
        timeline={timeline}
        onTimelineChange={setTimeline}
      />
      
      <div className="border-t border-gray-200 pt-8">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={cards.map(c => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid gap-6 lg:grid-cols-3">
              {cards.map((card) => (
                <SortableCard key={card.id} card={card} />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeId ? (
              <div className="opacity-50">
                {cards.find(c => c.id === activeId)?.component}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
    
    <LeadIntakeForm 
      open={showIntakeForm} 
      onClose={() => {
        setShowIntakeForm(false)
        window.location.reload()
      }} 
    />

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