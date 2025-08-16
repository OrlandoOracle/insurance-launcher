'use client'

import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CheckCircle, Clock, AlertCircle, Plus } from "lucide-react"
import { markTaskComplete } from "@/app/actions/tasks"
import Link from "next/link"

interface Task {
  id: string
  title: string
  dueAt: Date | null
  status: string
  contact: {
    id: string
    firstName: string
    lastName: string
  } | null
}

interface TaskListProps {
  tasks: Task[]
  showAll?: boolean
  onAddTask?: () => void
}

export function TaskList({ tasks, showAll = false, onAddTask }: TaskListProps) {
  const displayTasks = showAll ? tasks : tasks.slice(0, 5)
  
  const handleComplete = async (taskId: string) => {
    await markTaskComplete(taskId)
  }
  
  const isOverdue = (dueAt: Date | null) => {
    if (!dueAt) return false
    return new Date(dueAt) < new Date()
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 sm:gap-2">
            <CardTitle className="text-base sm:text-lg">My Tasks</CardTitle>
            {onAddTask && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={onAddTask}
                      className="h-7 w-7 sm:h-8 sm:w-8 group"
                      aria-label="Add Task"
                    >
                      <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover:text-[#2563EB] transition-colors" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add Task</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {!showAll && tasks.length > 5 && (
            <Link href="/tasks">
              <Button variant="ghost" size="sm" className="text-xs sm:text-sm">View All</Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {displayTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open tasks</p>
          ) : (
            displayTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-2 hover:bg-accent rounded-lg">
                <div className="flex items-center gap-2">
                  {task.status === 'DONE' ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : isOverdue(task.dueAt) ? (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  ) : (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{task.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {task.contact && (
                        <Link href={`/leads/${task.contact.id}`} className="hover:underline">
                          {task.contact.firstName} {task.contact.lastName}
                        </Link>
                      )}
                      {task.dueAt && (
                        <>
                          {task.contact && <span>•</span>}
                          <span className={isOverdue(task.dueAt) ? "text-red-600" : ""}>
                            {format(new Date(task.dueAt), "MMM d, h:mm a")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {task.status === 'OPEN' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleComplete(task.id)}
                  >
                    Complete
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}