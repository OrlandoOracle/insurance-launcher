import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'

// Cache for data directory to avoid repeated DB calls
let cachedDataDir: string | null = null

/**
 * Get the data directory from Settings DB or environment
 * Note: This version doesn't use Prisma to avoid circular dependencies
 */
export async function getDataDir(): Promise<string> {
  // Return cached value if available
  if (cachedDataDir) {
    return cachedDataDir
  }

  // For now, just use environment variable or default
  // The Settings page will handle updating this via server actions
  const dir = process.env.DATA_DIR || path.join(process.cwd(), 'data')
  cachedDataDir = dir
  return dir
}

/**
 * Get the data directory synchronously (for initial DB setup)
 */
export function getDataDirSync(): string {
  // First check cache
  if (cachedDataDir) {
    return cachedDataDir
  }
  
  // Use environment variable or default
  const dir = process.env.DATA_DIR || path.join(process.cwd(), 'data')
  cachedDataDir = dir
  return dir
}

/**
 * Clear the cached data directory (use after updating settings)
 */
export function clearDataDirCache() {
  cachedDataDir = null
}

/**
 * Ensure all required directories exist
 */
export async function ensureDataDirs(): Promise<void> {
  const dataDir = await getDataDir()
  
  const dirs = [
    dataDir,
    path.join(dataDir, 'imports'),
    path.join(dataDir, 'backups')
  ]
  
  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true })
      console.log(`[Storage] Ensured directory: ${dir}`)
    } catch (error) {
      console.error(`[Storage] Failed to create directory ${dir}:`, error)
    }
  }
}

/**
 * Ensure database exists and is in the right location
 */
export async function ensureDatabase(): Promise<void> {
  const dataDir = await getDataDir()
  const targetDbPath = path.join(dataDir, 'insurance-launcher.db')
  
  // Check common old locations
  const oldLocations = [
    path.join(process.cwd(), 'data', 'insurance-launcher.db'),
    path.join(process.cwd(), 'prisma', 'data', 'insurance-launcher.db'),
    './data/insurance-launcher.db',
    './prisma/data/insurance-launcher.db'
  ]
  
  try {
    // Check if target DB already exists
    await fs.access(targetDbPath)
    console.log(`[Storage] Database exists at: ${targetDbPath}`)
    return
  } catch {
    // Target doesn't exist, look for old DB to migrate
    console.log(`[Storage] Database not found at: ${targetDbPath}`)
  }
  
  // Look for existing DB in old locations
  for (const oldPath of oldLocations) {
    try {
      const resolvedOldPath = path.resolve(oldPath)
      await fs.access(resolvedOldPath)
      
      console.log(`[Storage] Found old database at: ${resolvedOldPath}`)
      console.log(`[Storage] Migrating to: ${targetDbPath}`)
      
      // Create backup
      const backupDir = path.join(dataDir, 'backups')
      await fs.mkdir(backupDir, { recursive: true })
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupPath = path.join(backupDir, `insurance-launcher.db.${timestamp}.bak`)
      
      // Copy old to new location
      await fs.copyFile(resolvedOldPath, targetDbPath)
      console.log(`[Storage] Database migrated successfully`)
      
      // Also copy to backup
      await fs.copyFile(resolvedOldPath, backupPath)
      console.log(`[Storage] Backup created at: ${backupPath}`)
      
      return
    } catch {
      // This old location doesn't exist or isn't accessible
      continue
    }
  }
  
  console.log('[Storage] No existing database found, will be created on first use')
}

/**
 * Test if a directory is writable
 */
export async function testDirectoryAccess(dirPath: string): Promise<{ 
  success: boolean
  readable: boolean
  writable: boolean
  error?: string 
}> {
  try {
    // Test if directory exists
    await fs.access(dirPath, fsSync.constants.F_OK)
    
    // Test read permission
    let readable = false
    try {
      await fs.access(dirPath, fsSync.constants.R_OK)
      readable = true
    } catch {}
    
    // Test write permission
    let writable = false
    try {
      await fs.access(dirPath, fsSync.constants.W_OK)
      
      // Actually try to write a test file
      const testFile = path.join(dirPath, '.insurance-test-' + Date.now())
      await fs.writeFile(testFile, 'test')
      await fs.unlink(testFile)
      writable = true
    } catch {}
    
    return {
      success: readable && writable,
      readable,
      writable
    }
  } catch (error: any) {
    // Directory doesn't exist, try to create it
    try {
      await fs.mkdir(dirPath, { recursive: true })
      return testDirectoryAccess(dirPath) // Retry after creating
    } catch (createError: any) {
      return {
        success: false,
        readable: false,
        writable: false,
        error: createError.message
      }
    }
  }
}

