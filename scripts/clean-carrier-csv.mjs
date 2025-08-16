#!/usr/bin/env node
// scripts/clean-carrier-csv.mjs
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

// Parse CLI arguments
function arg(name, def = undefined) {
  const m = process.argv.find(a => a.startsWith(`--${name}=`));
  return m ? m.split('=').slice(1).join('=') : def;
}

const IN = arg('in');
if (!IN) {
  console.error('Usage: node scripts/clean-carrier-csv.mjs --in=./imports/raw/file.csv [--out=./out.csv] [--source="CSV Import – Aug 2025"] [--no-batch-tag]');
  process.exit(1);
}

const OUT = arg('out') || (() => {
  const { dir, name } = path.parse(IN);
  return path.join(dir, `${name}.clean.csv`);
})();

const SOURCE = arg('source', '');
const ADD_BATCH_TAG = !process.argv.includes('--no-batch-tag');

// Helper functions
function collapseSpaces(s = '') {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

function stripSuffix(token = '') {
  const t = token.replace(/[.,]$/,'').toLowerCase();
  const suffixes = ['jr','sr','ii','iii','iv','v'];
  return suffixes.includes(t) ? '' : token;
}

function splitName(full = '') {
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

function digitsOnly(s = '') {
  return String(s || '').replace(/\D/g,'');
}

function formatPhone10(d) {
  if (d.length !== 10) return '';
  return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
}

function looksLikeAgentHeader(h = '') {
  return /\b(wrt|agt|agent)\b/i.test(h);
}

// Read and parse CSV
console.log('Reading input file:', IN);
let csv;
try {
  csv = fs.readFileSync(IN, 'utf8');
} catch (err) {
  console.error('Error reading file:', err.message);
  process.exit(1);
}

let rows;
try {
  rows = parse(csv, { columns: true, skip_empty_lines: true });
} catch (err) {
  console.error('Error parsing CSV:', err.message);
  process.exit(1);
}

if (!rows || rows.length === 0) {
  console.error('No data found in CSV');
  process.exit(1);
}

// Get headers and find column indexes
const headers = Object.keys(rows[0] || {}).map(h => h.trim());
const hIndex = (wantedArr) => {
  for (const w of wantedArr) {
    const hit = headers.find(h => h.toLowerCase() === w.toLowerCase());
    if (hit) return hit;
  }
  return null;
};

// Find relevant columns
const H_NAME = hIndex(['INSURED_NME','OWNER_NME','NAME','INSURED_NAME']);
const H_EMAIL = hIndex(['INSURED_EMAIL_ADDRESS','EMAIL','INSURED_EMAIL']);
const H_PHONE = hIndex(['INSURED_PARTY_PHONE','PHONE','INSURED_PHONE']);

console.log('Found columns:');
console.log('  Name column:', H_NAME || 'NOT FOUND');
console.log('  Email column:', H_EMAIL || 'NOT FOUND');
console.log('  Phone column:', H_PHONE || 'NOT FOUND');

// Process rows
let inputCount = 0, kept = 0, invalid = 0, deduped = 0;
const dropReasons = new Map();
const seen = new Set();
const out = [];

// Generate batch tag
const now = new Date();
const monthTag = `batch:${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

for (const row of rows) {
  inputCount++;

  // Extract name
  const fullName = row[H_NAME] || '';
  const { first, last } = splitName(fullName);

  // Extract email (lowercase and trim)
  const emailRaw = String(row[H_EMAIL] || '').trim();
  const email = emailRaw.toLowerCase();

  // Extract phone (prefer insured over agent columns)
  let phoneCandidate = '';
  if (H_PHONE && row[H_PHONE]) {
    phoneCandidate = String(row[H_PHONE]);
  } else {
    // Fallback to any phone-like column that's NOT an agent column
    for (const header of headers) {
      if (!looksLikeAgentHeader(header) && header.toLowerCase().includes('phone') && row[header]) {
        phoneCandidate = String(row[header]);
        break;
      }
    }
  }
  
  const phoneDigits = digitsOnly(phoneCandidate);
  const phoneFormatted = formatPhone10(phoneDigits);
  const phoneDisplay = phoneFormatted || phoneDigits;

  // Validation: must have email OR phone
  const hasContact = Boolean(email) || Boolean(phoneDigits);
  if (!hasContact) {
    invalid++;
    const reason = !fullName ? 'No name' : 'No email or phone';
    dropReasons.set(reason, (dropReasons.get(reason) || 0) + 1);
    continue;
  }

  // Deduplication by email OR phone
  const dedupeKeys = [];
  if (email) dedupeKeys.push(`email:${email}`);
  if (phoneDigits) dedupeKeys.push(`phone:${phoneDigits}`);
  
  let isDupe = false;
  for (const key of dedupeKeys) {
    if (seen.has(key)) {
      isDupe = true;
      break;
    }
  }
  
  if (isDupe) {
    deduped++;
    dropReasons.set('Duplicate', (dropReasons.get('Duplicate') || 0) + 1);
    continue;
  }
  
  // Mark as seen
  dedupeKeys.forEach(key => seen.add(key));

  // Build output row
  const HowHeard = SOURCE || '';
  const Tags = ADD_BATCH_TAG ? monthTag : '';

  out.push({
    'First Name': first,
    'Last Name': last,
    'Email': email,
    'Phone': phoneDisplay,
    'How Heard': HowHeard,
    'Tags': Tags,
  });
  kept++;
}

// Write output
const outCsv = stringify(out, { header: true });
fs.writeFileSync(OUT, outCsv, 'utf8');

// Print summary
console.log('\n--- CSV Clean Summary ---');
console.log('Input rows        :', inputCount);
console.log('Kept (importable) :', kept);
console.log('Deduped           :', deduped);
console.log('Invalid (no phone/email):', invalid);
console.log('Output            :', OUT);

// Top drop reasons
if (dropReasons.size > 0) {
  console.log('\nTop reasons for drops:');
  const sorted = Array.from(dropReasons.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  sorted.forEach(([reason, count], i) => {
    console.log(`  ${i + 1}. ${reason}: ${count}`);
  });
}

console.log('-------------------------');
console.log(`✓ Clean CSV ready at: ${OUT}`);