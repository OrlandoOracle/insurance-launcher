'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { StageBadge } from '@/components/stage-badge'
import { getContact, updateContact, addActivity } from '@/app/actions/contacts'
import { getTasks, createTask, markTaskComplete, markTaskOpen } from '@/app/actions/tasks'
import { format, isPast } from 'date-fns'
import { toast } from 'sonner'
import { 
  Phone, Mail, MapPin, Calendar, Clock, CheckCircle, 
  AlertCircle, Plus, FileText, User, Activity, Folder,
  Edit2, Save, X, Copy, ExternalLink, Clipboard
} from 'lucide-react'
import { DiscoveryButton } from '@/components/discovery/DiscoveryButton'

export default function ContactDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [contact, setContact] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [showNewTask, setShowNewTask] = useState(false)
  const [showNewActivity, setShowNewActivity] = useState(false)
  const [showFloatingCopy, setShowFloatingCopy] = useState(true)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const [newTaskData, setNewTaskData] = useState({
    title: '',
    dueAt: ''
  })
  const [newActivityData, setNewActivityData] = useState({
    type: 'NOTE',
    summary: '',
    details: ''
  })

  useEffect(() => {
    loadContact()
  }, [params.id])

  // Keyboard shortcut for Copy Intake (Shift + C)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'C' && !editing && contact) {
        e.preventDefault()
        handleCopyIntake()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [contact, editing])

  // Check if toolbar has space for the button
  useEffect(() => {
    const checkToolbarSpace = () => {
      if (toolbarRef.current && contact) {
        const toolbar = toolbarRef.current
        const availableWidth = toolbar.offsetWidth
        const contentWidth = toolbar.scrollWidth
        // Show floating button if toolbar is crowded or not yet rendered properly
        setShowFloatingCopy(contentWidth > availableWidth - 100 || availableWidth === 0)
      }
    }

    checkToolbarSpace()
    window.addEventListener('resize', checkToolbarSpace)
    return () => window.removeEventListener('resize', checkToolbarSpace)
  }, [contact])

  const loadContact = async () => {
    setLoading(true)
    try {
      const [contactData, tasksData] = await Promise.all([
        getContact(params.id as string),
        getTasks(undefined, params.id as string)
      ])
      
      if (!contactData) {
        toast.error('Contact not found')
        router.push('/leads')
        return
      }
      
      setContact(contactData)
      setTasks(tasksData)
      setActivities(contactData.activities || [])
      setEditForm({
        firstName: contactData.firstName,
        lastName: contactData.lastName,
        email: contactData.email,
        phone: contactData.phone,
        howHeard: contactData.howHeard || '',
        ghlUrl: contactData.ghlUrl || '',
        tags: JSON.parse(contactData.tags || '[]').join(', ')
      })
    } catch (error) {
      console.error('Error loading contact:', error)
      toast.error('Failed to load contact')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      const tagArray = editForm.tags
        ? editForm.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
        : []
      
      await updateContact(params.id as string, {
        ...editForm,
        tags: tagArray
      })
      
      toast.success('Contact updated')
      setEditing(false)
      loadContact()
    } catch (error) {
      console.error('Error updating contact:', error)
      toast.error('Failed to update contact')
    }
  }

  const handleTaskToggle = async (task: any) => {
    try {
      if (task.status === 'OPEN') {
        await markTaskComplete(task.id)
        toast.success('Task completed')
      } else {
        await markTaskOpen(task.id)
        toast.info('Task reopened')
      }
      loadContact()
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('Failed to update task')
    }
  }

  const handleCreateTask = async () => {
    try {
      await createTask({
        contactId: params.id as string,
        title: newTaskData.title,
        dueAt: newTaskData.dueAt ? new Date(newTaskData.dueAt) : undefined
      })
      
      toast.success('Task created')
      setNewTaskData({ title: '', dueAt: '' })
      setShowNewTask(false)
      loadContact()
    } catch (error) {
      console.error('Error creating task:', error)
      toast.error('Failed to create task')
    }
  }

  const handleCopyIntake = () => {
    if (!contact) return

    const intakeData = `LEAD INTAKE DATA
================
Name: ${contact.firstName} ${contact.lastName}
Email: ${contact.email || 'N/A'}
Phone: ${contact.phone || 'N/A'}
Source: ${contact.howHeard || 'N/A'}
Stage: ${contact.stage}
Tags: ${JSON.parse(contact.tags || '[]').join(', ') || 'None'}
GHL URL: ${contact.ghlUrl || 'N/A'}
Created: ${format(new Date(contact.createdAt), 'PPP')}
================`

    navigator.clipboard.writeText(intakeData)
    toast.success('Lead intake data copied to clipboard')
    
    // If floating button was used, animate and remove it
    if (showFloatingCopy) {
      const floatingBtn = document.getElementById('floating-copy-btn')
      if (floatingBtn) {
        floatingBtn.style.animation = 'copiedAnimation 2s ease-out forwards'
        setTimeout(() => setShowFloatingCopy(false), 2000)
      }
    }
  }

  const handleCreateActivity = async () => {
    try {
      await addActivity(params.id as string, {
        type: newActivityData.type as any,
        summary: newActivityData.summary,
        details: newActivityData.details || undefined
      })
      
      toast.success('Activity added')
      setNewActivityData({ type: 'NOTE', summary: '', details: '' })
      setShowNewActivity(false)
      loadContact()
    } catch (error) {
      console.error('Error creating activity:', error)
      toast.error('Failed to add activity')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!contact) {
    return null
  }

  const tags = JSON.parse(contact.tags || '[]')
  const nextTask = tasks.find(t => t.status === 'OPEN')
  const completedTasks = tasks.filter(t => t.status === 'DONE')
  const openTasks = tasks.filter(t => t.status === 'OPEN')

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">
                {contact.firstName} {contact.lastName}
              </h1>
              <div className="flex gap-4 text-sm text-muted-foreground">
                {contact.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    <span>{contact.phone}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(contact.phone)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                {contact.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    <a href={`mailto:${contact.email}`} className="hover:underline">
                      {contact.email}
                    </a>
                  </div>
                )}
              </div>
              {contact.howHeard && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Source:</span> {contact.howHeard}
                </div>
              )}
              <div className="flex items-center gap-2">
                <StageBadge 
                  contactId={contact.id}
                  stage={contact.stage}
                  onUpdate={loadContact}
                />
                {tags.map((tag: string) => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
            </div>
            <div ref={toolbarRef} className="flex items-center gap-2">
              <DiscoveryButton
                clientId={contact.id}
                clientName={`${contact.firstName} ${contact.lastName}`}
                variant="default"
                size="sm"
              />
              {contact.ghlUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    // Open immediately in new tab
                    window.open(contact.ghlUrl, '_blank', 'noopener,noreferrer')
                    
                    // Try to also open in Chrome profile
                    try {
                      const res = await fetch('/api/open-ghl', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: contact.ghlUrl })
                      })
                      const data = await res.json()
                      if (!data.ok) {
                        console.warn('[GHL Link] Profile launch failed:', data.error)
                      }
                    } catch (err) {
                      console.error('[GHL Link] Error:', err)
                    }
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  GHL
                </Button>
              )}
              {!showFloatingCopy && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCopyIntake}
                        className="group"
                      >
                        <Clipboard className="h-4 w-4 group-hover:text-[#2563EB] transition-colors" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Copy Intake (Shift+C)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <CheckCircle className="h-4 w-4 mr-2" />
            Tasks ({openTasks.length})
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="h-4 w-4 mr-2" />
            Activity ({activities.length})
          </TabsTrigger>
          <TabsTrigger value="files">
            <Folder className="h-4 w-4 mr-2" />
            Files
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Contact Info Card */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Contact Information</CardTitle>
                  {!editing ? (
                    <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSave}>
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        setEditing(false)
                        setEditForm({
                          firstName: contact.firstName,
                          lastName: contact.lastName,
                          email: contact.email,
                          phone: contact.phone,
                          howHeard: contact.howHeard || '',
                          ghlUrl: contact.ghlUrl || '',
                          tags: JSON.parse(contact.tags || '[]').join(', ')
                        })
                      }}>
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!editing ? (
                  <>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Name</label>
                      <p>{contact.firstName} {contact.lastName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <p>{contact.email || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Phone</label>
                      <p>{contact.phone || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">How Heard</label>
                      <p>{contact.howHeard || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Tags</label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {tags.length > 0 ? tags.map((tag: string) => (
                          <Badge key={tag} variant="secondary">{tag}</Badge>
                        )) : <span className="text-muted-foreground">-</span>}
                      </div>
                    </div>
                    {contact.ghlUrl && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">GHL Link</label>
                        <div className="mt-1">
                          <Button
                            size="sm"
                            variant="link"
                            className="p-0 h-auto font-normal"
                            onClick={async () => {
                              // Open immediately in new tab
                              window.open(contact.ghlUrl, '_blank', 'noopener,noreferrer')
                              
                              // Try to also open in Chrome profile
                              try {
                                const res = await fetch('/api/open-ghl', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ url: contact.ghlUrl })
                                })
                                const data = await res.json()
                                if (!data.ok) {
                                  console.warn('[GHL Link] Profile launch failed:', data.error)
                                }
                              } catch (err) {
                                console.error('[GHL Link] Error:', err)
                              }
                            }}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Open in GHL
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-sm font-medium">First Name</label>
                        <Input
                          value={editForm.firstName}
                          onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Last Name</label>
                        <Input
                          value={editForm.lastName}
                          onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <Input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Phone</label>
                      <Input
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">How Heard</label>
                      <Input
                        value={editForm.howHeard}
                        onChange={(e) => setEditForm({ ...editForm, howHeard: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Tags (comma-separated)</label>
                      <Input
                        value={editForm.tags}
                        onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                        placeholder="hot-lead, facebook"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">GHL URL</label>
                      <Input
                        type="url"
                        value={editForm.ghlUrl}
                        onChange={(e) => setEditForm({ ...editForm, ghlUrl: e.target.value })}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Next Action Card */}
            <Card>
              <CardHeader>
                <CardTitle>Next Action</CardTitle>
              </CardHeader>
              <CardContent>
                {nextTask ? (
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium">{nextTask.title}</p>
                      {nextTask.dueAt && (
                        <p className="text-sm text-muted-foreground">
                          Due: {format(new Date(nextTask.dueAt), 'MMM d, yyyy h:mm a')}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleTaskToggle(nextTask)}
                      className="w-full"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Done
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No open tasks
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Tasks</h3>
            <Button size="sm" onClick={() => setShowNewTask(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New Task
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No tasks yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => {
                      const isOverdue = task.dueAt && isPast(new Date(task.dueAt)) && task.status === 'OPEN'
                      
                      return (
                        <TableRow key={task.id} className={isOverdue ? 'bg-red-50' : ''}>
                          <TableCell className={task.status === 'DONE' ? 'line-through text-muted-foreground' : ''}>
                            {task.title}
                            {task.source !== 'MANUAL' && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                {task.source}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className={isOverdue ? 'text-red-600' : ''}>
                            {task.dueAt ? format(new Date(task.dueAt), 'MMM d, yyyy h:mm a') : '-'}
                          </TableCell>
                          <TableCell>
                            {isOverdue ? (
                              <Badge className="bg-red-100 text-red-800">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Overdue
                              </Badge>
                            ) : task.status === 'DONE' ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Done
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-100 text-blue-800">
                                <Clock className="h-3 w-3 mr-1" />
                                Open
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleTaskToggle(task)}
                            >
                              {task.status === 'OPEN' ? 'Complete' : 'Reopen'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Activity Timeline</h3>
            <Button size="sm" onClick={() => setShowNewActivity(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Activity
            </Button>
          </div>

          <div className="space-y-3">
            {activities.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8 text-muted-foreground">
                  No activities yet
                </CardContent>
              </Card>
            ) : (
              activities.map((activity) => (
                <Card key={activity.id}>
                  <CardContent className="py-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {activity.type === 'NOTE' && <FileText className="h-4 w-4 text-blue-600" />}
                        {activity.type === 'CALL' && <Phone className="h-4 w-4 text-green-600" />}
                        {activity.type === 'EMAIL' && <Mail className="h-4 w-4 text-purple-600" />}
                        {activity.type === 'TASK' && <CheckCircle className="h-4 w-4 text-gray-600" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{activity.summary}</p>
                            {activity.details && (
                              <p className="text-sm text-muted-foreground mt-1">{activity.details}</p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(activity.createdAt), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                        {activity.outcome && (
                          <Badge variant="outline" className="mt-2">{activity.outcome}</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Files & Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 space-y-4">
                <Folder className="h-12 w-12 mx-auto text-muted-foreground" />
                <div className="space-y-2">
                  <p className="text-muted-foreground">File storage coming soon</p>
                  <p className="text-sm text-muted-foreground">
                    You'll be able to drop PDFs, images, and other documents here
                  </p>
                </div>
                {/* TODO: Implement file upload and storage */}
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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

      {/* New Activity Dialog */}
      <Dialog open={showNewActivity} onOpenChange={setShowNewActivity}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Type</label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={newActivityData.type}
                onChange={(e) => setNewActivityData({ ...newActivityData, type: e.target.value })}
              >
                <option value="NOTE">Note</option>
                <option value="CALL">Call</option>
                <option value="EMAIL">Email</option>
                <option value="SMS">SMS</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Summary</label>
              <Input
                placeholder="Brief summary..."
                value={newActivityData.summary}
                onChange={(e) => setNewActivityData({ ...newActivityData, summary: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Details (Optional)</label>
              <textarea
                className="w-full px-3 py-2 border rounded-md"
                rows={3}
                placeholder="Additional details..."
                value={newActivityData.details}
                onChange={(e) => setNewActivityData({ ...newActivityData, details: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewActivity(false)}>Cancel</Button>
            <Button onClick={handleCreateActivity} disabled={!newActivityData.summary}>Add Activity</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Copy Intake Button */}
      {showFloatingCopy && contact && (
        <>
          <style jsx>{`
            @keyframes copiedAnimation {
              0% {
                transform: translateY(0) scale(1);
                opacity: 1;
                background-color: #10b981;
              }
              50% {
                transform: translateY(-10px) scale(1.1);
              }
              100% {
                transform: translateY(-20px) scale(0.9);
                opacity: 0;
              }
            }
            #floating-copy-btn::before {
              content: 'Copied!';
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              opacity: 0;
              pointer-events: none;
              white-space: nowrap;
              font-size: 14px;
              font-weight: 600;
            }
            #floating-copy-btn[style*="copiedAnimation"]::before {
              opacity: 1;
            }
            #floating-copy-btn[style*="copiedAnimation"] svg {
              opacity: 0;
            }
          `}</style>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  id="floating-copy-btn"
                  size="icon"
                  variant="outline"
                  onClick={handleCopyIntake}
                  className="fixed bottom-8 right-8 z-50 shadow-lg hover:shadow-xl transition-all group"
                  style={{
                    border: '1px solid #e5e7eb',
                    backgroundColor: 'white'
                  }}
                >
                  <Clipboard className="h-5 w-5 group-hover:text-[#2563EB] transition-colors" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Copy Intake (Shift+C)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>
      )}
    </div>
  )
}