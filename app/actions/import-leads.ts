'use server'

import { prisma } from '@/lib/db'
import { LeadStage } from '@prisma/client'
import Papa from 'papaparse'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { revalidatePath } from 'next/cache'
import type { ImportResult } from '@/types/import'

// Canonical header names
const CANONICAL_HEADERS = {
  'First Name': 'firstName',
  'Last Name': 'lastName',
  'Email': 'email',
  'Phone': 'phone',
  'Source': 'source',
  'Stage': 'stage',
  'Contact ID': 'contactId',
  'Profile URL': 'profileUrl',
  'Tags': 'tags'
} as const

type CanonicalHeader = keyof typeof CANONICAL_HEADERS
type CanonicalField = typeof CANONICAL_HEADERS[CanonicalHeader]

// Header aliases mapping
const HEADER_ALIASES: Record<CanonicalField, string[]> = {
  firstName: ['first', 'first_name', 'given', 'fname', 'given_name', 'firstname'],
  lastName: ['last', 'last_name', 'surname', 'lname', 'family_name', 'lastname'],
  email: ['email', 'e-mail', 'mail', 'email_address', 'emailaddress'],
  phone: ['phone', 'mobile', 'cell', 'phone_number', 'tel', 'telephone', 'phonenumber'],
  source: ['source', 'how_heard', 'channel', 'lead_source', 'utm_source', 'origin'],
  stage: ['stage', 'status', 'pipeline_stage', 'lead_stage', 'pipeline'],
  contactId: ['ghl_id', 'contact_id', 'id', 'ghlid', 'contactid'],
  profileUrl: ['ghl_url', 'profile', 'url', 'profile_url', 'ghlurl', 'link'],
  tags: ['tags', 'labels', 'categories', 'tag', 'label']
}

// Stage mapping
const STAGE_MAP: Record<string, LeadStage> = {
  'new': LeadStage.NEW,
  'working': LeadStage.WORKING,
  'in progress': LeadStage.WORKING,
  'inprogress': LeadStage.WORKING,
  'qualified': LeadStage.QUALIFIED,
  'booked': LeadStage.BOOKED,
  'appt set': LeadStage.BOOKED,
  'appointment': LeadStage.BOOKED,
  'appointment set': LeadStage.BOOKED,
  'no show': LeadStage.NO_SHOW,
  'noshow': LeadStage.NO_SHOW,
  'nurture': LeadStage.NURTURE,
  'follow up later': LeadStage.NURTURE,
  'followup': LeadStage.NURTURE,
  'closed': LeadStage.CLOSED,
  'won': LeadStage.CLOSED,
  'lost': LeadStage.CLOSED,
  'customer': LeadStage.CLOSED
}


// Normalize header string for matching
function normalizeHeaderString(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, ' ')
    .replace(/[^\w\s]/g, '')
}

// Resolve header mapping from raw CSV headers to canonical fields
function resolveHeaderMap(rawHeaders: string[]): Record<string, CanonicalField | null> {
  const headerMap: Record<string, CanonicalField | null> = {}
  
  for (const rawHeader of rawHeaders) {
    const normalized = normalizeHeaderString(rawHeader)
    let mapped: CanonicalField | null = null
    
    // Check for exact canonical match first
    for (const [canonical, field] of Object.entries(CANONICAL_HEADERS)) {
      if (normalizeHeaderString(canonical) === normalized) {
        mapped = field as CanonicalField
        break
      }
    }
    
    // If not found, check aliases
    if (!mapped) {
      for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [CanonicalField, string[]][]) {
        if (aliases.some(alias => normalizeHeaderString(alias) === normalized)) {
          mapped = field
          break
        }
      }
    }
    
    headerMap[rawHeader] = mapped
  }
  
  return headerMap
}

// Validate email with simple regex
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Normalize phone number
function normalizePhone(phone: string): string {
  // Keep digits only
  const digits = phone.replace(/\D/g, '')
  
  // Drop leading 1 if length is 11
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.substring(1)
  }
  
  // Accept 10 digits
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  
  // Otherwise return empty
  return ''
}

