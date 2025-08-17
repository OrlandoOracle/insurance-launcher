import { LeadStage } from '@prisma/client'
import { parse, isValid, parseISO } from 'date-fns'

// Supported fields for import
export interface SupportedFields {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  source?: string
  stage?: string
  ghlId?: string
  ghlUrl?: string
  tags?: string
  notes?: string
  lastContacted?: string
  createdAt?: string
}

// Field aliases for flexible mapping
export const FIELD_ALIASES: Record<keyof SupportedFields, string[]> = {
  firstName: ['first name', 'first', 'firstname', 'given_name', 'given name', 'fname', 'first_name'],
  lastName: ['last name', 'last', 'lastname', 'family_name', 'family name', 'surname', 'lname', 'last_name'],
  email: ['email', 'e-mail', 'mail', 'email address', 'email_address', 'emailaddress'],
  phone: ['phone', 'phone number', 'mobile', 'cell', 'telephone', 'phone_number', 'phonenumber', 'mobile number'],
  source: ['source', 'lead source', 'utm_source', 'lead_source', 'how heard', 'howheard', 'origin'],
  stage: ['stage', 'status', 'pipeline stage', 'lead stage', 'lead_stage', 'leadstage'],
  ghlId: ['ghl id', 'contact id', 'go high level id', 'ghlid', 'ghl_id', 'id', 'contact_id', 'contactid'],
  ghlUrl: ['ghl url', 'profile url', 'contact url', 'ghlurl', 'ghl_url', 'link', 'profile_link'],
  tags: ['tags', 'labels', 'tag', 'label', 'categories'],
  notes: ['notes', 'note', 'comments', 'comment', 'description', 'details'],
  lastContacted: ['last contact', 'last contacted', 'last_contacted', 'lastcontacted', 'last contact date'],
  createdAt: ['created', 'created at', 'date created', 'added at', 'created_at', 'createdat', 'date added'],
}

// Normalize header for matching
export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, ' ') // normalize separators to space
    .replace(/[^\w\s]/g, '') // remove special chars except space
    .trim()
}

// Guess field mapping from headers
export function guessMapping(headers: string[]): Record<string, keyof SupportedFields | 'ignore'> {
  const mapping: Record<string, keyof SupportedFields | 'ignore'> = {}
  
  for (const header of headers) {
    const normalized = normalizeHeader(header)
    let found = false
    
    // Check each field's aliases
    for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [keyof SupportedFields, string[]][]) {
      // Check if normalized header matches field name or any alias
      if (normalized === field.toLowerCase() || 
          aliases.some(alias => normalizeHeader(alias) === normalized)) {
        mapping[header] = field
        found = true
        break
      }
    }
    
    if (!found) {
      mapping[header] = 'ignore'
    }
  }
  
  return mapping
}

