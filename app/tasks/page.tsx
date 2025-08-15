'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { getTasks, createTask, markTaskComplete, markTaskOpen } from '@/app/actions/tasks'
import { format, isPast } from 'date-fns'
import { Plus, CheckCircle, Clock, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react'
import Link from 'next/link'

type SortField = 'dueAt' | 'contact' | 'status'
type SortDirection = 'asc' | 'desc'

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewTask, setShowNewTask] = useState(false)
  const [sortField, setSortField] = useState<SortField>('dueAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [newTaskData, setNewTaskData] = useState({
    title: '',
    dueAt: '',
    contactId: ''
  })

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    setLoading(true)
    const data = await getTasks()
    setTasks(data)
    setLoading(false)
  }

  const handleCreateTask = async () => {
    await createTask({
      title: newTaskData.title,
      dueAt: newTaskData.dueAt ? new Date(newTaskData.dueAt) : undefined,
      contactId: newTaskData.contactId || undefined
    })
    setNewTaskData({ title: '', dueAt: '', contactId: '' })
    setShowNewTask(false)
    loadTasks()
  }

  const handleToggleStatus = async (task: any) => {
    if (task.status === 'OPEN') {
      await markTaskComplete(task.id)
    } else {
      await markTaskOpen(task.id)
    }
    loadTasks()
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedTasks = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => {
      let aVal, bVal
      
      switch (sortField) {
        case 'dueAt':
          aVal = a.dueAt ? new Date(a.dueAt).getTime() : Infinity
          bVal = b.dueAt ? new Date(b.dueAt).getTime() : Infinity
          break
        case 'contact':
          aVal = a.contact ? `${a.contact.firstName} ${a.contact.lastName}` : 'zzz'
          bVal = b.contact ? `${b.contact.firstName} ${b.contact.lastName}` : 'zzz'
          break
        case 'status':
          aVal = a.status
          bVal = b.status
          break
        default:
          return 0
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
    
    return sorted
  }, [tasks, sortField, sortDirection])

  const getStatusBadge = (task: any) => {
    const isOverdue = task.dueAt && isPast(new Date(task.dueAt)) && task.status === 'OPEN'
    
    if (isOverdue) {
      return (
        <button
          onClick={() => handleToggleStatus(task)}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
        >
          <AlertCircle className="h-3 w-3" />
          Overdue
        </button>
      )
    }
    
    if (task.status === 'DONE') {
      return (
        <button
          onClick={() => handleToggleStatus(task)}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
        >
          <CheckCircle className="h-3 w-3" />
          Done
        </button>
      )
    }
    
    return (
      <button
        onClick={() => handleToggleStatus(task)}
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
      >
        <Clock className="h-3 w-3" />
        Open
      </button>
    )
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4 inline ml-1" /> : 
      <ChevronDown className="h-4 w-4 inline ml-1" />
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Tasks</h1>
        <Button onClick={() => setShowNewTask(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : sortedTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tasks yet. Create your first task!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('contact')}
                      className="font-medium hover:text-primary"
                    >
                      Contact
                      <SortIcon field="contact" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('dueAt')}
                      className="font-medium hover:text-primary"
                    >
                      Due Date
                      <SortIcon field="dueAt" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('status')}
                      className="font-medium hover:text-primary"
                    >
                      Status
                      <SortIcon field="status" />
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTasks.map((task) => {
                  const isOverdue = task.dueAt && isPast(new Date(task.dueAt)) && task.status === 'OPEN'
                  
                  return (
                    <TableRow key={task.id}>
                      <TableCell className={`font-medium ${task.status === 'DONE' ? 'line-through text-muted-foreground' : ''}`}>
                        {task.title}
                        {task.source !== 'MANUAL' && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {task.source}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {task.contact ? (
                          <Link 
                            href={`/leads/${task.contact.id}`} 
                            className="hover:underline text-primary"
                          >
                            {task.contact.firstName} {task.contact.lastName}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className={isOverdue ? 'text-red-600' : ''}>
                        {task.dueAt ? format(new Date(task.dueAt), 'MMM d, yyyy h:mm a') : '-'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(task)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
    </div>
  )
}