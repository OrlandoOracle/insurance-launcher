'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import fs from 'fs/promises'
import path from 'path'
import { LeadStage } from '@prisma/client'
import { isBrowserAdapter, save, getDataDir } from '@/lib/storage'

type ParsedRow = Record<string, string>

type ImportResult = {
  created: number
  updated: number
  skipped: number
  reportCsv?: string
}

// Normalize and clean string values
function norm(s?: string | null): string | undefined {
  return (s ?? '').trim() || undefined
}

// Convert header to lowercase, remove spaces for matching
function h(s: string): string {
  return s.toLowerCase().replace(/[\s_-]+/g, '')
}

// Map CSV row to our data structure
function mapRow(row: ParsedRow) {
  const keys = Object.fromEntries(
    Object.keys(row).map(k => [h(k), k])
  )
  
  const get = (...names: string[]) => {
    const key = names.map(h).find(n => keys[n])
    return key ? norm(row[keys[key]]) : undefined
  }
  
  const firstName = get('First Name', 'first_name', 'firstname', 'fname')
  const lastName = get('Last Name', 'last_name', 'lastname', 'lname')
  const email = get('Email', 'email', 'email_address', 'emailaddress')
  const phone = get('Phone', 'phone', 'phone_number', 'phonenumber', 'mobile', 'cell')
  const source = get('Source', 'source', 'lead_source', 'leadsource', 'how_heard', 'howheard')
  const stage = get('Stage', 'stage', 'lead_stage', 'leadstage', 'status')
  const ghlId = get('Contact ID', 'GHL ID', 'ghl_id', 'ghlid', 'id', 'contact_id', 'contactid')
  let ghlUrl = get('Profile URL', 'GHL URL', 'ghl_url', 'ghlurl', 'link', 'profile_link', 'profilelink')
  
  // Auto-generate GHL URL if we have ID but no URL
  if (!ghlUrl && ghlId) {
    ghlUrl = `https://app.gohighlevel.com/contacts/${ghlId}`
  }
  
  return { firstName, lastName, email, phone, source, stage, ghlId, ghlUrl }
}

