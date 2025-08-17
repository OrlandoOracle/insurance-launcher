import { resolveHeaderMap } from '../lib/csv-helpers'
import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'

// Simple normalizeRow for testing
function normalizeRow(row: any, headerMap: any) {
  const normalized: any = {}
  
  // Map fields using header map
  for (const [rawHeader, value] of Object.entries(row)) {
    const field = headerMap[rawHeader]
    if (field && value !== undefined && value !== null) {
      normalized[field] = String(value).trim()
    }
  }
  
  // Apply simple normalization
  if (normalized.email) {
    normalized.email = normalized.email.toLowerCase()
  }
  
  if (normalized.phone) {
    normalized.phone = normalized.phone.replace(/\D/g, '')
  }
  
  if (!normalized.stage) {
    normalized.stage = 'NEW'
  }
  
  return normalized
}

console.log('Testing Supervisor CSV Import\n')

// Test 1: Header Mapping
console.log('1. Testing Header Mapping:')
const testHeaders = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'source',
  'stage',
  'ghl_id',
  'profile_url',
  'tags',
  'extra_col_1',
  'random_field'
]

const headerMap = resolveHeaderMap(testHeaders)
console.log('Input headers:', testHeaders)
console.log('Resolved mapping:')
Object.entries(headerMap).forEach(([key, value]) => {
  console.log(`  ${key} -> ${value || 'ignore'}`)
})

// Test 2: Row Normalization
console.log('\n2. Testing Row Normalization:')
const testRows = [
  {
    first_name: 'John',
    last_name: 'Doe',
    email: 'JOHN.DOE@EXAMPLE.COM',
    phone: '1-555-123-4567',
    stage: 'working',
    tags: 'life, auto; linkedin',
    extra_col: 'ignored'
  },
  {
    first_name: '',
    last_name: '',
    email: 'invalid-email',
    phone: '123',
    stage: 'unknown',
    tags: ''
  },
  {
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane@test.com',
    phone: '5551234567',
    stage: 'appt set',
    ghl_id: '12345',
    tags: 'life;auto'
  }
]

testRows.forEach((row, i) => {
  console.log(`\nRow ${i + 1} input:`, row)
  const normalized = normalizeRow(row, headerMap)
  console.log(`Row ${i + 1} normalized:`, normalized)
})

// Test 3: Process sample CSV
console.log('\n3. Testing Sample CSV File:')
const samplePath = path.join(process.cwd(), 'data', 'imports', 'samples', 'supervisor-sample.csv')

if (fs.existsSync(samplePath)) {
  const csvContent = fs.readFileSync(samplePath, 'utf-8')
  const parseResult = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: 'greedy',
    dynamicTyping: false
  })
  
  const rows = parseResult.data as any[]
  console.log(`Parsed ${rows.length} rows from sample CSV`)
  
  const headers = Object.keys(rows[0])
  const mapping = resolveHeaderMap(headers)
  
  // Process first 5 rows
  console.log('\nFirst 5 rows normalized:')
  rows.slice(0, 5).forEach((row, i) => {
    const normalized = normalizeRow(row, mapping)
    console.log(`Row ${i + 1}:`)
    console.log(`  Name: ${normalized.firstName} ${normalized.lastName}`)
    console.log(`  Email: ${normalized.email || '(empty)'}`)
    console.log(`  Phone: ${normalized.phone || '(empty)'}`)
    console.log(`  Stage: ${normalized.stage}`)
    console.log(`  Tags: ${normalized.tags || '(none)'}`)
    if (normalized.contactId) {
      console.log(`  Contact ID: ${normalized.contactId}`)
    }
  })
  
  // Count valid rows
  let validCount = 0
  let invalidCount = 0
  rows.forEach(row => {
    const normalized = normalizeRow(row, mapping)
    if (normalized.firstName || normalized.lastName) {
      validCount++
    } else {
      invalidCount++
    }
  })
  
  console.log(`\nValidation Summary:`)
  console.log(`  Valid rows: ${validCount}`)
  console.log(`  Invalid rows: ${invalidCount}`)
} else {
  console.log('Sample CSV not found at:', samplePath)
}

console.log('\n✅ Tests completed!')