import * as yaml from 'yaml'
import { DiscoveryData } from './types'

// Format discovery data to JSON
export function formatToJSON(data: DiscoveryData): string {
  return JSON.stringify(data, null, 2)
}

// Format discovery data to YAML
export function formatToYAML(data: DiscoveryData): string {
  return yaml.stringify(data, { indent: 2 })
}

// Generate GHL-friendly text block
export function formatForGHL(data: DiscoveryData): string {
  const lines: string[] = []
  
  lines.push('=== DISCOVERY CALL SUMMARY ===')
  lines.push('')
  
  // Client Info
  lines.push('CLIENT INFORMATION:')
  lines.push(`Name: ${data.client.firstName} ${data.client.lastName}`)
  lines.push(`DOB: ${data.client.dob}`)
  lines.push(`Location: ${data.client.zip} - ${data.client.county}, ${data.client.state}`)
  if (data.client.contact.phone) lines.push(`Phone: ${data.client.contact.phone}`)
  if (data.client.contact.email) lines.push(`Email: ${data.client.contact.email}`)
  lines.push('')
  
  // Household
  if (data.client.household.length > 0) {
    lines.push('HOUSEHOLD MEMBERS:')
    data.client.household.forEach(member => {
      lines.push(`- ${member.firstName} ${member.lastName} (${member.relationship}) - DOB: ${member.dob}`)
    })
    lines.push('')
  }
  
  // Discovery
  lines.push('DISCOVERY:')
  lines.push(`Source: ${data.discovery.source}`)
  lines.push(`Situation: ${data.discovery.situationSummary}`)
  const status = []
  if (data.discovery.status.losingCoverage) status.push('Losing Coverage')
  if (data.discovery.status.payingTooMuch) status.push('Paying Too Much')
  if (data.discovery.status.uninsured) status.push('Currently Uninsured')
  lines.push(`Status: ${status.join(', ')}`)
  lines.push('')
  
  // Current Coverage
  if (data.discovery.status.losingCoverage || data.discovery.status.payingTooMuch) {
    lines.push('CURRENT COVERAGE:')
    const cov = data.coverage.current
    if (cov.carrier) lines.push(`Carrier: ${cov.carrier}`)
    if (cov.channel) lines.push(`Channel: ${cov.channel}`)
    if (cov.premium) lines.push(`Premium: $${cov.premium}/mo`)
    if (cov.deductible) lines.push(`Deductible: $${cov.deductible}`)
    if (cov.oopm) lines.push(`Out-of-Pocket Max: $${cov.oopm}`)
    if (cov.network) lines.push(`Network: ${cov.network}`)
    if (cov.cobraOffered) lines.push(`COBRA Offered: Yes - Cost: $${cov.cobraCost || 'Unknown'}`)
    if (cov.lastDay) lines.push(`Last Day of Coverage: ${cov.lastDay}`)
    if (cov.likes) lines.push(`Likes: ${cov.likes}`)
    if (cov.dislikes) lines.push(`Dislikes: ${cov.dislikes}`)
    lines.push('')
  }
  
  // Uninsured Info
  if (data.discovery.status.uninsured && data.coverage.uninsured) {
    lines.push('UNINSURED DETAILS:')
    const unins = data.coverage.uninsured
    if (unins.lastInsuredDate) lines.push(`Last Insured: ${unins.lastInsuredDate}`)
    if (unins.lastCarrier) lines.push(`Last Carrier: ${unins.lastCarrier}`)
    if (unins.lastPremium) lines.push(`Last Premium: $${unins.lastPremium}`)
    lines.push('')
  }
  
  // Income
  if (data.income.amount) {
    lines.push('INCOME:')
    lines.push(`2025 Household Income: $${data.income.amount.toLocaleString()} (${data.income.basis})`)
    lines.push('')
  }
  
  // Health
  if (data.health.conditions.length > 0 || data.health.medications.length > 0) {
    lines.push('HEALTH INFORMATION:')
    if (data.health.conditions.length > 0) {
      lines.push(`Conditions: ${data.health.conditions.join(', ')}`)
    }
    if (data.health.medications.length > 0) {
      lines.push('Medications:')
      data.health.medications.forEach(med => {
        lines.push(`- ${med.name} ${med.dose} - ${med.frequency} (${med.purpose})`)
      })
    }
    lines.push('')
  }
  
  // Doctors
  if (data.doctors.length > 0) {
    lines.push('DOCTORS TO KEEP IN-NETWORK:')
    data.doctors.forEach(doc => {
      lines.push(`- Dr. ${doc.firstName} ${doc.lastName} (${doc.specialty}) - ${doc.city}, ${doc.state}`)
      if (doc.clinic) lines.push(`  Clinic: ${doc.clinic}`)
    })
    lines.push('')
  }
  
  // Priorities
  if (data.priorities.length > 0) {
    lines.push('PRIORITIES:')
    lines.push(data.priorities.join(', '))
    lines.push('')
  }
  
  // Additional Coverage
  lines.push('ADDITIONAL COVERAGE:')
  lines.push(`Dental: ${data.dentalVision.dental ? 'Yes' : 'No'}`)
  lines.push(`Vision: ${data.dentalVision.vision ? 'Yes' : 'No'}`)
  if (data.lifeInsurance.has) {
    lines.push(`Life Insurance: Yes - ${data.lifeInsurance.type}`)
    if (data.lifeInsurance.cashValue) lines.push(`  Cash Value: $${data.lifeInsurance.cashValue}`)
  } else {
    lines.push('Life Insurance: No')
  }
  lines.push('')
  
  // Budget
  if (data.budget.text || data.budget.min || data.budget.max) {
    lines.push('BUDGET:')
    if (data.budget.text) lines.push(data.budget.text)
    if (data.budget.min && data.budget.max) {
      lines.push(`Range: $${data.budget.min} - $${data.budget.max}`)
    }
    lines.push('')
  }
  
  // Next Call
  lines.push('NEXT CALL:')
  if (data.nextCall.proposedSlots.length > 0) {
    lines.push('Proposed Times:')
    data.nextCall.proposedSlots.forEach(slot => {
      lines.push(`- ${slot.date} from ${slot.start} to ${slot.end}`)
    })
  }
  lines.push(`Spouse Joining: ${data.nextCall.spouseJoining ? 'Yes' : 'No'}`)
  lines.push(`Screen Share Ready: ${data.nextCall.screenShareOk ? 'Yes' : 'No'}`)
  if (data.nextCall.inviteEmail) lines.push(`Invite Email: ${data.nextCall.inviteEmail}`)
  lines.push('')
  
  // Rapport Notes
  if (data.rapport.length > 0) {
    lines.push('RAPPORT NOTES:')
    data.rapport.forEach(item => {
      const time = new Date(item.ts).toLocaleTimeString()
      lines.push(`[${time}] ${item.text}`)
    })
    lines.push('')
  }
  
  lines.push('=== END OF SUMMARY ===')
  
  return lines.join('\n')
}

