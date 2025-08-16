'use client'

import { Button } from '@/components/ui/button'
import { useEffect } from 'react'

export default function GlobalError({ 
  error, 
  reset 
}: { 
  error: Error & { digest?: string }
  reset: () => void 
}) {
  useEffect(() => {
    // Log the error to console for debugging
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <html>
      <body className="p-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-semibold mb-2">Something went wrong</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Digest: {error?.digest ?? 'n/a'}
          </p>
          <div className="p-4 bg-gray-100 rounded mb-4 overflow-auto max-h-64">
            <pre className="text-xs font-mono">
              {error?.stack || String(error?.message ?? error)}
            </pre>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => reset()}>Try again</Button>
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </body>
    </html>
  )
}