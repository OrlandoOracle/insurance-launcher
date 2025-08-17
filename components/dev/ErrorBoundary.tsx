'use client'
import React from 'react'

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }
  
  static getDerivedStateFromError(error: Error) { 
    return { error } 
  }
  
  componentDidCatch(err: Error, info: any) { 
    console.error('[Dashboard ErrorBoundary]', err, info) 
  }
  
  render() {
    if (this.state.error) {
      return (
        <pre className="p-4 text-sm text-red-600 whitespace-pre-wrap">
          {String(this.state.error.stack || this.state.error.message)}
        </pre>
      )
    }
    return this.props.children as any
  }
}