# Insurance Launcher

A production-ready, local-first insurance sales CRM with zero lost follow-ups and instant recall of past conversations.

## Features

✅ **Zero Lost Follow-ups** - Automatic task creation for unanswered calls
✅ **Instant Recall** - Full timeline of all interactions per contact
✅ **Fast Search** - Fuzzy search across all contact fields
✅ **KPI Dashboard** - Track dials, connects, closes, and revenue
✅ **CSV Import** - Bulk import with duplicate detection
✅ **AI Helpers** - Generate call summaries and objection responses
✅ **Keyboard-First** - Navigate efficiently with shortcuts
✅ **External Data** - Store data on external drives
✅ **GHL/Kixie Integration** - Quick launch buttons for dialing

## Quick Start

### 1. Installation

```bash
# Clone or download this repository
cd insurance-launcher

# Install dependencies
npm install
```

### 2. Configuration

Create a `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` to set your data directory and GHL configuration:
```env
# For external drive (recommended)
DATA_DIR=/Volumes/YourDrive/InsuranceData

# Or use local directory (default)
DATA_DIR=./data

# GoHighLevel integration (optional)
GHL_OPPS_URL="https://app.gohighlevel.com/v2/location/YOUR_LOCATION/opportunities/list"
CHROME_PROFILE_DIR="Default"  # See Chrome Profile Setup below
```

### 3. Database Setup (IMPORTANT)

**Stop any running dev server first**, then:

```bash
# Generate Prisma client
npm run db:generate

# Set up database (migrations + seed)
npm run db:ensure

# This will:
# - Create data directory if needed
# - Apply database schema
# - Seed with sample data if empty
```

### 4. Start the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Verify Setup

Check database health:
```bash
curl http://localhost:3000/api/health
```

This shows:
- Database path and status
- Tables and record counts
- Environment configuration

## Usage Guide

### Keyboard Shortcuts

- `N` - New Lead
- `/` - Focus search
- `T` - New Task
- `G D` - Go to Dashboard
- `G L` - Go to Leads
- `G T` - Go to Tasks
- `G S` - Go to Settings
- `G I` - Go to Import

### Adding Contacts

1. Click "New Lead" or press `N`
2. Fill in contact details
3. Optional: Add GHL URL for integration

### Importing from CSV

1. Navigate to Import page
2. Upload CSV file (drag & drop supported)
3. Map fields (auto-detected)
4. Review and import

Required CSV fields:
- First Name
- Last Name
- Email OR Phone
- How Heard (optional but recommended)

### Logging Calls

1. Open a contact
2. Click "Log Call"
3. Select outcome:
   - **Dial** - Creates automatic follow-up task
   - **Connect** - Prompts for next steps
   - **Close** - Enter revenue, completes all tasks
   - **Left VM** - Records voicemail

### Using AI Helpers

1. Open a contact
2. Click "Generate Call Summary Prompt"
3. Paste notes/transcript
4. Copy generated prompt
5. Paste into Claude or ChatGPT

### External Drive Setup (Persistent Storage)

All app data (database, CSV imports, backups) can be stored on an external drive for persistence across system restarts:

#### Via Environment Variable (Recommended)
1. Edit `.env` file:
   ```env
   DATA_DIR=/Volumes/ExternalDrive/InsuranceData
   ```
2. Restart the app

#### Via Settings Page
1. Go to Settings → Data Storage
2. Enter new directory path
3. Click "Test Path" to verify accessibility
4. Click "Move Data to New Directory"
5. The app will:
   - Create a backup of current data
   - Copy all data to new location
   - Update database path

#### Storage Structure
```
DATA_DIR/
├── insurance-launcher.db    # Main database
├── imports/                  # Saved CSV files
│   └── 2024-01-15_leads.csv
└── backups/                  # Database backups
    └── insurance-launcher_2024-01-15.db
```

#### Features
- **Automatic Migration**: Moves existing data when changing directories
- **Import History**: All CSV imports are saved with timestamps
- **Backup Management**: Create and manage database backups
- **Path Testing**: Verify directory is readable/writable before moving

### GoHighLevel Integration

#### Chrome Profile Setup (macOS)

The app can open GHL in a specific Chrome profile to keep your work accounts separate:

1. **Find your Chrome profile name:**
   - Open Chrome and go to `chrome://version/`
   - Look for "Profile Path" (e.g., `/Users/you/Library/Application Support/Google/Chrome/Default`)
   - The **last folder name** is your profile (e.g., "Default", "Profile 1", "Profile 2")
   - Note: Use only the folder NAME, not the full path

2. **Configure in Settings:**
   - Go to Settings in the app
   - Click "Test Open" to see available profiles
   - Click on a detected profile button to apply it
   - Or manually enter the profile name (e.g., "Default", "Profile 1")
   - Save settings

3. **How it works:**
   - Click "Open GHL" → URL opens immediately in a new tab
   - App also tries to launch Chrome with your specific profile
   - If profile launch succeeds, Chrome comes to front with correct profile
   - If profile launch fails, you still have the tab that opened

4. **Using the integration:**
   - Click "New Lead" or press `N`
   - Click "Open GHL" button - tab opens immediately
   - Copy contact info from GHL using your Chrome extension
   - Click "Paste GHL" button - fields auto-fill
   - If duplicate found, choose to open existing or continue

5. **Troubleshooting:**
   - If wrong profile opens: Go to Settings → Test Open → Click correct profile
   - If Chrome doesn't come to front: Check System Preferences → Security & Privacy → Accessibility
   - Console shows detailed diagnostics with emojis for easy debugging

