import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parse } from 'csv-parse/sync';
import { buildFieldMap, describeMappings } from '@/lib/import/autoMap';
import { 
  collapseSpaces, 
  splitName, 
  digitsOnly, 
  formatPhone10 
} from '@/lib/import/normalize';
import { contactExists } from '@/lib/dup';

export interface ImportResult {
  success: boolean;
  total: number;
  imported: number;
  duplicates: number;
  invalid: number;
  batchTag: string;
  mapping: string;
  examples: {
    imported: any[];
    duplicates: any[];
    invalid: any[];
  };
  errors?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const csvFile = formData.get('file') as File;
    const allowNoContact = formData.get('allowNoContact') === 'true';
    const source = formData.get('source') as string || 'CSV Import';
    
    if (!csvFile) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Read CSV content
    const csvContent = await csvFile.text();
    
    // Parse CSV
    let rows: any[];
    try {
      rows = parse(csvContent, { 
        columns: true, 
        skip_empty_lines: true,
        trim: true 
      });
    } catch (error) {
      return NextResponse.json(
        { success: false, error: `Failed to parse CSV: ${error}` },
        { status: 400 }
      );
    }
    
    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No data found in CSV' },
        { status: 400 }
      );
    }
    
    // Build field mapping
    const headers = Object.keys(rows[0]);
    const fieldMap = buildFieldMap(headers);
    const mappingDesc = describeMappings(fieldMap);
    
    console.log('[Import] Field mapping:', fieldMap);
    console.log('[Import] Description:', mappingDesc);
    
    // Generate batch tag
    const now = new Date();
    const batchTag = `batch:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Process rows
    const importedList: any[] = [];
    const duplicatesList: any[] = [];
    const invalidList: any[] = [];
    const seenKeys = new Set<string>();
    
    for (const row of rows) {
      // Extract and normalize data
      let firstName = '';
      let lastName = '';
      
      if (fieldMap.fullName && row[fieldMap.fullName]) {
        const { first, last } = splitName(row[fieldMap.fullName]);
        firstName = first;
        lastName = last;
      } else {
        if (fieldMap.firstName) {
          firstName = collapseSpaces(row[fieldMap.firstName] || '');
        }
        if (fieldMap.lastName) {
          lastName = collapseSpaces(row[fieldMap.lastName] || '');
        }
      }
      
      const emailRaw = fieldMap.email ? row[fieldMap.email] || '' : '';
      const email = emailRaw.toLowerCase().trim();
      
      const phoneRaw = fieldMap.phone ? row[fieldMap.phone] || '' : '';
      const phoneDigits = digitsOnly(phoneRaw);
      const phoneFormatted = formatPhone10(phoneDigits) || phoneDigits;
      
      // Build processed row for tracking
      const processedRow = {
        firstName,
        lastName,
        email,
        phone: phoneFormatted,
        phoneDigits,
        source
      };
      
      // Validation
      const hasName = firstName || lastName;
      const hasContact = email || phoneDigits;
      
      if (!hasName) {
        invalidList.push({ ...processedRow, reason: 'No name' });
        continue;
      }
      
      if (!hasContact && !allowNoContact) {
        invalidList.push({ ...processedRow, reason: 'No email or phone' });
        continue;
      }
      
      // Check for duplicates in current batch
      const dedupeKey = `${email}|${phoneDigits}`;
      if (hasContact && seenKeys.has(dedupeKey)) {
        duplicatesList.push({ ...processedRow, reason: 'Duplicate in file' });
        continue;
      }
      seenKeys.add(dedupeKey);
      
      // Check for duplicates in database
      if (hasContact) {
        const exists = await contactExists({ 
          email: email || undefined, 
          phoneDigits: phoneDigits || undefined 
        });
        
        if (exists) {
          duplicatesList.push({ ...processedRow, reason: 'Already in database' });
          continue;
        }
      }
      
      // Import the contact
      try {
        const newContact = await prisma.contact.create({
          data: {
            firstName,
            lastName,
            email: email || '',
            phone: phoneFormatted || '',
            howHeard: source,
            stage: 'NEW_LEAD',
            tags: JSON.stringify([batchTag])
          }
        });
        
        // Add import activity
        await prisma.activity.create({
          data: {
            contactId: newContact.id,
            type: 'NOTE',
            summary: `Imported via CSV (${batchTag})`
          }
        });
        
        // Auto-create follow-up task
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        
        await prisma.task.create({
          data: {
            contactId: newContact.id,
            title: 'Call new lead',
            dueAt: tomorrow,
            status: 'OPEN',
            source: 'SYSTEM'
          }
        });
        
        importedList.push({
          ...processedRow,
          id: newContact.id
        });
      } catch (error) {
        console.error('[Import] Error creating contact:', error);
        invalidList.push({ 
          ...processedRow, 
          reason: `Database error: ${error}` 
        });
      }
    }
    
    // Prepare result
    const result: ImportResult = {
      success: true,
      total: rows.length,
      imported: importedList.length,
      duplicates: duplicatesList.length,
      invalid: invalidList.length,
      batchTag,
      mapping: mappingDesc,
      examples: {
        imported: importedList.slice(0, 10),
        duplicates: duplicatesList.slice(0, 10),
        invalid: invalidList.slice(0, 10)
      }
    };
    
    console.log('[Import] Summary:', {
      total: result.total,
      imported: result.imported,
      duplicates: result.duplicates,
      invalid: result.invalid
    });
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('[Import] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Import failed', 
        details: String(error) 
      },
      { status: 500 }
    );
  }
}