// Format call duration
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// Validate email
export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

// Validate ZIP code
export function validateZip(zip: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(zip)
}

// Validate date format (YYYY-MM-DD)
export function validateDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const d = new Date(date)
  return d instanceof Date && !isNaN(d.getTime())
}

// Get state from ZIP (simplified - would need full ZIP database in production)
export function getStateFromZip(zip: string): string {
  // This is a simplified example - in production, use a ZIP code database
  const firstThree = zip.substring(0, 3)
  const zipToState: { [key: string]: string } = {
    '100': 'NY', '101': 'NY', '102': 'NY', '103': 'NY', '104': 'NY',
    '900': 'CA', '901': 'CA', '902': 'CA', '903': 'CA', '904': 'CA',
    '330': 'FL', '331': 'FL', '332': 'FL', '333': 'FL', '334': 'FL',
    '750': 'TX', '751': 'TX', '752': 'TX', '753': 'TX', '754': 'TX',
    // Add more mappings as needed
  }
  return zipToState[firstThree] || ''
}

// Generate export filename
export function generateExportFilename(data: DiscoveryData, extension: 'json' | 'yaml'): string {
  const date = new Date().toISOString().split('T')[0]
  const clientName = `${data.client.lastName}_${data.client.firstName}`.toLowerCase().replace(/\s+/g, '_')
  return `${date}_${clientName}_discovery.${extension}`
}