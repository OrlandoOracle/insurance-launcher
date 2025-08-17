# Insurance Launcher

A production-ready Next.js 14 web application for managing insurance leads, running entirely in the browser using the File System Access API.

## Features

- **Lead Management**: View, search, filter, and edit insurance leads
- **CSV Import**: Bulk import leads with intelligent mapping and duplicate detection
- **New Lead Intake**: Create new leads with comprehensive information
- **Discovery Tool**: First-call worksheet for capturing detailed customer information
- **File System Access**: All data stored on external drive, no server required
- **Companion Files**: Support for Medications, Doctors, and Notes markdown files
- **Stage Tracking**: Track leads through the entire sales pipeline
- **Permission Persistence**: Remembers storage connection across sessions

## Requirements

- Modern browser with File System Access API support (Chrome/Edge recommended)
- External drive with write permissions
- Node.js 20+ for development

## Setup Instructions

### 1. Development Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

### 2. Production Build

```bash
# Build for production
npm run build

# Test production build locally
npm run start
```

### 3. Browser Permissions (Edge on Mac)

1. Open Edge browser
2. Navigate to the app URL
3. Click "Connect Storage" button
4. Select your `InsuranceData` folder on the external drive
5. Grant read/write permissions when prompted
6. The app will remember this connection for future sessions

## Data Structure

The app expects/creates this folder structure on your external drive:

```
/InsuranceData
  /Leads
    /Active
    /Sold
    /Lost
    /Potential Duplicates
  /Imports
  /Backups
  /KPI
  leads.index.json
```

## Lead File Format

Each lead is stored as a JSON file with the following structure:

- Filename: `First_Last.json`
- Contains unique ID, contact info, stage, notes, and metadata
- Optional companion markdown files for extended documentation

## CSV Import Format

The importer accepts CSV files with these headers:
- First Name, Last Name
- Phone, Additional Phones
- Email, Additional Emails
- Created, Tags
- Business Name, Company Name
- And more (all fields are mapped during import)

## Deployment to Netlify

1. Push code to GitHub repository
2. Connect Netlify to your GitHub repository
3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Node version: 20 (set in netlify.toml)
4. Deploy

## Security Notes

- All data remains on your local external drive
- No data is sent to servers
- Browser handles all permissions
- Files are only accessible when drive is connected

## Browser Compatibility

- **Recommended**: Chrome 86+, Edge 86+
- **Supported**: Any Chromium-based browser with File System Access API
- **Not Supported**: Firefox, Safari (as of 2024)

## Development Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
npm run format   # Format code with Prettier
```

## First Run Checklist

1. ✅ Connect external drive
2. ✅ Open app in Chrome/Edge
3. ✅ Click "Connect Storage"
4. ✅ Select InsuranceData folder (will be created if not exists)
5. ✅ Grant permissions
6. ✅ Import CSV or create first lead
7. ✅ Test search and edit functions
8. ✅ Verify files are created on external drive

## Troubleshooting

### Permission Lost
- Click "Reconnect Storage" button
- Re-select the InsuranceData folder
- Grant permissions again

### Files Not Saving
- Check external drive is connected
- Verify write permissions on the drive
- Try reconnecting storage

### Import Errors
- Ensure CSV has headers
- Check for required fields (First Name, Last Name)
- Review validation warnings before import

## License

Private - All Rights Reserved
