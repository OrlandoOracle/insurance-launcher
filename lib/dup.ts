import { prisma } from '@/lib/db';
import { Contact } from '@prisma/client';

/**
 * Normalize phone number for comparison
 * Removes all non-digit characters
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Normalize email for comparison
 * Lowercases and trims whitespace
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Find a contact by email or phone
 * Returns the first match found
 */
export async function findByEmailOrPhone(
  email?: string | null,
  phone?: string | null
): Promise<Contact | null> {
  if (!email && !phone) {
    return null;
  }

  const conditions: any[] = [];
  
  if (email) {
    const normalizedEmail = normalizeEmail(email);
    conditions.push({ email: normalizedEmail });
  }
  
  if (phone) {
    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone.length >= 10) {
      // Search for phone with or without country code
      conditions.push({ phone: { contains: normalizedPhone } });
    }
  }

  if (conditions.length === 0) {
    return null;
  }

  try {
    const contact = await prisma.contact.findFirst({
      where: {
        OR: conditions
      }
    });
    
    return contact;
  } catch (error) {
    console.error('[dup] Error finding contact:', error);
    return null;
  }
}

/**
 * Check if a contact exists with the given email or phone
 * Returns true if a duplicate exists
 */
export async function isDuplicate(
  email?: string | null,
  phone?: string | null,
  excludeId?: string
): Promise<boolean> {
  const contact = await findByEmailOrPhone(email, phone);
  
  if (!contact) {
    return false;
  }
  
  // If we're excluding an ID (for updates), check if the found contact is different
  if (excludeId && contact.id === excludeId) {
    return false;
  }
  
  return true;
}

/**
 * Check if a contact exists by email (case-insensitive) or phone digits
 */
export async function contactExists({ 
  email, 
  phoneDigits 
}: { 
  email?: string; 
  phoneDigits?: string 
}): Promise<boolean> {
  if (!email && !phoneDigits) {
    return false;
  }

  const conditions: any[] = [];
  
  if (email) {
    // Case-insensitive email match (already normalized to lowercase)
    conditions.push({ 
      email: normalizeEmail(email)
    });
  }
  
  if (phoneDigits && phoneDigits.length >= 10) {
    // Match by phone digits
    conditions.push({ 
      phone: { 
        contains: phoneDigits 
      } 
    });
  }

  if (conditions.length === 0) {
    return false;
  }

  try {
    const count = await prisma.contact.count({
      where: {
        OR: conditions
      }
    });
    
    return count > 0;
  } catch (error) {
    console.error('[dup] Error checking contact existence:', error);
    return false;
  }
}