// Map stage string to enum
function mapStage(stage: string): LeadStage {
  if (!stage) return LeadStage.NEW
  
  const normalized = stage.toLowerCase().trim()
  return STAGE_MAP[normalized] || LeadStage.NEW
}

// Split and normalize tags
function normalizeTags(tags: string): string {
  if (!tags) return ''
  
  const tagArray = tags
    .split(/[,;]/)
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)
  
  // De-duplicate
  const uniqueTags = Array.from(new Set(tagArray))
  
  // Join with semicolon
  return uniqueTags.join(';')
}

// Merge tags from existing and new
function mergeTags(existing: string, incoming: string): string {
  const existingTags = existing ? existing.split(';') : []
  const incomingTags = incoming ? incoming.split(';') : []
  
  const allTags = [...existingTags, ...incomingTags]
  const uniqueTags = Array.from(new Set(allTags)).filter(t => t.length > 0)
  
  return uniqueTags.join(';')
}

// Normalize a single row (not a server action, just a utility)
function normalizeRow(row: Record<string, any>, headerMap: Record<string, CanonicalField | null>): Record<string, any> {
  const normalized: Record<string, any> = {}
  
  // Map fields using header map
  for (const [rawHeader, value] of Object.entries(row)) {
    const field = headerMap[rawHeader]
    if (field && value !== undefined && value !== null) {
      normalized[field] = String(value).trim()
    }
  }
  
  // Handle name splitting if needed
  if (!normalized.firstName && !normalized.lastName && normalized.name) {
    const parts = normalized.name.trim().split(/\s+/)
    if (parts.length === 1) {
      normalized.firstName = parts[0]
      normalized.lastName = ''
    } else {
      normalized.firstName = parts.slice(0, -1).join(' ')
      normalized.lastName = parts[parts.length - 1]
    }
  }
  
  // Apply normalization rules
  if (normalized.email) {
    normalized.email = normalized.email.toLowerCase()
    if (!isValidEmail(normalized.email)) {
      normalized.email = ''
    }
  }
  
  if (normalized.phone) {
    normalized.phone = normalizePhone(normalized.phone)
  }
  
  if (normalized.stage) {
    normalized.stage = mapStage(normalized.stage)
  } else {
    normalized.stage = LeadStage.NEW
  }
  
  if (normalized.tags) {
    normalized.tags = normalizeTags(normalized.tags)
  }
  
  // Ensure Contact ID is string
  if (normalized.contactId && typeof normalized.contactId === 'number') {
    normalized.contactId = String(normalized.contactId)
  }
  
  return normalized
}

