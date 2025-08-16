'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function getSettings() {
  try {
    let settings = await prisma.setting.findUnique({
      where: { id: 'singleton' }
    })
    
    if (!settings) {
      settings = await prisma.setting.create({
        data: {
          id: 'singleton',
          dataDir: process.env.DATA_DIR || './data',
          ghlOppsUrl: process.env.GHL_OPPS_URL || null,
          chromeProfileDir: process.env.CHROME_PROFILE_DIR || null
        }
      })
    }
    
    return settings
  } catch (error: any) {
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.warn('[Settings] Table missing, returning defaults. Run: npm run db:ensure')
      return {
        id: 'singleton',
        kixieUrl: 'https://app.kixie.com',
        icsCalendarUrl: null,
        dataDir: process.env.DATA_DIR || './data',
        ghlOppsUrl: process.env.GHL_OPPS_URL || null,
        chromeProfileDir: process.env.CHROME_PROFILE_DIR || null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }
    console.error('[Settings] Error fetching settings:', error)
    throw error
  }
}

export async function updateSettings(data: Partial<{
  kixieUrl: string
  icsCalendarUrl: string | null
  dataDir: string
  ghlOppsUrl: string | null
  chromeProfileDir: string | null
}>) {
  const settings = await prisma.setting.update({
    where: { id: 'singleton' },
    data
  })
  
  revalidatePath('/settings')
  return settings
}