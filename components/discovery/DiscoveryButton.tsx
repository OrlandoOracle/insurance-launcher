'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Search, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface DiscoveryButtonProps {
  clientId: string
  clientName?: string
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  size?: 'sm' | 'default' | 'lg'
  className?: string
}

export function DiscoveryButton({ 
  clientId, 
  clientName,
  variant = 'default',
  size = 'sm',
  className
}: DiscoveryButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleClick = useCallback(async () => {
    try {
      setLoading(true)
      
      // Check if a session already exists
      const res = await fetch(`/api/discovery/by-client/${clientId}`, { 
        cache: 'no-store' 
      })
      
      if (!res.ok) {
        throw new Error('Failed to check discovery session')
      }
      
      const data = await res.json()

      let url: string
      
      if (data.exists && data.sessionId) {
        // Resume existing session
        url = `/discovery/${data.sessionId}`
        toast.success('Resuming existing discovery session')
      } else {
        // Start new session with client info
        const nameQS = clientName 
          ? `&clientName=${encodeURIComponent(clientName)}` 
          : ''
        url = `/discovery/new?clientId=${encodeURIComponent(clientId)}${nameQS}`
        toast.success('Starting new discovery session')
      }

      // Open in new tab
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer')
      
      if (!newWindow) {
        // Fallback if popup was blocked
        toast.error('Popup blocked. Please allow popups for this site.')
      }
      
    } catch (error: any) {
      console.error('[DiscoveryButton] Error:', error)
      toast.error(error?.message ?? 'Unable to open Discovery tool')
    } finally {
      setLoading(false)
    }
  }, [clientId, clientName])

  return (
    <Button 
      onClick={handleClick} 
      disabled={loading}
      variant={variant}
      size={size}
      className={className}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Opening...
        </>
      ) : (
        <>
          <Search className="mr-2 h-4 w-4" />
          Discovery
        </>
      )}
    </Button>
  )
}