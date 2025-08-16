'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface GlobalHotkeysProps {
  onNewLead?: () => void
}

export function GlobalHotkeys({ onNewLead }: GlobalHotkeysProps) {
  const router = useRouter()

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return
      }

      // N - New Lead (only when not modified)
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        onNewLead?.()
      }

      // Cmd/Ctrl + K - Quick search (future)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        // TODO: Open search modal
      }

      // G then L - Go to Leads
      if (e.key === 'l' && window.lastKeyPressed === 'g') {
        e.preventDefault()
        router.push('/leads')
      }

      // G then T - Go to Tasks
      if (e.key === 't' && window.lastKeyPressed === 'g') {
        e.preventDefault()
        router.push('/tasks')
      }

      // G then H - Go to Home
      if (e.key === 'h' && window.lastKeyPressed === 'g') {
        e.preventDefault()
        router.push('/')
      }

      // Track last key for compound shortcuts
      window.lastKeyPressed = e.key
      setTimeout(() => {
        window.lastKeyPressed = null
      }, 1000)
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [router, onNewLead])

  return null
}

// Add type declaration for window
declare global {
  interface Window {
    lastKeyPressed: string | null
  }
}