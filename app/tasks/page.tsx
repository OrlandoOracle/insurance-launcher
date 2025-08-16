'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { TaskReminders } from '@/components/task-reminders'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { getTasks, getTasksCount, createTask, markTaskComplete, markTaskOpen } from '@/app/actions/tasks'
import { format, isPast } from 'date-fns'
import { Plus, CheckCircle, Clock, AlertCircle, ChevronUp, ChevronDown, Flag } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { 
  useBulkSelectionStore, 
  type TaskFilters 
} from '@/components/tasks/useBulkSelectionStore'
import { 
  BulkToolbar, 
  type BulkAction 
} from '@/components/tasks/BulkToolbar'

type SortField = 'dueAt' | 'contact' | 'status' | 'priority' | 'stage'
type SortDirection = 'asc' | 'desc'

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewTask, setShowNewTask] = useState(false)
  const [sortField, setSortField] = useState<SortField>('dueAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [searchQuery, setSearchQuery] = useState('')
  const [totalCount, setTotalCount] = useState(0)
  const [newTaskData, setNewTaskData] = useState({
    title: '',
    dueAt: '',
    contactId: ''
  })

  // Bulk selection state
  const {
    mode,
    selectedIdsOnPage,
    allMatchingSelected,
    totalMatchingCount,
    setScope,
    toggleRow,
    togglePage,
    selectAllMatching,
    clear,
    isSelected,
    getSelectedIds
  } = useBulkSelectionStore()

  // Build current filters
  const filters: TaskFilters = useMemo(() => ({
    q: searchQuery || undefined
  }), [searchQuery])

  useEffect(() => {
    loadTasks()
  }, [searchQuery])

  useEffect(() => {
    // Update scope in store
    setScope({
      filters,
      sort: { field: sortField, direction: sortDirection },
      page: 1,
      pageSize: 100
    })
  }, [filters, sortField, sortDirection])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || 
          target.tagName === 'TEXTAREA' || 
          target.contentEditable === 'true') {
        return
      }

      // Handle shortcuts
      switch (e.key.toLowerCase()) {
        case 'a':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault()
            const pageIds = tasks.map(t => t.id)
            togglePage(pageIds, pageIds.length > 0)
          }
          break
        case 'd':
          if (!e.metaKey && !e.ctrlKey && mode !== 'NONE') {
            e.preventDefault()
            handleBulkAction({ type: 'status', value: 'DONE' })
          }
          break
        case 'o':
          if (!e.metaKey && !e.ctrlKey && mode !== 'NONE') {
            e.preventDefault()
            handleBulkAction({ type: 'status', value: 'OPEN' })
          }
          break
        case 'u':
          if (!e.metaKey && !e.ctrlKey && mode !== 'NONE') {
            e.preventDefault()
            clear()
          }
          break
        case 'delete':
        case 'backspace':
          if (!e.metaKey && !e.ctrlKey && mode !== 'NONE') {
            e.preventDefault()
            handleBulkAction({ type: 'delete' })
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [mode, tasks, togglePage, clear])

  const loadTasks = async () => {
    setLoading(true)
    const [data, count] = await Promise.all([
      getTasks(filters),
      getTasksCount(filters)
    ])
    setTasks(data)
    setTotalCount(count)
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

  const handleBulkAction = async (action: BulkAction) => {
    const scope = allMatchingSelected ? 'GLOBAL' : 'IDS'
    const ids = allMatchingSelected ? undefined : getSelectedIds()
    
    let endpoint = ''
    let body: any = { scope, filters, ids }
    
    if (action.type === 'delete') {
      endpoint = '/api/tasks/bulk/delete'
    } else {
      endpoint = '/api/tasks/bulk/update'
      body.patch = {}
      
      switch (action.type) {
        case 'status':
          body.patch.status = action.value
          break
        case 'dueAt':
          body.patch.dueAt = action.value
          break
        case 'priority':
          body.patch.priority = action.value
          break
        case 'stage':
          body.patch.stage = action.value
          break
        case 'label':
          body.patch.label = action.value
          break
      }
    }
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      const result = await res.json()
      
      if (result.success) {
        const actionName = action.type === 'delete' ? 'deleted' : 'updated'
        const count = action.type === 'delete' ? result.deleted : result.modified
        
        if (count < result.matched) {
          toast.warning(`Partially ${actionName}: ${count} of ${result.matched} tasks`)
        } else {
          toast.success(`Successfully ${actionName} ${count} task${count !== 1 ? 's' : ''}`, {
            duration: 8000,
            action: action.type !== 'delete' ? {
              label: 'Undo',
              onClick: () => {
                // Implement undo logic here
                toast.info('Undo not yet implemented')
              }
            } : undefined
          })
        }
        
        clear()
        loadTasks()
      } else {
        toast.error(result.error || 'Action failed')
      }
    } catch (error) {
      console.error('Bulk action error:', error)
      toast.error('Failed to perform bulk action')
    }
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
        case 'priority':
          aVal = a.priority || 'MEDIUM'
          bVal = b.priority || 'MEDIUM'
          break
        case 'stage':
          aVal = a.stage || 'NEW'
          bVal = b.stage || 'NEW'
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

  const currentPageIds = useMemo(() => sortedTasks.map(t => t.id), [sortedTasks])
  const pageAllChecked = currentPageIds.length > 0 && currentPageIds.every(id => isSelected(id))
  const pageIndeterminate = !pageAllChecked && currentPageIds.some(id => isSelected(id))

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

  const getPriorityIcon = (priority: string) => {
    const color = priority === 'HIGH' ? 'text-red-500' : 
                  priority === 'LOW' ? 'text-gray-400' : 
                  'text-yellow-500'
    return <Flag className={`h-3 w-3 ${color}`} />
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4 inline ml-1" /> : 
      <ChevronDown className="h-4 w-4 inline ml-1" />
  }

  return (
    <>
    <TaskReminders />
    <section className="flex h-full min-h-0 flex-col">
      {/* Page header stays visible */}
      <div className="shrink-0 border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold">Tasks</h1>
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
            </div>
            <Button onClick={() => setShowNewTask(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Task
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk toolbar */}
      <BulkToolbar 
        onAction={handleBulkAction}
        totalTasks={totalCount}
      />

      {/* Scrollable content area */}
      <div
        className="flex-1 min-h-0 overflow-auto"
        style={{ WebkitOverflowScrolling: 'touch' }}
        data-scroll="tasks"
      >
        <div className="container mx-auto px-4 py-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Tasks ({totalCount})</CardTitle>
                {mode === 'PAGE' && !allMatchingSelected && selectedIdsOnPage.size > 0 && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">
                      {selectedIdsOnPage.size} selected on this page.
                    </span>
                    <button
                      className="ml-2 text-primary underline hover:no-underline"
                      onClick={() => selectAllMatching(totalCount)}
                    >
                      Select all {totalCount} matching
                    </button>
                  </div>
                )}
                {allMatchingSelected && (
                  <div className="text-sm text-muted-foreground">
                    All {totalMatchingCount} matching tasks selected
                  </div>
                )}
              </div>
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
                      <TableHead className="w-12">
                        <Checkbox
                          checked={pageAllChecked}
                          indeterminate={pageIndeterminate}
                          onCheckedChange={(checked) => 
                            togglePage(currentPageIds, !!checked)
                          }
                          aria-label="Select all"
                        />
                      </TableHead>
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
                          onClick={() => handleSort('priority')}
                          className="font-medium hover:text-primary"
                        >
                          Priority
                          <SortIcon field="priority" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort('stage')}
                          className="font-medium hover:text-primary"
                        >
                          Stage
                          <SortIcon field="stage" />
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
                      const selected = isSelected(task.id)
                      
                      return (
                        <TableRow 
                          key={task.id}
                          className={selected ? 'bg-muted/50' : ''}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selected}
                              onCheckedChange={(checked) => 
                                toggleRow(task.id, !!checked)
                              }
                              aria-label={`Select ${task.title}`}
                            />
                          </TableCell>
                          <TableCell className={`font-medium ${task.status === 'DONE' ? 'line-through text-muted-foreground' : ''}`}>
                            {task.title}
                            {task.source !== 'MANUAL' && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                {task.source}
                              </Badge>
                            )}
                            {task.label && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                {task.label}
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
                            <div className="flex items-center gap-1">
                              {getPriorityIcon(task.priority || 'MEDIUM')}
                              <span className="text-xs">
                                {task.priority || 'MEDIUM'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {task.stage || 'NEW'}
                            </Badge>
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
      </div>
    </section>
    </>
  )
}