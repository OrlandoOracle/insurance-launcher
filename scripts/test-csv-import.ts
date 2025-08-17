import { 
  normalizeHeader, 
  guessMapping, 
  normalizePhone, 
  mapStage, 
  parseDateLoose,
  detectDelimiter,
  preprocessCSV,
  splitTags,
  mergeTags,
  normalizeEmail
} from '../lib/csv'

console.log('Testing CSV Import Utilities\n')

// Test header normalization
console.log('1. Header Normalization:')
const testHeaders = [
  'First Name',
  'first_name',
  'FIRST-NAME',
  '  First  Name  ',
  'email_address',
  'GHL ID',
  'ghl_id'
]
testHeaders.forEach(h => {
  console.log(`  "${h}" -> "${normalizeHeader(h)}"`)
})

// Test field mapping
console.log('\n2. Field Mapping Guess:')
const csvHeaders = ['First Name', 'Last Name', 'Email Address', 'Phone Number', 'Extra Column', 'GHL ID', 'Tags']
const mapping = guessMapping(csvHeaders)
console.log('  Headers:', csvHeaders)
console.log('  Mapping:', mapping)

// Test phone normalization
console.log('\n3. Phone Normalization:')
const testPhones = [
  '555-123-4567',
  '(555) 123-4567',
  '15551234567',
  '+1 555 123 4567',
  '555.123.4567',
  '5551234567',
  '123'
]
testPhones.forEach(p => {
  console.log(`  "${p}" -> "${normalizePhone(p)}"`)
})

// Test stage mapping
console.log('\n4. Stage Mapping:')
const testStages = ['new', 'NEW', 'working', 'qualified', 'CLOSED', 'no show', 'nurture', 'invalid']
testStages.forEach(s => {
  console.log(`  "${s}" -> ${mapStage(s)}`)
})

// Test date parsing
console.log('\n5. Date Parsing:')
const testDates = [
  '2024-01-15',
  '01/15/2024',
  'Jan 15, 2024',
  '15-01-2024',
  '2024-01-15T10:30:00',
  'invalid date'
]
testDates.forEach(d => {
  const parsed = parseDateLoose(d)
  console.log(`  "${d}" -> ${parsed ? parsed.toISOString() : 'null'}`)
})

// Test delimiter detection
console.log('\n6. Delimiter Detection:')
const csvSamples = [
  'Name,Email,Phone\nJohn,john@test.com,555-1234',
  'Name;Email;Phone\nJohn;john@test.com;555-1234',
  'Name\tEmail\tPhone\nJohn\tjohn@test.com\t555-1234',
  'Name|Email|Phone\nJohn|john@test.com|555-1234'
]
csvSamples.forEach((sample, i) => {
  const delimiter = detectDelimiter(sample)
  const type = delimiter === '\t' ? 'tab' : delimiter
  console.log(`  Sample ${i + 1}: detected "${type}"`)
})

// Test CSV preprocessing
console.log('\n7. CSV Preprocessing:')
const problematicCSV = '\uFEFF"Name","Email"\r\n"John Doe","john@test.com",,,\r\n"Jane Smith","jane@test.com",'
const cleaned = preprocessCSV(problematicCSV)
console.log('  Original (with BOM, CRLF, trailing commas):', problematicCSV.length, 'chars')
console.log('  Cleaned:', cleaned.length, 'chars')
console.log('  BOM removed:', !cleaned.startsWith('\uFEFF'))
console.log('  CRLF normalized:', !cleaned.includes('\r'))
console.log('  Trailing commas removed:', !cleaned.endsWith(','))

// Test tag operations
console.log('\n8. Tag Operations:')
const tagStrings = ['tag1, tag2', 'tag3; tag4', 'tag1, tag5']
console.log('  Split tags:')
tagStrings.forEach(t => {
  console.log(`    "${t}" -> [${splitTags(t).join(', ')}]`)
})
console.log('  Merge tags:')
const existing = ['tag1', 'tag2']
const incoming = ['tag2', 'tag3', 'tag1']
console.log(`    [${existing}] + [${incoming}] -> [${mergeTags(existing, incoming)}]`)

// Test email normalization
console.log('\n9. Email Normalization:')
const testEmails = [
  'John.Doe@EXAMPLE.COM',
  '  john@test.com  ',
  'invalid-email',
  '',
  'valid@email.co.uk'
]
testEmails.forEach(e => {
  console.log(`  "${e}" -> "${normalizeEmail(e)}"`)
})

console.log('\n✅ All tests completed!')