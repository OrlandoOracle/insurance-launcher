import { TaskStatus } from '@prisma/client'

// Archive/unarchive helper functions
export const archivePatch = (now: Date = new Date()) => ({
  status: 'DONE' as TaskStatus,
  archivedAt: now,
  completedAt: now,
})

export const unarchivePatch = () => ({
  status: 'OPEN' as TaskStatus,
  archivedAt: null,
  completedAt: null,
})