// Main import function
export async function importLeads(csvContent: string, filename: string): Promise<ImportResult> {
  const errors: Array<{ reason: string; row: any }> = []
  let processed = 0
  let inserted = 0
  let updated = 0
  let skipped = 0
  
  try {
    // Ensure imports directory exists
    const importsDir = path.join(process.cwd(), 'data', 'imports')
    await mkdir(importsDir, { recursive: true })
    
    // Parse CSV with robust settings
    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false,
      delimiter: undefined, // Auto-detect
      transformHeader: (header) => header.trim()
    })
    
    if (parseResult.errors.length > 0) {
      // Log warnings but don't fail
      console.warn('[Import] Parse warnings:', parseResult.errors)
    }
    
    const rows = parseResult.data as Record<string, any>[]
    if (rows.length === 0) {
      return {
        success: false,
        processed: 0,
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: [{ reason: 'No data found in CSV', row: null }]
      }
    }
    
    // Get headers and resolve mapping
    const headers = Object.keys(rows[0])
    const headerMap = resolveHeaderMap(headers)
    
    console.log('[Import] Header mapping:', headerMap)
    
    // Process rows in chunks to avoid lock timeouts
    const CHUNK_SIZE = 500
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, Math.min(i + CHUNK_SIZE, rows.length))
      
      // Process chunk in transaction
      await prisma.$transaction(async (tx) => {
        for (const row of chunk) {
          processed++
          
          try {
            // Skip completely empty rows
            const hasData = Object.values(row).some(v => v && String(v).trim())
            if (!hasData) {
              continue
            }
            
            // Normalize row
            const normalized = normalizeRow(row, headerMap)
            
            // Check if row has minimum required data (firstName or lastName)
            if (!normalized.firstName && !normalized.lastName) {
              errors.push({
                reason: 'Missing both first and last name',
                row
              })
              skipped++
              continue
            }
            
            // Prepare data for database
            const leadData: any = {
              firstName: normalized.firstName || '',
              lastName: normalized.lastName || '',
              email: normalized.email || null,
              phone: normalized.phone || null,
              source: normalized.source || null,
              stage: normalized.stage || LeadStage.NEW,
              ghlId: normalized.contactId || null,
              ghlUrl: normalized.profileUrl || null,
              tags: normalized.tags || '[]'
            }
            
            // Convert tags to JSON array format for our schema
            if (leadData.tags && leadData.tags !== '[]') {
              const tagArray = leadData.tags.split(';').filter((t: string) => t.length > 0)
              leadData.tags = JSON.stringify(tagArray)
            }
            
            // Dedupe and upsert logic
            let existingLead = null
            
            // Priority 1: Contact ID (using ghlId field in schema)
            if (normalized.contactId) {
              existingLead = await tx.lead.findUnique({
                where: { ghlId: normalized.contactId }
              })
            }
            
            // Priority 2: Email
            if (!existingLead && normalized.email) {
              existingLead = await tx.lead.findUnique({
                where: { email: normalized.email }
              })
            }
            
            // Priority 3: Phone
            if (!existingLead && normalized.phone) {
              existingLead = await tx.lead.findFirst({
                where: { phone: normalized.phone }
              })
            }
            
            if (existingLead) {
              // Update existing lead
              const existingTags = JSON.parse(existingLead.tags || '[]') as string[]
              const incomingTags = JSON.parse(leadData.tags || '[]') as string[]
              const mergedTags = Array.from(new Set([...existingTags, ...incomingTags]))
              
              await tx.lead.update({
                where: { id: existingLead.id },
                data: {
                  // Only update non-empty fields
                  firstName: leadData.firstName || existingLead.firstName,
                  lastName: leadData.lastName || existingLead.lastName,
                  email: leadData.email || existingLead.email,
                  phone: leadData.phone || existingLead.phone,
                  source: leadData.source || existingLead.source,
                  stage: leadData.stage || existingLead.stage,
                  ghlId: leadData.ghlId || existingLead.ghlId,
                  ghlUrl: leadData.ghlUrl || existingLead.ghlUrl,
                  tags: JSON.stringify(mergedTags)
                }
              })
              updated++
            } else {
              // Insert new lead
              await tx.lead.create({
                data: leadData
              })
              inserted++
            }
          } catch (error: any) {
            console.error(`[Import] Error processing row:`, error)
            errors.push({
              reason: error.message || 'Database error',
              row
            })
            skipped++
          }
        }
      })
    }
    
    // Save error report if there are errors
    let errorReportPath: string | undefined
    if (errors.length > 0) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const errorFilename = `import-errors-${timestamp}.csv`
      errorReportPath = path.join(importsDir, errorFilename)
      
      // Create error CSV
      const errorCsv = Papa.unparse([
        ['Reason', 'Original Row JSON'],
        ...errors.map(e => [e.reason, JSON.stringify(e.row)])
      ])
      
      await writeFile(errorReportPath, errorCsv)
      console.log(`[Import] Error report saved to: ${errorReportPath}`)
    }
    
    // Save original file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const savedFilename = `import-${timestamp}-${filename}`
    const savedPath = path.join(importsDir, savedFilename)
    await writeFile(savedPath, csvContent)
    console.log(`[Import] Original file saved to: ${savedPath}`)
    
    // Revalidate the leads page
    revalidatePath('/leads')
    
    return {
      success: true,
      processed,
      inserted,
      updated,
      skipped,
      errorReportPath: errorReportPath ? `/data/imports/${path.basename(errorReportPath)}` : undefined
    }
  } catch (error: any) {
    console.error('[Import] Fatal error:', error)
    return {
      success: false,
      processed,
      inserted,
      updated,
      skipped,
      errors: [{ reason: error.message || 'Import failed', row: null }]
    }
  }
}