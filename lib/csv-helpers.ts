// Client-side CSV helper functions

export type CanonicalField = 
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'source'
  | 'stage'
  | 'contactId'
  | 'profileUrl'
  | 'tags'

export const CANONICAL_HEADERS = {
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

// Normalize header string for matching
function normalizeHeaderString(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, ' ')
    .replace(/[^\w\s]/g, '')
}

// Resolve header mapping from raw CSV headers to canonical fields
export function resolveHeaderMap(rawHeaders: string[]): Record<string, CanonicalField | null> {
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