#### Manual Contact Linking

1. Find contact in GoHighLevel
2. Copy the contact's URL
3. Paste in "GHL URL" field in contact details
4. Use "Open GHL" button for quick access

### Backup & Export

#### Database Backup
Copy the database file from your data directory:
- Location: `[DATA_DIR]/insurance-launcher.db`
- This file contains all your data

#### Export Contacts
1. Go to Leads page
2. Apply filters/search as needed
3. Click "Export CSV"
4. Save file for backup or analysis

#### Export Individual Contact
1. Open contact details
2. Use three-dot menu
3. Select "Export Contact Packet"
4. Saves JSON with full history

## Customization

### First Call Script
Edit `content/first-call.md` to customize your sales script.

### Kixie URL
Change default Kixie URL in Settings if using different instance.

### Calendar Integration
Add ICS calendar URL in Settings to display external events in Tasks view.

## Troubleshooting

### Database Issues

If you see "table does not exist" errors:
```bash
# Stop the dev server (Ctrl+C)
# Then run:
npm run db:ensure
npm run dev
```

If database won't initialize:
```bash
# Reset database completely
rm -rf data/insurance-launcher.db
npm run db:push
npm run db:seed
```

### First-Run Setup

For a clean setup on external drive:
```bash
# 1. Set DATA_DIR in .env
DATA_DIR=/Volumes/External/InsuranceData

# 2. Stop any running servers
# 3. Run setup
npm run db:generate
npm run db:ensure

# 4. Start app
npm run dev

# 5. Verify at http://localhost:3000/api/health
```

### Permission Errors

On Mac/Linux, ensure write permissions:
```bash
chmod -R 755 /path/to/data/directory
```

### Import Failures

- Ensure CSV is properly formatted
- Check for special characters in data
- Verify email/phone formats

### External Drive Issues

If using external drive:
- Ensure drive is mounted before starting app
- Use absolute paths in DATA_DIR
- Check write permissions on the drive

## Development

### Project Structure
```
insurance-launcher/
├── app/                  # Next.js app directory
│   ├── actions/         # Server actions
│   ├── leads/          # Lead management pages
│   ├── tasks/          # Task pages
│   └── ...
├── components/          # React components
├── prisma/             # Database schema
├── content/            # Static content (scripts)
└── lib/                # Utilities
```

### Technologies Used
- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Prisma** - Database ORM
- **SQLite** - Local database
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Fuse.js** - Fuzzy search
- **PapaParse** - CSV parsing

### Adding Features

1. Update Prisma schema if needed
2. Run `npm run db:migrate`
3. Create server actions in `app/actions/`
4. Build UI components
5. Test thoroughly

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio (database GUI)
- `npm run seed` - Seed sample data

## Security Notes

- All data stored locally - no cloud dependencies
- No authentication in v1 (single user)
- Backup your database file regularly
- Don't commit `.env` file to git

## Future Enhancements

Planned for future versions:
- [ ] Live GHL/Kixie API integration
- [ ] Email/SMS sending
- [ ] Multi-user support with auth
- [ ] Advanced analytics
- [ ] Mobile app
- [ ] Voice note transcription
- [ ] Automated follow-up sequences

## Discovery Tool

The First Call Discovery Tool is a comprehensive wizard for capturing client information during insurance discovery calls.

### Features
- **Multi-step wizard** with side navigation for easy jumping between sections
- **Floating rapport pad** (Cmd/Ctrl+R) for capturing notes throughout the call
- **Auto-save** every 3 seconds of idle time
- **Conditional logic** shows relevant sections based on answers
- **Multiple export formats**: JSON, YAML, and GHL-formatted text
- **Persistent storage** in SQLite database under DATA_DIR
- **Session management** for resuming and reviewing past calls

### Starting a Discovery Session
1. Navigate to `/discovery` or click "Discovery" in navigation
2. Click "New Discovery Call" to start
3. Work through the wizard steps, capturing information
4. Use the floating Rapport Pad (⌘R) to capture ongoing notes
5. Click "Complete Discovery Session" when finished
6. Review and export the data in your preferred format

### Keyboard Shortcuts
- **Enter**: Next step
- **Shift+Enter**: Previous step
- **⌘/Ctrl+K**: Jump to section (command palette)
- **⌘/Ctrl+R**: Toggle Rapport Pad
- **⌘/Ctrl+S**: Save progress

### Export Locations
- **Database**: Stored in SQLite under `DiscoverySession` table
- **JSON/YAML Files**: `${DATA_DIR}/exports/discovery/`
- **Filename Format**: `YYYY-MM-DD_LastName_FirstName_discovery.{json|yaml}`

### GHL Push Workflow
1. Complete the discovery session
2. Go to the Preview panel
3. Click "Push to GHL"
4. The formatted text is copied to clipboard
5. A new tab opens with your GHL instance
6. Paste the content into the appropriate GHL fields

### Data Structure
The discovery tool captures:
- Client demographics and household members
- Current insurance situation (losing coverage, paying too much, uninsured)
- Coverage details and preferences
- Health conditions and medications
- Doctor preferences
- Coverage priorities
- Budget expectations
- Next call scheduling details
- Rapport notes with timestamps

## Support

For issues or questions:
1. Check this README first
2. Review error messages in browser console
3. Ensure all dependencies installed
4. Verify data directory permissions

## License

Private use only. All rights reserved.

---

Built with ❤️ for insurance professionals who never want to lose another lead.