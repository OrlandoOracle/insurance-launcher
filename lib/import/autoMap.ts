/**
 * Auto-mapping for CSV headers to contact fields
 */

import { scoreHeader } from './normalize';

export type FieldMap = {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  ghlId?: string;
  ghlUrl?: string;
};

/**
 * Build field mapping from CSV headers using scoring algorithm
 */
export function buildFieldMap(headers: string[]): FieldMap {
  const map: FieldMap = {};
  
  // Score all headers for each field type
  const nameScores = headers.map(h => ({ header: h, score: scoreHeader(h, 'name') }));
  const emailScores = headers.map(h => ({ header: h, score: scoreHeader(h, 'email') }));
  const phoneScores = headers.map(h => ({ header: h, score: scoreHeader(h, 'phone') }));
  
  // Find best matches (highest score > 0)
  const bestName = nameScores.reduce((best, curr) => 
    curr.score > best.score ? curr : best, { header: '', score: -1 });
  const bestEmail = emailScores.reduce((best, curr) => 
    curr.score > best.score ? curr : best, { header: '', score: -1 });
  const bestPhone = phoneScores.reduce((best, curr) => 
    curr.score > best.score ? curr : best, { header: '', score: -1 });
  
  // Check if we have separate first/last name columns
  const hasFirstName = headers.some(h => 
    h.toLowerCase().includes('first') && h.toLowerCase().includes('name'));
  const hasLastName = headers.some(h => 
    h.toLowerCase().includes('last') && h.toLowerCase().includes('name'));
  
  if (hasFirstName && hasLastName) {
    // Use separate first/last columns if available
    const firstName = headers.find(h => 
      h.toLowerCase().includes('first') && h.toLowerCase().includes('name'));
    const lastName = headers.find(h => 
      h.toLowerCase().includes('last') && h.toLowerCase().includes('name'));
    
    if (firstName) map.firstName = firstName;
    if (lastName) map.lastName = lastName;
  } else if (bestName.score > 0) {
    // Use full name column for splitting
    map.fullName = bestName.header;
  }
  
  // Map email and phone if found
  if (bestEmail.score > 0) {
    map.email = bestEmail.header;
  }
  
  if (bestPhone.score > 0) {
    map.phone = bestPhone.header;
  }
  
  // Map GHL fields if found
  const ghlIdHeader = headers.find(h => {
    const lower = h.toLowerCase();
    return lower.includes('ghl') && (lower.includes('id') || lower.includes('contact'));
  });
  
  const ghlUrlHeader = headers.find(h => {
    const lower = h.toLowerCase();
    return lower.includes('ghl') && (lower.includes('url') || lower.includes('link'));
  });
  
  if (ghlIdHeader) {
    map.ghlId = ghlIdHeader;
  }
  
  if (ghlUrlHeader) {
    map.ghlUrl = ghlUrlHeader;
  }
  
  return map;
}

/**
 * Get human-readable mapping description
 */
export function describeMappings(map: FieldMap): string {
  const parts: string[] = [];
  
  if (map.fullName) {
    parts.push(`${map.fullName} → First/Last`);
  } else if (map.firstName && map.lastName) {
    parts.push(`${map.firstName} → First, ${map.lastName} → Last`);
  }
  
  if (map.email) {
    parts.push(`${map.email} → Email`);
  }
  
  if (map.phone) {
    parts.push(`${map.phone} → Phone`);
  }
  
  if (map.ghlId) {
    parts.push(`${map.ghlId} → GHL ID`);
  }
  
  if (map.ghlUrl) {
    parts.push(`${map.ghlUrl} → GHL URL`);
  }
  
  return parts.length > 0 
    ? `Auto-mapped: ${parts.join(', ')}`
    : 'No fields could be auto-mapped';
}