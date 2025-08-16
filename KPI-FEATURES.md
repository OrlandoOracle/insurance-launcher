# KPI and Dashboard Features Documentation

## Overview
This update adds comprehensive KPI logging, lead detail overlays, and dashboard enhancements to the insurance launcher application.

## Features Implemented

### 1. Lead Detail Drawer
- **Location**: `components/lead/LeadDetailDrawer.tsx`
- **Usage**: Click any lead row in the Leads table to open a side drawer with:
  - Profile tab: Contact information, stage management, tags
  - Tasks tab: View and manage tasks for the contact
  - Activity tab: View activity history and add notes
- **API**: `/api/contacts/[id]` fetches full contact details

### 2. KPI Logging
- **Location**: `components/kpi/KpiLogModal.tsx`
- **Usage**: Click "+ Log" button on any KPI card on the dashboard
- **Features**:
  - Log dials, connects, closes, or revenue
  - Associate with specific contacts (optional)
  - Add notes and metadata (voicemail, SMS for dials)
  - Backdate entries if needed
- **Server Action**: `logKpi()` in `app/actions/kpis.ts`

### 3. Timeframe Selection
- **Location**: `components/kpi/RangePicker.tsx`
- **Usage**: Select time ranges for KPI display:
  - Today
  - This Week
  - Last 7 Days
  - Last 30 Days
  - Custom date range
- **Implementation**: Updates dashboard KPIs based on selected range

### 4. Database Schema Updates
- Added KPI fields to Activity model:
  - `date`: Separate date field for KPI tracking
  - `count`: Number of dials/connects/closes
  - `revenue`: Revenue amount
  - `voicemail`: Boolean for dial tracking
  - `smsSent`: Boolean for dial tracking
- Added `dashboardLayout` JSON field to Settings for widget persistence
- New ActivityType enum values: DIAL, CONNECT, CLOSE, REVENUE

## Integration Guide

### Making Lead Rows Clickable
In your leads table component, add:
```tsx
const [selectedContactId, setSelectedContactId] = useState<string | null>(null)

// In the table row:
<TableRow 
  onClick={() => setSelectedContactId(contact.id)}
  className="cursor-pointer hover:bg-gray-50"
>
  {/* Ensure buttons use e.stopPropagation() */}
</TableRow>

<LeadDetailDrawer
  contactId={selectedContactId}
  open={!!selectedContactId}
  onOpenChange={(open) => !open && setSelectedContactId(null)}
/>
```

### Adding KPI Log Buttons
On each KPI card:
```tsx
const [showLogModal, setShowLogModal] = useState(false)
const [kpiType, setKpiType] = useState<ActivityType>()

// In the card:
<Button 
  size="sm" 
  variant="ghost"
  onClick={() => {
    setKpiType(ActivityType.DIAL)
    setShowLogModal(true)
  }}
>
  + Log
</Button>

<KpiLogModal
  type={kpiType!}
  open={showLogModal}
  onOpenChange={setShowLogModal}
  onLogged={refreshKpis}
/>
```

### Dashboard Range Selection
```tsx
const [range, setRange] = useState('today')
const [kpis, setKpis] = useState<KpiData>()

const handleRangeChange = async (preset: string, custom?: {from: Date, to: Date}) => {
  setRange(preset)
  const data = preset === 'custom' 
    ? await getKpisForCustomRange(custom.from, custom.to)
    : await getKpisForRange(preset)
  setKpis(data)
}

<RangePicker value={range} onRangeChange={handleRangeChange} />
```

## Task Enhancements

To enhance task display with lead names and color coding:
```tsx
const getDueDateColor = (dueAt: Date | null) => {
  if (!dueAt) return ''
  const now = new Date()
  const due = new Date(dueAt)
  
  if (due < startOfDay(now)) return 'text-red-600' // Overdue
  if (due < endOfDay(now)) return 'text-orange-600' // Due today
  return 'text-gray-500' // Future
}

// In task display:
<span className={getDueDateColor(task.dueAt)}>
  {task.contact?.firstName} {task.contact?.lastName}
</span>
```

## Drag-and-Drop Dashboard

For implementing drag-and-drop:
```tsx
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

// Save layout to settings:
const saveLayout = async (layout: any) => {
  await updateSetting({ dashboardLayout: layout })
}
```

## Next Steps

1. Complete the Leads page integration with LeadDetailDrawer
2. Update Dashboard with KPI logging buttons and range picker
3. Implement drag-and-drop for dashboard widgets
4. Add task color coding and contact names
5. Test all features end-to-end

## Testing Checklist

- [ ] Lead rows open detail drawer on click
- [ ] Row action buttons don't trigger drawer (stopPropagation)
- [ ] KPI log modals work for all types (dial, connect, close, revenue)
- [ ] Range picker updates KPI data correctly
- [ ] Custom date ranges work properly
- [ ] Tasks show lead names and proper color coding
- [ ] Activity history displays in lead drawer
- [ ] Optimistic updates work smoothly
- [ ] Dashboard layout persists after reload