/**
 * Move data directory to a new location
 */
export async function moveDataDirectory(
  oldDir: string, 
  newDir: string
): Promise<{ 
  success: boolean
  message: string
  backupPath?: string 
}> {
  try {
    // Test new directory
    const access = await testDirectoryAccess(newDir)
    if (!access.success) {
      return {
        success: false,
        message: `New directory is not accessible: ${access.error || 'Permission denied'}`
      }
    }
    
    // Create subdirectories
    await fs.mkdir(path.join(newDir, 'imports'), { recursive: true })
    await fs.mkdir(path.join(newDir, 'backups'), { recursive: true })
    
    // Create backup first
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = path.join(oldDir, 'backups', `pre-move-${timestamp}`)
    await fs.mkdir(backupPath, { recursive: true })
    
    // Files to move
    const filesToMove = [
      'insurance-launcher.db',
      'insurance-launcher.db-shm',
      'insurance-launcher.db-wal'
    ]
    
    // Copy database files
    for (const file of filesToMove) {
      const oldPath = path.join(oldDir, file)
      const newPath = path.join(newDir, file)
      const backupFilePath = path.join(backupPath, file)
      
      try {
        await fs.access(oldPath)
        // Backup
        await fs.copyFile(oldPath, backupFilePath)
        // Move
        await fs.copyFile(oldPath, newPath)
        console.log(`[Storage] Moved ${file}`)
      } catch (error) {
        // File might not exist (WAL/SHM files), that's okay
        console.log(`[Storage] Skipped ${file} (not found)`)
      }
    }
    
    // Copy imports directory
    const oldImports = path.join(oldDir, 'imports')
    const newImports = path.join(newDir, 'imports')
    
    try {
      const imports = await fs.readdir(oldImports)
      for (const file of imports) {
        await fs.copyFile(
          path.join(oldImports, file),
          path.join(newImports, file)
        )
      }
      console.log(`[Storage] Copied ${imports.length} import files`)
    } catch (error) {
      console.log('[Storage] No imports to copy')
    }
    
    // Clear cache so next call gets new directory
    clearDataDirCache()
    
    return {
      success: true,
      message: `Data successfully moved to ${newDir}`,
      backupPath
    }
  } catch (error: any) {
    console.error('[Storage] Move failed:', error)
    return {
      success: false,
      message: `Failed to move data: ${error.message}`
    }
  }
}

/**
 * Create a backup of the current database
 */
export async function createBackup(): Promise<{ 
  success: boolean
  path?: string
  error?: string 
}> {
  try {
    const dataDir = await getDataDir()
    const dbPath = path.join(dataDir, 'insurance-launcher.db')
    
    // Check if DB exists
    await fs.access(dbPath)
    
    // Create backup directory
    const backupDir = path.join(dataDir, 'backups')
    await fs.mkdir(backupDir, { recursive: true })
    
    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, -5)
    const backupPath = path.join(backupDir, `insurance-launcher_${timestamp}.db`)
    
    // Copy database
    await fs.copyFile(dbPath, backupPath)
    
    // Also copy WAL and SHM files if they exist
    try {
      await fs.copyFile(dbPath + '-wal', backupPath + '-wal')
    } catch {}
    try {
      await fs.copyFile(dbPath + '-shm', backupPath + '-shm')
    } catch {}
    
    return {
      success: true,
      path: backupPath
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Get list of backups
 */
export async function listBackups(): Promise<Array<{
  name: string
  path: string
  size: number
  created: Date
}>> {
  try {
    const dataDir = await getDataDir()
    const backupDir = path.join(dataDir, 'backups')
    
    const files = await fs.readdir(backupDir)
    const backups = []
    
    for (const file of files) {
      if (file.endsWith('.db') || file.endsWith('.bak')) {
        const filePath = path.join(backupDir, file)
        const stats = await fs.stat(filePath)
        backups.push({
          name: file,
          path: filePath,
          size: stats.size,
          created: stats.birthtime
        })
      }
    }
    
    return backups.sort((a, b) => b.created.getTime() - a.created.getTime())
  } catch {
    return []
  }
}