import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'
import { getDataDirSync, ensureDataDirs, ensureDatabase } from './storage-old'

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
  var __DB_LOGGED__: boolean | undefined
  var __DB_INITIALIZED__: boolean | undefined
}

// Check if we're in browser storage mode
const MODE = process.env.STORAGE_MODE;
const isBrowser = typeof window !== 'undefined';

function ensureDbUrl() {
  const dir = getDataDirSync()
  
  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  
  const dbPath = path.join(dir, 'insurance-launcher.db')
  const url = `file:${dbPath}`
  
  // Set DATABASE_URL for Prisma to use
  if (process.env.DATABASE_URL !== url) {
    process.env.DATABASE_URL = url
  }
  
  // Log once per server start
  if (!globalThis.__DB_LOGGED__) {
    console.info('[DB] Using SQLite at', dbPath)
    globalThis.__DB_LOGGED__ = true
  }
  
  return url
}

// Initialize storage on first import
async function initializeStorage() {
  if (!globalThis.__DB_INITIALIZED__) {
    try {
      await ensureDataDirs()
      await ensureDatabase()
      globalThis.__DB_INITIALIZED__ = true
    } catch (error) {
      console.error('[DB] Failed to initialize storage:', error)
    }
  }
}

// Ensure DB URL is set before creating PrismaClient
ensureDbUrl()

// Initialize storage in the background
if (typeof window === 'undefined') {
  initializeStorage().catch(console.error)
}

// Create a conditional prisma instance
let prismaInstance: PrismaClient | any;

if (MODE === 'browser' || (isBrowser && MODE !== 'node')) {
  // Export a stub so accidental server usage is obvious
  prismaInstance = new Proxy({}, {
    get() { throw new Error('DB unavailable in browser storage mode'); }
  }) as any;
} else {
  prismaInstance = global.prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
  
  if (process.env.NODE_ENV !== 'production') {
    global.prisma = prismaInstance
  }
}

export const prisma = prismaInstance