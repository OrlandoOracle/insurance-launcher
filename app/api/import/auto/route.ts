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

export type RowIssue = { 
  line: number; 
  reason: string; 
  sample?: any 
};

export interface ImportResult {
  success: boolean;
  total: number;
  imported: number;
  duplicates: number;
  invalid: number;
  warnings: number;
  batchTag: string;
  mapping: string;
  examples: {
    imported: any[];
    duplicates: any[];
    invalid: any[];
    warned: RowIssue[];
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
    
    // Pre-normalize text: strip BOM, normalize line endings, fix smart quotes
    const normalized = csvContent
      .replace(/^\uFEFF/, '')           // strip UTF-8 BOM
      .replace(/\r\n?/g, '\n')          // CRLF/CR → LF
      .replace(/[""]/g, '"')            // smart quotes to regular
      .replace(/['']/g, "'");           // smart apostrophes to regular
    
    // Sniff delimiter (comma vs semicolon vs tab)
    function sniffDelimiter(sample: string): string {
      const first = sample.split('\n').slice(0, 5).join('\n');
      const delimiters: [string, number][] = [',', ';', '\t', '|'].map(d => {
        const matches = first.match(new RegExp(`\\${d}`, 'g')) || [];
        return [d, matches.length];
      });
      delimiters.sort((a, b) => b[1] - a[1]);
      return delimiters[0][1] > 0 ? delimiters[0][0] : ',';
    }
    const delimiter = sniffDelimiter(normalized);
    
    console.log('[Import] Detected delimiter:', delimiter === '\t' ? 'tab' : delimiter);
    
    // Parse CSV with relaxed options
    let rows: any[] = [];
    const issues: RowIssue[] = [];
    let lineNumber = 0; // Track line numbers for error reporting
    
    // First, try the standard parse with very relaxed options
    try {
      rows = parse(normalized, { 
        columns: true,                 // use header row
        delimiter,                     // auto-sniffed
        skip_empty_lines: true,        // ignore empty lines
        relax_column_count: true,      // DON'T throw on uneven columns
        relax_quotes: true,            // tolerate mismatched quotes
        escape: '"',                   // handle escaped quotes
        quote: '"',                    // quote character
        skip_records_with_error: true, // skip bad records
        trim: true,
        ltrim: true,
        rtrim: true,
        bom: true,
        on_error: (error: any, context: any) => {
          // Log parsing errors as warnings instead of failing
          issues.push({
            line: context?.lines || lineNumber,
            reason: `Parse error: ${error.message}`,
            sample: context?.record || null
          });
          // Continue parsing
          return undefined;
        },
        on_record: (rec: any, context: any) => {
          lineNumber++;
          
          // Drop rows that are completely empty after trim
          const vals = Object.values(rec ?? {});
          if (!vals.some(v => (v ?? '').toString().trim().length)) {
            return null;
          }
          
          // Normalize smart quotes and special characters
          for (const k of Object.keys(rec)) {
            const v = rec[k];
            if (typeof v === 'string') {
              rec[k] = v
                .replace(/[""]/g, '"')   // smart quotes to regular
                .replace(/['']/g, "'")   // smart apostrophes to regular
                .replace(/\u00A0/g, ' ') // non-breaking space to regular
                .trim();
            }
          }
          
          // Check for column count mismatch (warning, not error)
          const expectedCols = context.columns?.length || 0;
          const actualCols = Object.keys(rec).length;
          if (expectedCols > 0 && actualCols !== expectedCols) {
            issues.push({
              line: lineNumber,
              reason: `Column count mismatch: expected ${expectedCols}, got ${actualCols}`,
              sample: rec
            });
          }
          
          return rec;
        }
      });
    } catch (error: any) {
      // If bulk parse fails, try line-by-line parsing as fallback
      console.warn('[Import] Bulk parse failed, attempting line-by-line parse:', error.message);
      
      const lines = normalized.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        return NextResponse.json(
          { success: false, error: 'No valid data found in CSV' },
          { status: 400 }
        );
      }
      
      // Parse header separately
      let headers: string[];
      try {
        const headerResult = parse(lines[0], {
          delimiter,
          relax_quotes: true,
          relax_column_count: true
        });
        headers = headerResult[0] || [];
      } catch (headerError: any) {
        console.error('[Import] Failed to parse header:', headerError);
        return NextResponse.json(
          { success: false, error: 'Failed to parse CSV header' },
          { status: 400 }
        );
      }
      
      // Parse each data row individually
      rows = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        try {
          const rowResult = parse(line, {
            delimiter,
            relax_quotes: true,
            relax_column_count: true,
            columns: headers
          });
          
          if (rowResult && rowResult[0]) {
            rows.push(rowResult[0]);
          }
        } catch (rowError: any) {
          // Log issue but continue parsing other rows
          issues.push({
            line: i + 1,
            reason: `Row parse error: ${rowError.message}`,
            sample: line.substring(0, 100)
          });
          console.warn(`[Import] Failed to parse line ${i + 1}:`, rowError.message);
        }
      }
      
      console.log(`[Import] Line-by-line parse recovered ${rows.length} rows with ${issues.length} issues`);
    }
    
    if (!rows || rows.length === 0) {
      console.log('[Import] No rows found. Issues:', issues);
      return NextResponse.json(
        { 
          success: false, 
          error: 'No valid data could be parsed from CSV',
          warnings: issues.length,
          examples: { warned: issues.slice(0, 10) }
        },
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
    
    console.log(`[Import] Processing ${rows.length} rows with ${issues.length} warnings`);
    
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
      warnings: issues.length,
      batchTag,
      mapping: mappingDesc,
      examples: {
        imported: importedList.slice(0, 10),
        duplicates: duplicatesList.slice(0, 10),
        invalid: invalidList.slice(0, 10),
        warned: issues.slice(0, 10)
      }
    };
    
    console.log('[Import] Summary:', {
      total: result.total,
      imported: result.imported,
      duplicates: result.duplicates,
      invalid: result.invalid,
      warnings: result.warnings
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