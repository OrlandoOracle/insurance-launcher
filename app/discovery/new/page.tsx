'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDiscoveryStore } from '@/lib/discovery/store'
import { WizardShell } from '@/components/discovery/WizardShell'
import { RapportPad } from '@/components/discovery/RapportPad'
import { PreviewPanel } from '@/components/discovery/PreviewPanel'
import {
  IntroStep,
  PurposeStep,
  ConfirmInfoStep,
  SituationStep,
  QualificationStep,
  EducationStep,
  DiscountsStep,
  HealthMedsStep,
  DoctorsStep,
  PrioritiesStep,
  DentalVisionStep,
  LifeStep,
  BudgetStep,
  ClosingStep
} from '@/components/discovery/steps'

function DiscoveryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { sessionId, currentStep, initSession, updateData } = useDiscoveryStore()
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    // Initialize a new session on mount
    if (!sessionId) {
      initSession()
    }
    
    // Pre-fill client data if provided
    const clientId = searchParams.get('clientId')
    const clientName = searchParams.get('clientName')
    
    if (clientId || clientName) {
      // Update the store with client info
      if (clientId) {
        updateData('meta.clientId', clientId)
      }
      
      if (clientName) {
        // Parse the client name
        const nameParts = clientName.split(' ')
        if (nameParts.length >= 2) {
          updateData('client.firstName', nameParts[0])
          updateData('client.lastName', nameParts.slice(1).join(' '))
        } else {
          updateData('client.firstName', clientName)
        }
      }
    }
  }, [searchParams])

  const renderStep = () => {
    switch (currentStep) {
      case 'intro':
        return <IntroStep />
      case 'purpose':
        return <PurposeStep />
      case 'confirm-info':
        return <ConfirmInfoStep />
      case 'situation':
        return <SituationStep />
      case 'qualification':
        return <QualificationStep />
      case 'education':
        return <EducationStep />
      case 'discounts':
        return <DiscountsStep />
      case 'health':
        return <HealthMedsStep />
      case 'doctors':
        return <DoctorsStep />
      case 'priorities':
        return <PrioritiesStep />
      case 'dental-vision':
        return <DentalVisionStep />
      case 'life':
        return <LifeStep />
      case 'budget':
        return <BudgetStep />
      case 'closing':
        return <ClosingStep />
      default:
        return <IntroStep />
    }
  }

  // If wizard is complete, show preview panel
  if (isComplete) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto py-8 px-4">
          <PreviewPanel />
        </div>
        <RapportPad />
      </div>
    )
  }

  return (
    <>
      <WizardShell
        onSave={async () => {
          // Custom save logic if needed
          const response = await fetch('/api/discovery/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: useDiscoveryStore.getState().sessionId,
              data: useDiscoveryStore.getState().data
            })
          })
          
          if (!response.ok) throw new Error('Save failed')
          useDiscoveryStore.getState().markSaved()
        }}
      >
        {renderStep()}
        
        {/* Complete button on last step */}
        {currentStep === 'closing' && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setIsComplete(true)}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Complete Discovery Session
            </button>
          </div>
        )}
      </WizardShell>
      
      <RapportPad />
    </>
  )
}

export default function NewDiscoveryPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading discovery session...</p>
        </div>
      </div>
    }>
      <DiscoveryContent />
    </Suspense>
  )
}