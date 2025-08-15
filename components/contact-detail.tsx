'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { updateContact, addActivity } from '@/app/actions/contacts'
import { createTask } from '@/app/actions/tasks'
import { ExternalLink, Phone, Plus, FileText, Mail, MessageSquare, Calendar, DollarSign } from 'lucide-react'
import { format } from 'date-fns'
import { AIPromptModal } from './ai-prompt-modal'

export function ContactDetail({ contact }: { contact: any }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState(contact)
  const [showNoteDialog, setShowNoteDialog] = useState(false)
  const [showCallDialog, setShowCallDialog] = useState(false)
  const [showTaskDialog, setShowTaskDialog] = useState(false)
  const [showAIPrompt, setShowAIPrompt] = useState<'summary' | 'objection' | null>(null)
  const [noteText, setNoteText] = useState('')
  const [callOutcome, setCallOutcome] = useState('')
  const [callRevenue, setCallRevenue] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDue, setTaskDue] = useState('')

  const handleSave = async () => {
    await updateContact(contact.id, editData)
    setIsEditing(false)
  }

  const handleAddNote = async () => {
    await addActivity(contact.id, {
      type: 'NOTE',
      summary: noteText
    })
    setNoteText('')
    setShowNoteDialog(false)
  }

  const handleLogCall = async () => {
    const activityData: any = {
      type: 'CALL',
      summary: `Call - ${callOutcome}`,
      outcome: callOutcome as any,
      direction: 'OUTBOUND'
    }
    
    if (callOutcome === 'CLOSE' && callRevenue) {
      activityData.revenue = parseFloat(callRevenue)
    }
    
    await addActivity(contact.id, activityData)
    
    // Handle follow-up logic
    if (callOutcome === 'DIAL') {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      
      await createTask({
        contactId: contact.id,
        title: 'Follow up on call attempt',
        dueAt: tomorrow,
        source: 'SYSTEM'
      })
    }
    
    setCallOutcome('')
    setCallRevenue('')
    setShowCallDialog(false)
  }

  const handleAddTask = async () => {
    await createTask({
      contactId: contact.id,
      title: taskTitle,
      dueAt: taskDue ? new Date(taskDue) : undefined
    })
    setTaskTitle('')
    setTaskDue('')
    setShowTaskDialog(false)
  }

  const openKixie = () => {
    window.open('https://app.kixie.com', '_blank')
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">
            {contact.firstName} {contact.lastName}
          </h1>
          <div className="flex gap-2 mt-2">
            <Badge>{contact.stage}</Badge>
            {JSON.parse(contact.tags || '[]').map((tag: string) => (
              <Badge key={tag} variant="outline">{tag}</Badge>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          {contact.ghlUrl && (
            <a href={contact.ghlUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open GHL
              </Button>
            </a>
          )}
          <Button variant="outline" onClick={openKixie}>
            <Phone className="mr-2 h-4 w-4" />
            Start Kixie
          </Button>
          <Button variant="outline" onClick={() => setShowTaskDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
          <Button variant="outline" onClick={() => setShowNoteDialog(true)}>
            <FileText className="mr-2 h-4 w-4" />
            Add Note
          </Button>
          <Button onClick={() => setShowCallDialog(true)}>
            <Phone className="mr-2 h-4 w-4" />
            Log Call
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact Details</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">First Name</label>
                  <Input
                    value={editData.firstName}
                    onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Last Name</label>
                  <Input
                    value={editData.lastName}
                    onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    value={editData.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <Input
                    value={editData.phone}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">How Heard</label>
                  <Input
                    value={editData.howHeard || ''}
                    onChange={(e) => setEditData({ ...editData, howHeard: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">GHL URL</label>
                  <Input
                    value={editData.ghlUrl || ''}
                    onChange={(e) => setEditData({ ...editData, ghlUrl: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave}>Save</Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <a href={`mailto:${contact.email}`} className="hover:underline">{contact.email}</a>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Phone</span>
                  <span>{contact.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">How Heard</span>
                  <span>{contact.howHeard || '-'}</span>
                </div>
                {contact.ghlUrl && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">GHL URL</span>
                    <a href={contact.ghlUrl} target="_blank" className="hover:underline text-sm">View</a>
                  </div>
                )}
                <Button className="w-full mt-4" variant="outline" onClick={() => setIsEditing(true)}>
                  Edit Details
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Helpers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => setShowAIPrompt('summary')}
            >
              <FileText className="mr-2 h-4 w-4" />
              Generate Call Summary Prompt
            </Button>
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => setShowAIPrompt('objection')}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Generate Objection Helper
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {contact.activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activities yet</p>
            ) : (
              contact.activities.map((activity: any) => (
                <div key={activity.id} className="flex gap-4 pb-4 border-b last:border-0">
                  <div className="flex-shrink-0">
                    {activity.type === 'CALL' ? <Phone className="h-4 w-4" /> :
                     activity.type === 'EMAIL' ? <Mail className="h-4 w-4" /> :
                     activity.type === 'NOTE' ? <FileText className="h-4 w-4" /> :
                     <MessageSquare className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{activity.summary}</span>
                      {activity.outcome && (
                        <Badge variant="outline" className="text-xs">{activity.outcome}</Badge>
                      )}
                      {activity.revenue && (
                        <Badge variant="outline" className="text-xs">
                          <DollarSign className="h-3 w-3 mr-1" />
                          {activity.revenue}
                        </Badge>
                      )}
                    </div>
                    {activity.details && (
                      <p className="text-sm text-muted-foreground mt-1">{activity.details}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(activity.createdAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
          </DialogHeader>
          <textarea
            className="w-full h-32 p-2 border rounded"
            placeholder="Enter your note..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteDialog(false)}>Cancel</Button>
            <Button onClick={handleAddNote}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCallDialog} onOpenChange={setShowCallDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Call</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Outcome</label>
              <select
                className="w-full p-2 border rounded"
                value={callOutcome}
                onChange={(e) => setCallOutcome(e.target.value)}
              >
                <option value="">Select outcome...</option>
                <option value="DIAL">Dial (No Answer)</option>
                <option value="LEFT_VM">Left Voicemail</option>
                <option value="CONNECT">Connected</option>
                <option value="CLOSE">Closed Deal</option>
              </select>
            </div>
            {callOutcome === 'CLOSE' && (
              <div>
                <label className="text-sm font-medium">Revenue</label>
                <Input
                  type="number"
                  placeholder="Enter revenue amount"
                  value={callRevenue}
                  onChange={(e) => setCallRevenue(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCallDialog(false)}>Cancel</Button>
            <Button onClick={handleLogCall} disabled={!callOutcome}>Log Call</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Task Title</label>
              <Input
                placeholder="Enter task title..."
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Due Date (Optional)</label>
              <Input
                type="datetime-local"
                value={taskDue}
                onChange={(e) => setTaskDue(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskDialog(false)}>Cancel</Button>
            <Button onClick={handleAddTask} disabled={!taskTitle}>Add Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showAIPrompt && (
        <AIPromptModal
          type={showAIPrompt}
          contact={contact}
          onClose={() => setShowAIPrompt(null)}
        />
      )}
    </div>
  )
}