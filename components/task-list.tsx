'use client'

import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, Clock, AlertCircle } from "lucide-react"
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
}

export function TaskList({ tasks, showAll = false }: TaskListProps) {
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
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>My Tasks</CardTitle>
        {!showAll && tasks.length > 5 && (
          <Link href="/tasks">
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        )}
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