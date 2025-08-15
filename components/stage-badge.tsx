'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { ChevronDown } from 'lucide-react'
import { updateContact } from '@/app/actions/contacts'

const STAGE_COLORS = {
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
  NEW_LEAD: 'New Lead',
  DISCOVERY: 'Discovery',
  QUOTE: 'Quote',
  PRESENTATION: 'Presentation',
  APP: 'Application',
  SOLD: 'Sold',
  ONBOARD: 'Onboarding',
  RENEWAL: 'Renewal'
}

interface StageBadgeProps {
  contactId: string
  stage: keyof typeof STAGE_COLORS
  onUpdate?: () => void
}

export function StageBadge({ contactId, stage, onUpdate }: StageBadgeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [currentStage, setCurrentStage] = useState(stage)

  const handleStageChange = async (newStage: keyof typeof STAGE_COLORS) => {
    if (newStage === currentStage) {
      setIsOpen(false)
      return
    }
    
    setUpdating(true)
    try {
      await updateContact(contactId, { stage: newStage })
      setCurrentStage(newStage)
      setIsOpen(false)
      onUpdate?.()
    } catch (error) {
      console.error('Failed to update stage:', error)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={updating}
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${STAGE_COLORS[currentStage]} ${updating ? 'opacity-50' : ''}`}
      >
        {STAGE_LABELS[currentStage]}
        <ChevronDown className="h-3 w-3" />
      </button>
      
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full mt-1 left-0 z-20 bg-white border rounded-lg shadow-lg py-1 min-w-[150px]">
            {Object.entries(STAGE_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => handleStageChange(key as keyof typeof STAGE_COLORS)}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 ${
                  key === currentStage ? 'font-semibold bg-gray-50' : ''
                }`}
              >
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                  STAGE_COLORS[key as keyof typeof STAGE_COLORS].split(' ')[0]
                }`} />
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}