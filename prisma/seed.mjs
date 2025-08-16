import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'

// Ensure proper database path
const dataDir = process.env.DATA_DIR?.trim() || path.resolve(process.cwd(), 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}
const dbPath = path.join(dataDir, 'insurance-launcher.db')
process.env.DATABASE_URL = `file:${dbPath}`

console.log('[Seed] Using database at:', dbPath)

const prisma = new PrismaClient()

async function main() {
  console.log('Initializing database...')
  
  // Create or update settings (idempotent)
  const settings = await prisma.setting.upsert({
    where: { id: 'singleton' },
    update: {
      dataDir: dataDir
    },
    create: {
      id: 'singleton',
      kixieUrl: 'https://app.kixie.com',
      dataDir: dataDir
    }
  })
  console.log('✓ Settings configured')
  
  // No placeholder data - database starts empty
  console.log('Database initialized successfully!')
  console.log('Import leads via CSV or create them manually to get started.')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })