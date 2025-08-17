import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import { parseISO, isValid } from 'date-fns';
import type { Lead } from './schema';
import { indexService } from './index';
import { StageEnum } from './schema';

export interface CSVRow {
  [key: string]: string | number | null | undefined;
}

export interface MappingField {
  csvColumn: string;
  leadField: keyof Lead | 'ignore';
  transform?: (value: string) => unknown;
}

export const DEFAULT_MAPPING: Record<string, keyof Lead | 'meta' | 'ignore'> = {
  'First Name': 'firstName',
  'Last Name': 'lastName',
  'Phone': 'phones',
  'Email': 'emails',
  'Created': 'createdAt',
  'Tags': 'tags',
  'Additional Phones': 'phones',
  'Additional Emails': 'emails',
  'Business Name': 'meta',
  'Company Name': 'meta',
  'Last Activity': 'meta',
  'Opportunity': 'meta',
  'Contact Id': 'meta'
};

export function parseCSV(content: string): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<CSVRow>(content, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data);
      },
      error: reject
    });
  });
}

export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
}

export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  return phone; // Return original if we can't normalize
}

export function splitMultiValue(value: string): string[] {
  return value
    .split(/[,;|\n]+/)
    .map(v => v.trim())
    .filter(Boolean);
}

export function mapCSVToLead(
  row: CSVRow,
  mapping: Record<string, keyof Lead | 'meta' | 'ignore'>
): Partial<Lead> {
  const lead: Partial<Lead> = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    phones: [],
    emails: [],
    tags: [],
    meta: {}
  };

  for (const [csvColumn, leadField] of Object.entries(mapping)) {
    const value = row[csvColumn];
    if (!value || leadField === 'ignore') continue;

    if (leadField === 'meta') {
      // Store in meta
      const metaKey = csvColumn.toLowerCase().replace(/\s+/g, '_');
      lead.meta![metaKey] = value;
    } else if (leadField === 'phones') {
      const phones = splitMultiValue(value);
      lead.phones!.push(...phones);
    } else if (leadField === 'emails') {
      const emails = splitMultiValue(value);
      lead.emails!.push(...emails);
    } else if (leadField === 'tags') {
      const tags = splitMultiValue(value);
      lead.tags!.push(...tags);
    } else if (leadField === 'createdAt' || leadField === 'updatedAt') {
      const date = parseISO(value);
      if (isValid(date)) {
        lead[leadField] = date.toISOString();
      }
    } else {
      // Direct assignment for other fields
      (lead as Record<string, unknown>)[leadField] = value;
    }
  }

  // Remove duplicates
  lead.phones = [...new Set(lead.phones)];
  lead.emails = [...new Set(lead.emails)];
  lead.tags = [...new Set(lead.tags)];

  // Set default stage if not mapped
  if (!lead.stage) {
    lead.stage = 'Data Lead';
  }

  return lead;
}

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

export function validateLead(lead: Partial<Lead>): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Required fields
  if (!lead.firstName) errors.push('First name is required');
  if (!lead.lastName) errors.push('Last name is required');

  // Validate emails
  if (lead.emails) {
    lead.emails.forEach((email, i) => {
      if (!validateEmail(email)) {
        warnings.push(`Email ${i + 1} "${email}" is invalid`);
      }
    });
  }

  // Validate phones
  if (lead.phones) {
    lead.phones.forEach((phone, i) => {
      if (!validatePhone(phone)) {
        warnings.push(`Phone ${i + 1} "${phone}" may be invalid`);
      }
    });
  }

  // Validate stage
  if (lead.stage) {
    try {
      StageEnum.parse(lead.stage);
    } catch (e: unknown) {
      warnings.push(`Stage "${lead.stage}" is not recognized`);
    }
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors
  };
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matches: string[]; // Lead IDs
  reason?: string;
}

export function checkDuplicate(lead: Partial<Lead>): DuplicateCheckResult {
  const matches: string[] = [];
  const reasons: string[] = [];

  // Check by email
  if (lead.emails && lead.emails.length > 0) {
    for (const email of lead.emails) {
      const emailMatches = indexService.findByEmail(email);
      if (emailMatches.length > 0) {
        matches.push(...emailMatches.map(m => m.id));
        reasons.push(`Email ${email} already exists`);
      }
    }
  }

  // Check by phone
  if (lead.phones && lead.phones.length > 0) {
    for (const phone of lead.phones) {
      const phoneMatches = indexService.findByPhone(phone);
      if (phoneMatches.length > 0) {
        matches.push(...phoneMatches.map(m => m.id));
        reasons.push(`Phone ${phone} already exists`);
      }
    }
  }

  // If no email/phone match, check by name + date proximity
  if (matches.length === 0 && lead.firstName && lead.lastName) {
    const nameMatches = indexService.findByName(lead.firstName, lead.lastName);
    
    if (nameMatches.length > 0 && lead.createdAt) {
      const leadDate = new Date(lead.createdAt);
      const fourteenDays = 14 * 24 * 60 * 60 * 1000;
      
      for (const match of nameMatches) {
        const matchDate = new Date(match.updatedAt);
        if (Math.abs(leadDate.getTime() - matchDate.getTime()) <= fourteenDays) {
          matches.push(match.id);
          reasons.push('Name match within 14 days');
        }
      }
    }
  }

  const uniqueMatches = [...new Set(matches)];
  
  return {
    isDuplicate: uniqueMatches.length > 0,
    matches: uniqueMatches,
    reason: reasons.join('; ')
  };
}