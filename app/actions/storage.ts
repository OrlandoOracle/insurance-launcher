'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import {
  testDirectoryAccess,
  moveDataDirectory,
  createBackup,
  listBackups,
  getDataDir,
  clearDataDirCache
} from '@/lib/storage'

export async function updateDataDirectory(newPath: string) {
  try {
    // Test new directory
    const test = await testDirectoryAccess(newPath)
    if (!test.success) {
      return {
        success: false,
        error: test.error || 'Directory is not accessible'
      }
    }
    
    // Get current directory
    const currentDir = await getDataDir()
    
    if (currentDir === newPath) {
      return {
        success: false,
        error: 'This is already the current data directory'
      }
    }
    
    // Move data to new directory
    const moveResult = await moveDataDirectory(currentDir, newPath)
    if (!moveResult.success) {
      return {
        success: false,
        error: moveResult.message
      }
    }
    
    // Update setting in database
    await prisma.setting.upsert({
      where: { id: 'singleton' },
      update: { dataDir: newPath },
      create: { 
        id: 'singleton',
        dataDir: newPath
      }
    })
    
    // Clear cache so new directory is used
    clearDataDirCache()
    
    revalidatePath('/settings')
    
    return {
      success: true,
      message: moveResult.message,
      backupPath: moveResult.backupPath
    }
  } catch (error: any) {
    console.error('[Storage] Failed to update data directory:', error)
    return {
      success: false,
      error: error.message || 'Failed to update data directory'
    }
  }
}

export async function testDataDirectory(path: string) {
  try {
    const result = await testDirectoryAccess(path)
    return {
      success: result.success,
      readable: result.readable,
      writable: result.writable,
      error: result.error
    }
  } catch (error: any) {
    return {
      success: false,
      readable: false,
      writable: false,
      error: error.message
    }
  }
}

export async function createDatabaseBackup() {
  try {
    const result = await createBackup()
    
    if (result.success) {
      revalidatePath('/settings')
      return {
        success: true,
        path: result.path,
        message: `Backup created successfully`
      }
    } else {
      return {
        success: false,
        error: result.error || 'Failed to create backup'
      }
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to create backup'
    }
  }
}

export async function getDatabaseBackups() {
  try {
    const backups = await listBackups()
    return {
      success: true,
      backups
    }
  } catch (error: any) {
    return {
      success: false,
      backups: [],
      error: error.message
    }
  }
}

export async function getStorageInfo() {
  try {
    const dataDir = await getDataDir()
    const backups = await listBackups()
    
    // Get import batches
    const importBatches = await prisma.importBatch.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    })
    
    return {
      success: true,
      dataDir,
      backups,
      importBatches
    }
  } catch (error: any) {
    return {
      success: false,
      dataDir: await getDataDir(),
      backups: [],
      importBatches: [],
      error: error.message
    }
  }
}