'use client'

import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  User, Mail, Phone, Calendar, ExternalLink, 
  Plus, Check, Clock, MessageSquare, DollarSign,
  PhoneCall, Target, TrendingUp
} from 'lucide-react'
import { Lead, Task, Activity, LeadStage, TaskStatus, ActivityType } from '@prisma/client'
import { format } from 'date-fns'
import { updateContact } from '@/app/actions/contacts'
import { createTask, updateTask } from '@/app/actions/tasks'
import { toast } from 'sonner'

interface LeadDetailDrawerProps {
  contactId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ContactWithRelations extends Lead {
  tasks: Task[]
  activities: Activity[]
}

export function LeadDetailDrawer({ contactId, open, onOpenChange }: LeadDetailDrawerProps) {
  const [contact, setContact] = useState<ContactWithRelations | null>(null)
  const [loading, setLoading] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newNote, setNewNote] = useState('')
  const [addingTask, setAddingTask] = useState(false)
  const [addingNote, setAddingNote] = useState(false)

  useEffect(() => {
    if (contactId && open) {
      fetchContact()
    }
  }, [contactId, open])

  const fetchContact = async () => {
    if (!contactId) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/contacts/${contactId}`)
      if (response.ok) {
        const data = await response.json()
        setContact(data)
      }
    } catch (error) {
      console.error('Failed to fetch contact:', error)
      toast.error('Failed to load contact details')
    } finally {
      setLoading(false)
    }
  }

  const handleStageChange = async (newStage: LeadStage) => {
    if (!contact) return
    
    const result = await updateContact(contact.id, { stage: newStage })
    if (result.success) {
      setContact({ ...contact, stage: newStage })
      toast.success('Stage updated')
    } else {
      toast.error('Failed to update stage')
    }
  }

  const handleAddTask = async () => {
    if (!contact || !newTaskTitle.trim()) return
    
    setAddingTask(true)
    try {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      
      const result = await createTask({
        contactId: contact.id,
        title: newTaskTitle,
        dueAt: tomorrow
      })
      
      if (result.success && result.task) {
        setContact({
          ...contact,
          tasks: [result.task, ...contact.tasks]
        })
        setNewTaskTitle('')
        toast.success('Task created')
      }
    } catch (error) {
      toast.error('Failed to create task')
    } finally {
      setAddingTask(false)
    }
  }

  const handleToggleTask = async (task: Task) => {
    if (!contact) return
    
    const newStatus = task.status === TaskStatus.DONE ? TaskStatus.OPEN : TaskStatus.DONE
    const result = await updateTask(task.id, { status: newStatus })
    
    if (result.success) {
      setContact({
        ...contact,
        tasks: contact.tasks.map(t => 
          t.id === task.id ? { ...t, status: newStatus } : t
        )
      })
      toast.success(newStatus === TaskStatus.DONE ? 'Task completed' : 'Task reopened')
    }
  }

  const handleAddNote = async () => {
    if (!contact || !newNote.trim()) return
    
    setAddingNote(true)
    try {
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: contact.id,
          type: ActivityType.NOTE,
          summary: 'Added note',
          details: newNote
        })
      })
      
      if (response.ok) {
        const activity = await response.json()
        setContact({
          ...contact,
          activities: [activity, ...contact.activities]
        })
        setNewNote('')
        toast.success('Note added')
      }
    } catch (error) {
      toast.error('Failed to add note')
    } finally {
      setAddingNote(false)
    }
  }

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case ActivityType.CALL:
      case ActivityType.DIAL:
        return <PhoneCall className="h-4 w-4" />
      case ActivityType.CONNECT:
        return <Target className="h-4 w-4" />
      case ActivityType.CLOSE:
        return <TrendingUp className="h-4 w-4" />
      case ActivityType.REVENUE:
        return <DollarSign className="h-4 w-4" />
      case ActivityType.NOTE:
        return <MessageSquare className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  const getStageColor = (stage: Stage) => {
    const colors: Record<Stage, string> = {
      NEW_LEAD: 'bg-blue-100 text-blue-800',
      DISCOVERY: 'bg-purple-100 text-purple-800',
      QUOTE: 'bg-yellow-100 text-yellow-800',
      PRESENTATION: 'bg-orange-100 text-orange-800',
      APP: 'bg-indigo-100 text-indigo-800',
      SOLD: 'bg-green-100 text-green-800',
      ONBOARD: 'bg-teal-100 text-teal-800',
      RENEWAL: 'bg-pink-100 text-pink-800'
    }
    return colors[stage] || 'bg-gray-100 text-gray-800'
  }

  if (!contact) {
    return null
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[640px] sm:max-w-[640px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>{contact.firstName} {contact.lastName}</span>
            <select
              value={contact.stage}
              onChange={(e) => handleStageChange(e.target.value as Stage)}
              className={`px-3 py-1 rounded-full text-sm font-medium border-0 cursor-pointer ${getStageColor(contact.stage)}`}
            >
              {Object.values(Stage).map(stage => (
                <option key={stage} value={stage}>
                  {stage.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="profile" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{contact.email || 'No email'}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{contact.phone || 'No phone'}</span>
              </div>
              
              {contact.howHeard && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Source: {contact.howHeard}</span>
                </div>
              )}
              
              {contact.ghlUrl && (
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={contact.ghlUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View in GHL
                  </a>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Added {format(new Date(contact.createdAt), 'MMM d, yyyy')}
                </span>
              </div>
              
              {contact.tags && JSON.parse(contact.tags).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {JSON.parse(contact.tags).map((tag: string, i: number) => (
                    <Badge key={i} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add a task..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                disabled={addingTask}
              />
              <Button 
                onClick={handleAddTask} 
                disabled={addingTask || !newTaskTitle.trim()}
                size="sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {contact.tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No tasks yet
                </p>
              ) : (
                contact.tasks.map(task => (
                  <div 
                    key={task.id} 
                    className="flex items-center gap-2 p-2 rounded hover:bg-gray-50"
                  >
                    <Checkbox
                      checked={task.status === TaskStatus.DONE}
                      onCheckedChange={() => handleToggleTask(task)}
                    />
                    <span 
                      className={`flex-1 text-sm ${
                        task.status === TaskStatus.DONE ? 'line-through text-muted-foreground' : ''
                      }`}
                    >
                      {task.title}
                    </span>
                    {task.dueAt && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(task.dueAt), 'MMM d')}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <div className="space-y-2">
              <Textarea
                placeholder="Add a note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                disabled={addingNote}
                rows={3}
              />
              <Button 
                onClick={handleAddNote} 
                disabled={addingNote || !newNote.trim()}
                size="sm"
                className="w-full"
              >
                Add Note
              </Button>
            </div>

            <div className="space-y-3">
              {contact.activities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No activity yet
                </p>
              ) : (
                contact.activities.map(activity => (
                  <div key={activity.id} className="border-l-2 border-gray-200 pl-4 py-2">
                    <div className="flex items-center gap-2 text-sm">
                      {getActivityIcon(activity.type)}
                      <span className="font-medium">{activity.summary}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {format(new Date(activity.date || activity.createdAt), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    {activity.details && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {activity.details}
                      </p>
                    )}
                    {activity.revenue && (
                      <p className="text-sm font-medium text-green-600 mt-1">
                        Revenue: ${activity.revenue.toLocaleString()}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}