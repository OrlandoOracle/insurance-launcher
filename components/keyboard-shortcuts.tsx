'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function KeyboardShortcuts() {
  const router = useRouter()

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Check for meta key (cmd on mac, ctrl on windows/linux)
      const metaKey = e.metaKey || e.ctrlKey
      
      if (metaKey) {
        return // Don't interfere with browser shortcuts
      }
      
      // Global shortcuts
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault()
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        }
      }
      
      // Navigation shortcuts (with 'g' prefix)
      if (e.key === 'g') {
        e.preventDefault()
        
        const handleSecondKey = (e2: KeyboardEvent) => {
          e2.preventDefault()
          
          switch(e2.key) {
            case 'd':
              router.push('/')
              break
            case 'l':
              router.push('/leads')
              break
            case 't':
              router.push('/tasks')
              break
            case 's':
              router.push('/settings')
              break
            case 'i':
              router.push('/import')
              break
          }
          
          window.removeEventListener('keydown', handleSecondKey)
        }
        
        window.addEventListener('keydown', handleSecondKey)
        
        // Remove listener after 2 seconds if no second key
        setTimeout(() => {
          window.removeEventListener('keydown', handleSecondKey)
        }, 2000)
      }
      
      // Quick actions
      if (e.key === 'n' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault()
        router.push('/leads/new')
      }
      
      if (e.key === 't' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault()
        const newTaskButton = document.querySelector('button:has(+ span:contains("New Task"))') as HTMLButtonElement
        if (newTaskButton) {
          newTaskButton.click()
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [router])
  
  return null
}