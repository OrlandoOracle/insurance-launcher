import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import path from 'path'
import fs from 'fs'

export async function GET() {
  const dataDir = process.env.DATA_DIR?.trim() || path.resolve(process.cwd(), 'data')
  const dbPath = path.join(dataDir, 'insurance-launcher.db')
  const databaseUrl = process.env.DATABASE_URL || `file:${dbPath}`
  
  let tables: string[] = []
  let dbExists = false
  let dbSize = 0
  let error: string | null = null
  let counts: Record<string, number> = {}
  
  try {
    // Check if database file exists
    dbExists = fs.existsSync(dbPath)
    
    if (dbExists) {
      const stats = fs.statSync(dbPath)
      dbSize = stats.size
      
      // Get list of tables
      const result = await prisma.$queryRaw<Array<{ name: string }>>`
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        AND name NOT LIKE 'sqlite_%' 
        AND name NOT LIKE '_prisma_%'
        ORDER BY name
      `
      
      tables = result.map(r => r.name)
      
      // Get counts for each table
      for (const table of tables) {
        try {
          const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
            `SELECT COUNT(*) as count FROM ${table}`
          )
          // Convert BigInt to number for JSON serialization
          counts[table] = Number(countResult[0]?.count || 0)
        } catch (e) {
          counts[table] = -1
        }
      }
    }
  } catch (e: any) {
    error = e.message || 'Unknown error'
    console.error('[Health] Error checking database:', e)
  }
  
  // Check for Lead/Contact table schema
  let leadsSchemaOk = false
  try {
    if (tables.includes('Contact')) {
      // Check if new Lead fields exist
      const columns = await prisma.$queryRaw<Array<{ name: string }>>`
        SELECT name FROM pragma_table_info('Contact')
      `
      const columnNames = columns.map(c => c.name)
      leadsSchemaOk = columnNames.includes('stage') && 
                      columnNames.includes('lastContacted') &&
                      columnNames.includes('archivedAt') &&
                      columnNames.includes('noShowAt')
    }
  } catch (e) {
    console.error('[Health] Error checking Lead schema:', e)
  }

  const health = {
    ok: dbExists && tables.length > 0 && !error,
    database: {
      url: databaseUrl,
      path: dbPath,
      exists: dbExists,
      size: dbSize,
      sizeFormatted: dbSize > 0 ? `${(dbSize / 1024).toFixed(2)} KB` : '0 KB'
    },
    tables: {
      count: tables.length,
      list: tables,
      records: counts
    },
    schema: {
      leadsSchemaOk
    },
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      DATA_DIR: process.env.DATA_DIR || '(not set, using ./data)',
      resolvedDataDir: dataDir
    },
    timestamp: new Date().toISOString(),
    error: error
  }
  
  return NextResponse.json(health, {
    status: health.ok ? 200 : 503,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  })
}