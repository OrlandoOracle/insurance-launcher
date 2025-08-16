# CSV Carrier Export Cleaner

## Overview
A Node.js script that pre-cleans carrier export CSV files for import into the insurance launcher CRM. It normalizes names, phones, emails, removes duplicates, and filters out agent data.

## Installation
```bash
npm install csv-parse csv-stringify
```

## Usage
```bash
# Basic usage
npm run clean:csv -- --in=./imports/raw/CarrierExport.csv

# With all options
npm run clean:csv -- --in=./imports/raw/CarrierExport.csv \
  --out=./imports/clean/output.csv \
  --source="CSV Import – Aug 2025" \
  --no-batch-tag
```

## CLI Options
- `--in=path/to/file.csv` (required) - Input CSV file path
- `--out=path/to/output.csv` (optional) - Output path (default: input.clean.csv)
- `--source="Source Name"` (optional) - Sets "How Heard" field value
- `--no-batch-tag` (optional) - Skip adding batch:YYYY-MM tag

## Transformations

### 1. Name Splitting
- Collapses multiple spaces to single space
- Strips common suffixes (Jr, Sr, II, III, IV, V)
- Single token → First Name only
- Multiple tokens → All but last = First Name, last = Last Name

### 2. Email Normalization
- Lowercases all emails
- Trims whitespace

### 3. Phone Formatting
- Extracts digits only
- Formats 10-digit phones as (XXX) XXX-XXXX
- Keeps other lengths as-is (digits only)
- Prefers INSURED_PARTY_PHONE over agent columns

### 4. Agent Field Filtering
- Ignores any column matching /\b(wrt|agt|agent)\b/i
- Focuses on insured/owner data only

### 5. Row Validation
- Keeps rows with email OR phone (after normalization)
- Drops rows with neither

### 6. Deduplication
- Case-insensitive email matching
- Phone matching by digits only
- Removes duplicates by email OR phone

## Output Format
```csv
First Name,Last Name,Email,Phone,How Heard,Tags
John,Smith,john@email.com,(555) 123-4567,CSV Import,batch:2025-08
```

## Example Carrier Export Input
```csv
INSURED_NME,INSURED_PARTY_PHONE,INSURED_EMAIL_ADDRESS,WRT_AGT2_NAME
John Smith Jr,555-123-4567,JOHN@EMAIL.COM,Agent Name
Sarah  Johnson,5551234568,sarah@gmail.com,Agent Two
```

## Example Clean Output
```csv
First Name,Last Name,Email,Phone,How Heard,Tags
John,Smith,john@email.com,(555) 123-4567,CSV Import,batch:2025-08
Sarah,Johnson,sarah@gmail.com,(555) 123-4568,CSV Import,batch:2025-08
```

## Summary Report
After processing, the script prints:
- Total input rows
- Kept (importable) rows
- Deduplicated count
- Invalid/empty rows count
- Top 5 drop reasons
- Output file location

## Column Mapping for Import
After cleaning, use the app's import page with this mapping:
- First Name → First Name
- Last Name → Last Name
- Email → Email
- Phone → Phone
- How Heard → How Heard
- Tags → Tags

## Supported Input Columns
The script looks for these columns (case-insensitive):
- **Name**: INSURED_NME, OWNER_NME, NAME, INSURED_NAME
- **Email**: INSURED_EMAIL_ADDRESS, EMAIL, INSURED_EMAIL
- **Phone**: INSURED_PARTY_PHONE, PHONE, INSURED_PHONE

## Tips
1. Always review the summary to check for unexpected drops
2. Use `--source` to track import batches
3. The batch tag helps identify when leads were imported
4. Check for high duplicate counts - may indicate data quality issues
5. Agent columns are automatically ignored