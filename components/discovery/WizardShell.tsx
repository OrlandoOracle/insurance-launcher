'use client'

import { useEffect, useCallback, useState } from 'react'
import { useDiscoveryStore } from '@/lib/discovery/store'
import { WIZARD_STEPS, WizardStep } from '@/lib/discovery/types'
import { formatDuration } from '@/lib/discovery/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { 
  Check, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight,
  Save,
  Clock,
  User
} from 'lucide-react'
import { toast } from 'sonner'

interface WizardShellProps {
  children: React.ReactNode
  onSave?: () => void
}

export function WizardShell({ children, onSave }: WizardShellProps) {
  const {
    sessionId,
    data,
    currentStep,
    setCurrentStep,
    validation,
    validateStep,
    isDirty,
    startTime
  } = useDiscoveryStore()

  const [callDuration, setCallDuration] = useState(0)
  const [isSaving, setIsSaving] = useState(false)

  // Update call duration every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startTime])

  // Auto-save every 3 seconds when dirty
  useEffect(() => {
    if (!isDirty) return

    const timeout = setTimeout(() => {
      handleSave()
    }, 3000)

    return () => clearTimeout(timeout)
  }, [isDirty, data])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return
      }

      // Enter = Next
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleNext()
      }
      // Shift+Enter = Previous
      else if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault()
        handlePrevious()
      }
      // Cmd/Ctrl+K = Jump to section
      else if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        // Open command palette (implement if needed)
      }
      // Cmd/Ctrl+S = Save
      else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentStep])

  const handleSave = useCallback(async () => {
    if (isSaving || !isDirty) return

    setIsSaving(true)
    try {
      if (onSave) {
        await onSave()
      } else {
        // Default save action
        const response = await fetch('/api/discovery/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            data,
            callDuration
          })
        })

        if (!response.ok) throw new Error('Save failed')
      }

      useDiscoveryStore.getState().markSaved()
      toast.success('Progress saved')
    } catch (error) {
      toast.error('Failed to save progress')
      console.error('Save error:', error)
    } finally {
      setIsSaving(false)
    }
  }, [sessionId, data, isDirty, isSaving, callDuration, onSave])

  const currentStepIndex = WIZARD_STEPS.findIndex(s => s.id === currentStep)

  const handleNext = () => {
    // Validate current step
    validateStep(currentStep)
    
    if (currentStepIndex < WIZARD_STEPS.length - 1) {
      setCurrentStep(WIZARD_STEPS[currentStepIndex + 1].id)
    }
  }

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(WIZARD_STEPS[currentStepIndex - 1].id)
    }
  }

  const handleStepClick = (step: WizardStep) => {
    setCurrentStep(step)
  }

  const getStepStatus = (stepId: WizardStep) => {
    if (validation[stepId] === true) return 'complete'
    if (validation[stepId] === false) return 'error'
    return 'pending'
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Sidebar - Step Navigation */}
      <div className="w-64 bg-gray-50 border-r flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg">Discovery Call</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Session: {sessionId.slice(-8)}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <nav className="space-y-1">
            {WIZARD_STEPS.map((step, index) => {
              const status = getStepStatus(step.id)
              const isCurrent = step.id === currentStep
              
              return (
                <button
                  key={step.id}
                  onClick={() => handleStepClick(step.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md flex items-center gap-2 transition-colors",
                    isCurrent && "bg-primary text-primary-foreground",
                    !isCurrent && "hover:bg-gray-100",
                    !isCurrent && status === 'error' && "text-red-600"
                  )}
                >
                  <span className="flex-shrink-0">
                    {status === 'complete' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : status === 'error' ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border-2 border-current" />
                    )}
                  </span>
                  <span className="text-sm">
                    {index + 1}. {step.label}
                  </span>
                  {step.required && (
                    <Badge variant="outline" className="ml-auto text-xs">
                      Required
                    </Badge>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="p-4 border-t">
          <Button 
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className="w-full"
            variant="outline"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : isDirty ? 'Save Progress' : 'Saved'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-sm">
                {formatDuration(callDuration)}
              </span>
            </div>
            
            {data.client.firstName && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {data.client.firstName} {data.client.lastName}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Step {currentStepIndex + 1} of {WIZARD_STEPS.length}
            </span>
            {isDirty && (
              <Badge variant="outline" className="text-xs">
                Unsaved changes
              </Badge>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {/* Footer Navigation */}
        <footer className="bg-white border-t px-6 py-4 flex items-center justify-between">
          <Button
            onClick={handlePrevious}
            disabled={currentStepIndex === 0}
            variant="outline"
            size="lg"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex items-center gap-2">
            {WIZARD_STEPS.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  index === currentStepIndex ? "bg-primary" : "bg-gray-300"
                )}
              />
            ))}
          </div>

          <Button
            onClick={handleNext}
            disabled={currentStepIndex === WIZARD_STEPS.length - 1}
            size="lg"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </footer>
      </div>
    </div>
  )
}