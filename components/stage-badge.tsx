'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { ChevronDown } from 'lucide-react'
import { updateContact } from '@/app/actions/contacts'

const STAGE_COLORS = {
  NEW: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  WORKING: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
  QUALIFIED: 'bg-amber-100 text-amber-800 hover:bg-amber-200',
  BOOKED: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
  NO_SHOW: 'bg-red-100 text-red-800 hover:bg-red-200',
  NURTURE: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200',
  CLOSED: 'bg-green-100 text-green-800 hover:bg-green-200',
  // Legacy stages for backward compatibility
  NEW_LEAD: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  DISCOVERY: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
  QUOTE: 'bg-amber-100 text-amber-800 hover:bg-amber-200',
  PRESENTATION: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
  APP: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200',
  SOLD: 'bg-green-100 text-green-800 hover:bg-green-200',
  ONBOARD: 'bg-teal-100 text-teal-800 hover:bg-teal-200',
  RENEWAL: 'bg-gray-100 text-gray-800 hover:bg-gray-200'
}

const STAGE_LABELS = {
  NEW: 'New',
  WORKING: 'Working',
  QUALIFIED: 'Qualified',
  BOOKED: 'Booked',
  NO_SHOW: 'No Show',
  NURTURE: 'Nurture',
  CLOSED: 'Closed',
  // Legacy stages for backward compatibility
  NEW_LEAD: 'New Lead',
  DISCOVERY: 'Discovery',
  QUOTE: 'Quote',
  PRESENTATION: 'Presentation',
  APP: 'Application',
  SOLD: 'Sold',
  ONBOARD: 'Onboarding',
  RENEWAL: 'Renewal'
}

// Only show new stages in dropdown
const ACTIVE_STAGES = ['NEW', 'WORKING', 'QUALIFIED', 'BOOKED', 'NO_SHOW', 'NURTURE', 'CLOSED'] as const

interface StageBadgeProps {
  contactId?: string
  stage: keyof typeof STAGE_COLORS
  onUpdate?: () => void
}

export function StageBadge({ contactId, stage, onUpdate }: StageBadgeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [currentStage, setCurrentStage] = useState(stage)

  const handleStageChange = async (newStage: keyof typeof STAGE_COLORS) => {
    if (newStage === currentStage || !contactId) {
      setIsOpen(false)
      return
    }
    
    setUpdating(true)
    try {
      await updateContact(contactId, { stage: newStage as any })
      setCurrentStage(newStage)
      setIsOpen(false)
      onUpdate?.()
    } catch (error) {
      console.error('Failed to update stage:', error)
    } finally {
      setUpdating(false)
    }
  }

  // If no contactId, render as a simple badge without dropdown
  if (!contactId) {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STAGE_COLORS[currentStage] || STAGE_COLORS.NEW}`}>
        {STAGE_LABELS[currentStage] || 'New'}
      </span>
    )
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={updating}
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${STAGE_COLORS[currentStage] || STAGE_COLORS.NEW} ${updating ? 'opacity-50' : ''}`}
      >
        {STAGE_LABELS[currentStage] || 'New'}
        <ChevronDown className="h-3 w-3" />
      </button>
      
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full mt-1 left-0 z-[101] bg-white border rounded-lg shadow-lg py-1 min-w-[150px]">
            {ACTIVE_STAGES.map((key) => (
              <button
                key={key}
                onClick={() => handleStageChange(key)}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 ${
                  key === currentStage ? 'font-semibold bg-gray-50' : ''
                }`}
              >
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                  STAGE_COLORS[key].split(' ')[0]
                }`} />
                {STAGE_LABELS[key]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}