// Normalize phone number to E.164 or US 10-digit format
function normalizePhone(phone?: string): string | undefined {
  if (!phone) return undefined
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')
  
  // Handle US numbers
  if (digits.length === 10) {
    // US number without country code - format as (XXX) XXX-XXXX
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  
  if (digits.length === 11 && digits.startsWith('1')) {
    // US number with country code - strip 1 and format
    const usDigits = digits.slice(1)
    return `(${usDigits.slice(0, 3)}) ${usDigits.slice(3, 6)}-${usDigits.slice(6)}`
  }
  
  // Return cleaned digits for other formats
  return digits || undefined
}

// Map stage string to LeadStage enum
function mapStage(stage?: string): LeadStage | undefined {
  if (!stage) return undefined
  
  const normalized = stage.toUpperCase().replace(/[\s-_]+/g, '')
  
  const stageMap: Record<string, LeadStage> = {
    'NEW': LeadStage.NEW,
    'NEWLEAD': LeadStage.NEW,
    'WORKING': LeadStage.WORKING,
    'QUALIFIED': LeadStage.QUALIFIED,
    'BOOKED': LeadStage.BOOKED,
    'NOSHOW': LeadStage.NO_SHOW,
    'NURTURE': LeadStage.NURTURE,
    'CLOSED': LeadStage.CLOSED,
    'SOLD': LeadStage.CLOSED,
    'WON': LeadStage.CLOSED,
  }
  
  return stageMap[normalized]
}

export async function importLeads({ 
  rows, 
  filename 
}: { 
  rows: ParsedRow[]
  filename: string 
}): Promise<ImportResult> {
  // Check if in browser mode
  if (isBrowserAdapter) {
    throw new Error('Lead import is not available in browser storage mode')
  }
  
  // Ensure imports directory exists
  const baseDataDir = await getDataDir()
  const dataDir = path.join(baseDataDir, 'imports')
  await fs.mkdir(dataDir, { recursive: true })
  
  // Save original CSV with timestamp
  const timestamp = new Date().toISOString()
    .replace(/:/g, '-')
    .replace(/\./g, '-')
    .replace('T', '_')
    .slice(0, -5) // Remove milliseconds and Z
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  const destPath = path.join(dataDir, `import-${timestamp}-${sanitizedFilename}`)
  
  // Write the CSV content (as JSON for easier debugging)
  try {
    await fs.writeFile(destPath, JSON.stringify(rows, null, 2))
    console.log(`[Import] Saved import file to: ${destPath}`)
  } catch (err) {
    console.error('[Import] Failed to save file:', err)
  }
  
  let created = 0
  let updated = 0
  let skipped = 0
  const skippedRows: string[] = ['reason,firstName,lastName,email,phone,details']
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    
    // Skip completely empty rows
    const hasAnyData = Object.values(row).some(v => v && v.trim())
    if (!hasAnyData) {
      continue
    }
    
    try {
      const mapped = mapRow(row)
      
      // Prepare data object
      const data: any = {
        firstName: mapped.firstName || '',
        lastName: mapped.lastName || '',
        email: mapped.email?.toLowerCase(),
        phone: normalizePhone(mapped.phone),
        source: mapped.source,
        ghlId: mapped.ghlId,
        ghlUrl: mapped.ghlUrl,
      }
      
      // Map stage if provided
      if (mapped.stage) {
        const mappedStage = mapStage(mapped.stage)
        if (mappedStage) {
          data.stage = mappedStage
        }
      }
      
      // Apply deduplication rules in order
      
      // 1. If ghlId present → upsert by ghlId
      if (mapped.ghlId) {
        const existing = await prisma.lead.findUnique({
          where: { ghlId: mapped.ghlId }
        })
        
        if (existing) {
          await prisma.lead.update({
            where: { ghlId: mapped.ghlId },
            data
          })
          updated++
        } else {
          await prisma.lead.create({ data })
          created++
        }
      }
      // 2. Else if email present → upsert by email
      else if (data.email) {
        const existing = await prisma.lead.findUnique({
          where: { email: data.email }
        })
        
        if (existing) {
          // Update existing record
          await prisma.lead.update({
            where: { id: existing.id },
            data: {
              firstName: data.firstName || existing.firstName,
              lastName: data.lastName || existing.lastName,
              phone: data.phone || existing.phone,
              source: data.source || existing.source,
              ghlUrl: data.ghlUrl || existing.ghlUrl,
              stage: data.stage || existing.stage,
            }
          })
          updated++
        } else {
          await prisma.lead.create({ data })
          created++
        }
      }
      // 3. Else if phone present → findFirst by phone
      else if (data.phone) {
        const existing = await prisma.lead.findFirst({
          where: { phone: data.phone }
        })
        
        if (existing) {
          await prisma.lead.update({
            where: { id: existing.id },
            data: {
              firstName: data.firstName || existing.firstName,
              lastName: data.lastName || existing.lastName,
              email: data.email || existing.email,
              source: data.source || existing.source,
              ghlUrl: data.ghlUrl || existing.ghlUrl,
              stage: data.stage || existing.stage,
            }
          })
          updated++
        } else {
          await prisma.lead.create({ data })
          created++
        }
      }
      // 4. Else → skip with reason
      else {
        skipped++
        skippedRows.push(
          `"No ID/email/phone","${mapped.firstName || ''}","${mapped.lastName || ''}","","","Row ${i + 1}"`
        )
      }
    } catch (err: any) {
      skipped++
      const mapped = mapRow(row)
      skippedRows.push(
        `"${err?.message || 'DB error'}","${mapped.firstName || ''}","${mapped.lastName || ''}","${mapped.email || ''}","${mapped.phone || ''}","Row ${i + 1}"`
      )
      console.error(`[Import] Error on row ${i + 1}:`, err)
    }
  }
  
  // Revalidate the leads page
  revalidatePath('/leads')
  
  console.log(`[Import] Complete - Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`)
  
  return {
    created,
    updated,
    skipped,
    reportCsv: skippedRows.length > 1 ? skippedRows.join('\n') : undefined
  }
}