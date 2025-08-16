'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { StageBadge } from '@/components/stage-badge'
import { updateContact, addActivity } from '@/app/actions/contacts'
import { createTask, markTaskComplete, markTaskOpen } from '@/app/actions/tasks'
import { format, isPast } from 'date-fns'
import { toast } from 'sonner'
import { 
  Phone, Mail, Calendar, Clock, CheckCircle, 
  AlertCircle, Plus, FileText, User, Activity, Folder,
  Edit2, Save, X, Copy, ExternalLink, Clipboard
} from 'lucide-react'
import { DiscoveryButton } from '@/components/discovery/DiscoveryButton'

interface LeadDetailClientProps {
  initialLead: any
}

export function LeadDetailClient({ initialLead }: LeadDetailClientProps) {
  const router = useRouter()
  const [lead, setLead] = useState(initialLead)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    source: lead.source || '',
    ghlUrl: lead.ghlUrl || '',
    tags: JSON.parse(lead.tags || '[]').join(', ')
  })

  const tags = JSON.parse(lead.tags || '[]')
  const openTasks = lead.tasks.filter((t: any) => t.status === 'OPEN')
  const nextTask = openTasks[0]

  const handleSave = async () => {
    try {
      const tagArray = editForm.tags
        ? editForm.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
        : []
      
      await updateContact(lead.id, {
        ...editForm,
        tags: tagArray
      })
      
      toast.success('Contact updated')
      setEditing(false)
      router.refresh()
    } catch (error) {
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
      router.refresh()
    } catch (error) {
      toast.error('Failed to update task')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const handleCopyIntake = () => {
    const intakeData = `LEAD INTAKE DATA
================
Name: ${lead.firstName} ${lead.lastName}
Email: ${lead.email || 'N/A'}
Phone: ${lead.phone || 'N/A'}
Source: ${lead.source || 'N/A'}
Stage: ${lead.stage}
Tags: ${tags.join(', ') || 'None'}
GHL URL: ${lead.ghlUrl || 'N/A'}
Created: ${format(new Date(lead.createdAt), 'PPP')}
================`

    copyToClipboard(intakeData)
    toast.success('Lead intake data copied')
  }

  return (
    <>
      {/* Header (non-scrolling) */}
      <div className="shrink-0 border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4 py-4 md:py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight">
                {lead.firstName} {lead.lastName}
              </h1>
              <div className="flex flex-wrap gap-2">
                {lead.phone && (
                  <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-sm">
                    <Phone className="h-3 w-3" />
                    <span>{lead.phone}</span>
                    <button
                      onClick={() => copyToClipboard(lead.phone)}
                      className="ml-1 hover:text-primary"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                )}
                {lead.email && (
                  <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-sm">
                    <Mail className="h-3 w-3" />
                    <a href={`mailto:${lead.email}`} className="hover:underline">
                      {lead.email}
                    </a>
                  </div>
                )}
                <StageBadge 
                  contactId={lead.id}
                  stage={lead.stage}
                  onUpdate={() => router.refresh()}
                />
                {tags.map((tag: string) => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DiscoveryButton
                clientId={lead.id}
                clientName={`${lead.firstName} ${lead.lastName}`}
                variant="default"
                size="sm"
              />
              {lead.ghlUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(lead.ghlUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  GHL
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyIntake}
              >
                <Clipboard className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky tab bar */}
      <div className="shrink-0 border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="h-12 bg-transparent border-0 p-0">
              <TabsTrigger value="profile" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                <User className="h-4 w-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="tasks" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                <CheckCircle className="h-4 w-4 mr-2" />
                Tasks ({openTasks.length})
              </TabsTrigger>
              <TabsTrigger value="activity" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                <Activity className="h-4 w-4 mr-2" />
                Activity ({lead.activities.length})
              </TabsTrigger>
              <TabsTrigger value="files" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                <Folder className="h-4 w-4 mr-2" />
                Files
              </TabsTrigger>
            </TabsList>

            {/* Scrollable tab panels */}
            <div className="min-h-0 grow overflow-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="container mx-auto px-4 py-5 md:py-6">
                {/* Profile Tab */}
                <TabsContent value="profile" className="space-y-6 mt-0">
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Contact Information */}
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
                                  firstName: lead.firstName,
                                  lastName: lead.lastName,
                                  email: lead.email,
                                  phone: lead.phone,
                                  source: lead.source || '',
                                  ghlUrl: lead.ghlUrl || '',
                                  tags: JSON.parse(lead.tags || '[]').join(', ')
                                })
                              }}>
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="p-5 md:p-6 space-y-4">
                        {!editing ? (
                          <>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Name</label>
                              <p className="mt-1">{lead.firstName} {lead.lastName}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Email</label>
                              <p className="mt-1">{lead.email || '-'}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Phone</label>
                              <p className="mt-1">{lead.phone || '-'}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Source</label>
                              <p className="mt-1">{lead.source || '-'}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Tags</label>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {tags.length > 0 ? tags.map((tag: string) => (
                                  <Badge key={tag} variant="secondary">{tag}</Badge>
                                )) : <span className="text-muted-foreground">-</span>}
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-sm font-medium">First Name</label>
                                <Input
                                  value={editForm.firstName}
                                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">Last Name</label>
                                <Input
                                  value={editForm.lastName}
                                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                                  className="mt-1"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Email</label>
                              <Input
                                type="email"
                                value={editForm.email}
                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Phone</label>
                              <Input
                                value={editForm.phone}
                                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Source</label>
                              <Input
                                value={editForm.source}
                                onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Tags (comma-separated)</label>
                              <Input
                                value={editForm.tags}
                                onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                                placeholder="hot-lead, facebook"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">GHL URL</label>
                              <Input
                                type="url"
                                value={editForm.ghlUrl}
                                onChange={(e) => setEditForm({ ...editForm, ghlUrl: e.target.value })}
                                className="mt-1"
                              />
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>

                    {/* Next Action */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Next Action</CardTitle>
                      </CardHeader>
                      <CardContent className="p-5 md:p-6">
                        {nextTask ? (
                          <div className="space-y-3">
                            <div>
                              <p className="font-medium">{nextTask.title}</p>
                              {nextTask.dueAt && (
                                <p className="text-sm text-muted-foreground mt-1">
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
                          <div className="py-6 text-sm text-muted-foreground text-center">
                            No open tasks
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Tasks Tab */}
                <TabsContent value="tasks" className="space-y-6 mt-0">
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle>Tasks</CardTitle>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          New Task
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5 md:p-6">
                      {lead.tasks.length === 0 ? (
                        <div className="py-6 text-sm text-muted-foreground text-center">
                          No tasks yet
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {lead.tasks.map((task: any) => {
                            const isOverdue = task.dueAt && isPast(new Date(task.dueAt)) && task.status === 'OPEN'
                            
                            return (
                              <div key={task.id} className={`flex items-start justify-between p-3 rounded-lg border ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
                                <div className="space-y-1">
                                  <p className={`font-medium ${task.status === 'DONE' ? 'line-through text-muted-foreground' : ''}`}>
                                    {task.title}
                                  </p>
                                  {task.dueAt && (
                                    <p className={`text-sm ${isOverdue ? 'text-red-600' : 'text-muted-foreground'}`}>
                                      Due: {format(new Date(task.dueAt), 'MMM d, yyyy h:mm a')}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
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
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleTaskToggle(task)}
                                  >
                                    {task.status === 'OPEN' ? 'Complete' : 'Reopen'}
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity" className="space-y-6 mt-0">
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle>Activity Timeline</CardTitle>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          Add Activity
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5 md:p-6">
                      {lead.activities.length === 0 ? (
                        <div className="py-6 text-sm text-muted-foreground text-center">
                          No activities yet
                        </div>
                      ) : (
                        <ul className="space-y-3">
                          {lead.activities.map((activity: any) => (
                            <li key={activity.id} className="rounded-md border bg-white">
                              <div className="p-4 md:p-5 flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3">
                                  <div className="mt-1">
                                    {activity.type === 'NOTE' && <FileText className="h-4 w-4 text-blue-600" />}
                                    {activity.type === 'CALL' && <Phone className="h-4 w-4 text-green-600" />}
                                    {activity.type === 'EMAIL' && <Mail className="h-4 w-4 text-purple-600" />}
                                    {activity.type === 'TASK' && <CheckCircle className="h-4 w-4 text-gray-600" />}
                                  </div>
                                  <div className="space-y-1.5">
                                    <p className="text-sm leading-5">{activity.summary}</p>
                                    {activity.details && (
                                      <p className="text-xs text-muted-foreground">{activity.details}</p>
                                    )}
                                    {activity.outcome && (
                                      <p className="text-xs text-muted-foreground">
                                        {activity.type} • Outcome: {activity.outcome}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {format(new Date(activity.createdAt), 'MMM d, yyyy h:mm a')}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Files Tab */}
                <TabsContent value="files" className="space-y-6 mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Files & Documents</CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 md:p-6">
                      <div className="min-h-[24rem] flex items-center justify-center">
                        <div className="text-center space-y-2">
                          <Folder className="h-12 w-12 mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">File storage coming soon</p>
                          <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </div>
      </div>
    </>
  )
}