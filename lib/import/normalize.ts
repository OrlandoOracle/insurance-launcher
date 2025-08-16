/**
 * CSV Import Normalization Utilities
 */

/**
 * Collapse multiple spaces to single space and trim
 */
export function collapseSpaces(s = ''): string {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

/**
 * Strip common name suffixes (Jr, Sr, II, III, IV, V)
 */
export function stripSuffix(token = ''): string {
  const t = token.replace(/[.,]$/, '').toLowerCase();
  const suffixes = ['jr', 'sr', 'ii', 'iii', 'iv', 'v'];
  return suffixes.includes(t) ? '' : token;
}

/**
 * Split full name into first and last, handling suffixes
 */
export function splitName(full = ''): { first: string; last: string } {
  const cleaned = collapseSpaces(full);
  if (!cleaned) return { first: '', last: '' };
  
  const parts = cleaned.split(' ');
  if (parts.length === 1) return { first: parts[0], last: '' };
  
  // Check if last token is a suffix
  const lastToken = parts[parts.length - 1];
  const lastWithoutSuffix = stripSuffix(lastToken);
  
  if (lastWithoutSuffix === '') {
    // Last token was a suffix, use second-to-last as last name
    if (parts.length === 2) {
      // Only name + suffix, put name as first
      return { first: parts[0], last: '' };
    }
    const actualLast = parts[parts.length - 2];
    const firstParts = parts.slice(0, parts.length - 2);
    return { first: firstParts.join(' '), last: actualLast };
  } else {
    // No suffix or suffix not recognized, standard split
    const firstParts = parts.slice(0, parts.length - 1);
    return { first: firstParts.join(' '), last: lastToken };
  }
}

/**
 * Extract digits only from a string
 */
export function digitsOnly(s = ''): string {
  return String(s || '').replace(/\D/g, '');
}

/**
 * Format 10-digit phone as (XXX) XXX-XXXX
 */
export function formatPhone10(digits: string): string {
  if (digits.length !== 10) return '';
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Check if header looks like an agent field
 */
export function looksLikeAgentHeader(h = ''): boolean {
  return /\b(wrt|agt|agent|writing)\b/i.test(h);
}

/**
 * Score a header for how likely it matches the desired field type
 */
export function scoreHeader(h: string, want: 'name' | 'email' | 'phone'): number {
  const header = h.toLowerCase();
  let score = 0;
  
  // Penalty for agent fields
  if (looksLikeAgentHeader(h)) {
    return -100;
  }
  
  // Boost for insured/owner fields
  if (header.includes('insured') || header.includes('owner')) {
    score += 50;
  }
  
  switch (want) {
    case 'name':
      if (header === 'insured_nme') return 200; // Exact match
      if (header === 'owner_nme') return 150;
      if (header === 'name') return 100;
      if (header.includes('name') || header.includes('nme')) score += 75;
      if (header.includes('first') || header.includes('last')) score += 25;
      break;
      
    case 'email':
      if (header === 'insured_email_address') return 200; // Exact match
      if (header === 'insured_email') return 150;
      if (header === 'email') return 100;
      if (header.includes('email')) score += 75;
      if (header.includes('mail')) score += 50;
      if (header.includes('address') && header.includes('email')) score += 25;
      break;
      
    case 'phone':
      if (header === 'insured_party_phone') return 200; // Exact match
      if (header === 'insured_phone') return 150;
      if (header === 'phone') return 100;
      if (header.includes('phone')) score += 75;
      if (header.includes('mobile') || header.includes('cell')) score += 50;
      if (header.includes('tel')) score += 25;
      break;
  }
  
  return score;
}