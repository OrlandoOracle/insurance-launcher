'use server'

import { prisma } from '@/lib/db'
import { TaskStatus, TaskSource } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export async function getTasks(status?: TaskStatus, contactId?: string) {
  try {
    const where: any = {}
    
    if (status) {
      where.status = status
    }
    
    if (contactId) {
      where.contactId = contactId
    }
    
    return await prisma.task.findMany({
      where,
      include: {
        contact: true
      },
      orderBy: [
        { status: 'asc' },
        { dueAt: 'asc' },
        { createdAt: 'desc' }
      ]
    })
  } catch (error: any) {
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.warn('[Tasks] Table missing, returning empty array. Run: npm run db:ensure')
      return []
    }
    console.error('[Tasks] Error fetching tasks:', error)
    throw error
  }
}

export async function getOverdueTasks() {
  try {
    return await prisma.task.findMany({
      where: {
        status: 'OPEN',
        dueAt: {
          lt: new Date()
        }
      },
      include: {
        contact: true
      },
      orderBy: {
        dueAt: 'asc'
      }
    })
  } catch (error: any) {
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.warn('[Tasks:Overdue] Table missing, returning empty array. Run: npm run db:ensure')
      return []
    }
    console.error('[Tasks:Overdue] Error fetching overdue tasks:', error)
    throw error
  }
}

export async function createTask(data: {
  title: string
  dueAt?: Date
  contactId?: string
  source?: TaskSource
}) {
  const task = await prisma.task.create({
    data: {
      ...data,
      source: data.source || 'MANUAL'
    }
  })
  
  revalidatePath('/tasks')
  if (data.contactId) {
    revalidatePath(`/leads/${data.contactId}`)
  }
  
  return task
}

export async function updateTask(id: string, data: Partial<{
  title: string
  dueAt: Date | null
  status: TaskStatus
}>) {
  const task = await prisma.task.update({
    where: { id },
    data
  })
  
  revalidatePath('/tasks')
  if (task.contactId) {
    revalidatePath(`/leads/${task.contactId}`)
  }
  
  return task
}

export async function deleteTask(id: string) {
  const task = await prisma.task.delete({
    where: { id }
  })
  
  revalidatePath('/tasks')
  if (task.contactId) {
    revalidatePath(`/leads/${task.contactId}`)
  }
  
  return task
}

export async function markTaskComplete(id: string) {
  const task = await prisma.task.findUnique({
    where: { id },
    include: { contact: true }
  })
  
  if (!task) {
    throw new Error('Task not found')
  }
  
  // Mark task as done
  const updatedTask = await updateTask(id, { status: 'DONE' })
  
  // Create activity log
  if (task.contactId) {
    await prisma.activity.create({
      data: {
        contactId: task.contactId,
        type: 'TASK',
        summary: `Task completed: ${task.title}`,
        details: task.dueAt ? `Was due: ${task.dueAt.toISOString()}` : undefined
      }
    })
  }
  
  return updatedTask
}

export async function markTaskOpen(id: string) {
  return updateTask(id, { status: 'OPEN' })
}