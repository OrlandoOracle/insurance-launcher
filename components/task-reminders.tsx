'use client'

import { useEffect, useState, useRef } from 'react'
import { getOverdueTasks, getTasks } from '@/app/actions/tasks'
import { toast } from 'sonner'
import { notifyPush, requestNotificationPermission } from '@/lib/notifier'
import { format, addMinutes, isPast, isWithinInterval } from 'date-fns'
import { AlertCircle, Bell, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TaskReminder {
  id: string
  title: string
  dueAt: Date | null
  contactName?: string
}

export function TaskReminders() {
  const [remindedTasks, setRemindedTasks] = useState<Set<string>>(new Set())
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
    }

    // Check for due tasks every 60 seconds
    const checkTasks = async () => {
      try {
        const [overdueTasks, allOpenTasks] = await Promise.all([
          getOverdueTasks(),
          getTasks('OPEN')
        ])

        const now = new Date()
        const fifteenMinutesFromNow = addMinutes(now, 15)

        // Find tasks due within 15 minutes
        const upcomingTasks = allOpenTasks.filter(task => {
          if (!task.dueAt || remindedTasks.has(task.id)) return false
          const dueDate = new Date(task.dueAt)
          return isWithinInterval(dueDate, { start: now, end: fifteenMinutesFromNow })
        })

        // Find overdue tasks not yet reminded
        const newOverdueTasks = overdueTasks.filter(task => !remindedTasks.has(task.id))

        // Show reminders for upcoming tasks
        upcomingTasks.forEach(task => {
          const dueDate = new Date(task.dueAt!)
          const minutesUntilDue = Math.round((dueDate.getTime() - now.getTime()) / 60000)
          const contactName = task.contact ? `${task.contact.firstName} ${task.contact.lastName}` : ''
          
          const title = `Task due in ${minutesUntilDue} minutes`
          const message = `${task.title}${contactName ? ` - ${contactName}` : ''}`
          
          // Show toast
          toast.warning(message, {
            duration: 10000,
            icon: <Bell className="h-4 w-4" />,
            action: {
              label: 'Dismiss',
              onClick: () => {}
            }
          })
          
          // Show browser notification
          if (notificationPermission === 'granted') {
            notifyPush(title, message, {
              tag: task.id,
              requireInteraction: false
            })
          }
          
          setRemindedTasks(prev => new Set([...prev, task.id]))
        })

        // Show reminders for overdue tasks
        newOverdueTasks.forEach(task => {
          const contactName = task.contact ? `${task.contact.firstName} ${task.contact.lastName}` : ''
          
          const title = 'Overdue Task!'
          const message = `${task.title}${contactName ? ` - ${contactName}` : ''}`
          
          // Show toast
          toast.error(message, {
            duration: 15000,
            icon: <AlertCircle className="h-4 w-4" />,
            action: {
              label: 'View Tasks',
              onClick: () => window.location.href = '/tasks'
            }
          })
          
          // Show browser notification
          if (notificationPermission === 'granted') {
            notifyPush(title, message, {
              tag: task.id,
              requireInteraction: true,
              icon: '/favicon.ico'
            })
          }
          
          setRemindedTasks(prev => new Set([...prev, task.id]))
        })
      } catch (error) {
        console.error('Error checking task reminders:', error)
      }
    }

    // Initial check
    checkTasks()

    // Set up interval
    checkIntervalRef.current = setInterval(checkTasks, 60000) // Check every 60 seconds

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
    }
  }, [remindedTasks, notificationPermission])

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission()
    if (granted) {
      setNotificationPermission('granted')
      toast.success('Notifications enabled! You\'ll receive alerts for upcoming and overdue tasks.')
    } else {
      toast.error('Notifications blocked. You can enable them in your browser settings.')
    }
  }

  // Show permission request banner if not granted
  if (typeof window !== 'undefined' && 'Notification' in window && notificationPermission === 'default') {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-sm">
        <div className="bg-white border rounded-lg shadow-lg p-4">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-sm">Enable Task Reminders</p>
              <p className="text-xs text-muted-foreground mt-1">
                Get notified when tasks are due or overdue
              </p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={handleRequestPermission}>
                  Enable
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => setNotificationPermission('denied')}
                >
                  Not Now
                </Button>
              </div>
            </div>
            <button
              onClick={() => setNotificationPermission('denied')}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}