// Normalize phone number
export function normalizePhone(phone?: string | null): string | null {
  if (!phone) return null
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')
  
  // Handle US numbers
  if (digits.length === 10) {
    // Format as (XXX) XXX-XXXX
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  
  if (digits.length === 11 && digits.startsWith('1')) {
    // US number with country code - strip 1 and format
    const usDigits = digits.slice(1)
    return `(${usDigits.slice(0, 3)}) ${usDigits.slice(3, 6)}-${usDigits.slice(6)}`
  }
  
  // For other lengths, return the digits
  if (digits.length >= 7) {
    return digits
  }
  
  return null
}

// Map stage string to LeadStage enum
export function mapStage(stage?: string | null): LeadStage | null {
  if (!stage) return null
  
  const normalized = stage.toUpperCase().replace(/[\s_-]+/g, '').trim()
  
  const stageMap: Record<string, LeadStage> = {
    'NEW': LeadStage.NEW,
    'NEWLEAD': LeadStage.NEW,
    'LEAD': LeadStage.NEW,
    'WORKING': LeadStage.WORKING,
    'INPROGRESS': LeadStage.WORKING,
    'CONTACTED': LeadStage.WORKING,
    'QUALIFIED': LeadStage.QUALIFIED,
    'QUALIFIED LEAD': LeadStage.QUALIFIED,
    'BOOKED': LeadStage.BOOKED,
    'APPOINTMENT': LeadStage.BOOKED,
    'SCHEDULED': LeadStage.BOOKED,
    'NOSHOW': LeadStage.NO_SHOW,
    'NO SHOW': LeadStage.NO_SHOW,
    'MISSED': LeadStage.NO_SHOW,
    'NURTURE': LeadStage.NURTURE,
    'NURTURING': LeadStage.NURTURE,
    'FOLLOWUP': LeadStage.NURTURE,
    'CLOSED': LeadStage.CLOSED,
    'SOLD': LeadStage.CLOSED,
    'WON': LeadStage.CLOSED,
    'CUSTOMER': LeadStage.CLOSED,
    'CLIENT': LeadStage.CLOSED,
  }
  
  // Try to find a match
  for (const [key, value] of Object.entries(stageMap)) {
    if (normalized === key || normalized.includes(key)) {
      return value
    }
  }
  
  return null
}

// Parse date with multiple formats
export function parseDateLoose(dateStr?: string | null): Date | null {
  if (!dateStr) return null
  
  const cleaned = dateStr.trim()
  if (!cleaned) return null
  
  // Try common date formats
  const formats = [
    'yyyy-MM-dd',
    'MM/dd/yyyy',
    'MM-dd-yyyy',
    'dd/MM/yyyy',
    'dd-MM-yyyy',
    'yyyy/MM/dd',
    'MMM dd, yyyy',
    'MMMM dd, yyyy',
    'dd MMM yyyy',
    'dd MMMM yyyy',
    'yyyy-MM-dd HH:mm:ss',
    'MM/dd/yyyy HH:mm:ss',
    'yyyy-MM-dd\'T\'HH:mm:ss',
    'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'',
  ]
  
  // Try each format
  for (const format of formats) {
    try {
      const parsed = parse(cleaned, format, new Date())
      if (isValid(parsed)) {
        return parsed
      }
    } catch {
      // Continue to next format
    }
  }
  
  // Try ISO parse
  try {
    const parsed = parseISO(cleaned)
    if (isValid(parsed)) {
      return parsed
    }
  } catch {
    // Continue
  }
  
  // Try native Date constructor as last resort
  try {
    const parsed = new Date(cleaned)
    if (isValid(parsed) && !isNaN(parsed.getTime())) {
      return parsed
    }
  } catch {
    // Failed to parse
  }
  
  return null
}

// Split tags string into array
export function splitTags(tags?: string | null): string[] {
  if (!tags) return []
  
  // Split by comma or semicolon, trim each tag
  return tags
    .split(/[,;]/)
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)
}

// Merge two tag arrays, removing duplicates
export function mergeTags(existing: string[], incoming: string[]): string[] {
  const tagSet = new Set([...existing, ...incoming])
  return Array.from(tagSet).sort()
}

// Clean and normalize email
export function normalizeEmail(email?: string | null): string | null {
  if (!email) return null
  
  const cleaned = email.trim().toLowerCase()
  
  // Basic email validation
  if (cleaned.includes('@') && cleaned.includes('.')) {
    return cleaned
  }
  
  return null
}

// Detect CSV delimiter by sampling first few lines
export function detectDelimiter(sample: string): string {
  const lines = sample.split('\n').slice(0, 5).filter(line => line.trim())
  if (lines.length === 0) return ','
  
  const delimiters = [',', ';', '\t', '|']
  const counts: Record<string, number> = {}
  
  for (const delimiter of delimiters) {
    counts[delimiter] = 0
    for (const line of lines) {
      // Count occurrences, but ignore those within quotes
      let inQuotes = false
      let count = 0
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') inQuotes = !inQuotes
        if (!inQuotes && line[i] === delimiter) count++
      }
      counts[delimiter] += count
    }
  }
  
  // Return delimiter with highest count
  let maxCount = 0
  let bestDelimiter = ','
  for (const [delimiter, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count
      bestDelimiter = delimiter
    }
  }
  
  return bestDelimiter
}

// Pre-process CSV content to handle common issues
export function preprocessCSV(content: string): string {
  // Remove BOM if present
  let processed = content.replace(/^\uFEFF/, '')
  
  // Normalize line endings to \n
  processed = processed.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  
  // Replace smart quotes with regular quotes
  processed = processed
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
  
  // Remove trailing commas from lines (common Excel export issue)
  processed = processed
    .split('\n')
    .map(line => line.replace(/,+$/, ''))
    .join('\n')
  
  return processed
}