import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
  var __DB_LOGGED__: boolean | undefined
}

function ensureDbUrl() {
  const dir = process.env.DATA_DIR?.trim() || path.resolve(process.cwd(), 'data')
  
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

// Ensure DB URL is set before creating PrismaClient
ensureDbUrl()

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}