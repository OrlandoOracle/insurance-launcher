'use client'

import { useState, useEffect, useRef } from 'react'
import Draggable from 'react-draggable'
import { useDiscoveryStore } from '@/lib/discovery/store'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { 
  MessageSquare, 
  X, 
  Plus,
  Minimize2,
  Maximize2,
  GripVertical
} from 'lucide-react'

export function RapportPad() {
  const { data, addRapportItem } = useDiscoveryStore()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [currentNote, setCurrentNote] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Keyboard shortcut to toggle rapport pad
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault()
        setIsOpen(!isOpen)
        if (!isOpen) {
          setTimeout(() => textareaRef.current?.focus(), 100)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const handleAdd = () => {
    if (currentNote.trim()) {
      addRapportItem(currentNote)
      setCurrentNote('')
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleAdd()
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-primary text-primary-foreground rounded-full p-3 shadow-lg hover:shadow-xl transition-shadow"
        title="Open Rapport Notes (⌘R / Ctrl+R)"
      >
        <MessageSquare className="h-5 w-5" />
      </button>
    )
  }

  return (
    <Draggable
      handle=".drag-handle"
      bounds="parent"
      defaultPosition={{ x: window.innerWidth - 400, y: 100 }}
    >
      <div 
        className={cn(
          "fixed z-50 bg-white rounded-lg shadow-xl border",
          isMinimized ? "w-64" : "w-96"
        )}
      >
        {/* Header */}
        <div className="drag-handle bg-gray-50 border-b px-3 py-2 flex items-center justify-between cursor-move">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium">Rapport Notes</span>
            <Badge variant="secondary" className="text-xs">
              {data.rapport.length}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? (
                <Maximize2 className="h-3 w-3" />
              ) : (
                <Minimize2 className="h-3 w-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Input Area */}
            <div className="p-3 border-b">
              <div className="space-y-2">
                <Textarea
                  ref={textareaRef}
                  value={currentNote}
                  onChange={(e) => setCurrentNote(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type rapport note... (⌘/Ctrl+Enter to add)"
                  className="resize-none h-20"
                />
                <Button
                  onClick={handleAdd}
                  disabled={!currentNote.trim()}
                  size="sm"
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Rapport
                </Button>
              </div>
            </div>

            {/* Notes List */}
            <div className="max-h-64 overflow-y-auto p-3">
              {data.rapport.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No rapport notes yet
                </p>
              ) : (
                <div className="space-y-2">
                  {data.rapport.map((item, index) => {
                    const time = new Date(item.ts).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                    return (
                      <div
                        key={index}
                        className="text-sm p-2 bg-gray-50 rounded"
                      >
                        <div className="text-xs text-muted-foreground mb-1">
                          {time}
                        </div>
                        <div className="text-gray-700">
                          {item.text}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-3 py-2 border-t bg-gray-50">
              <p className="text-xs text-muted-foreground">
                Press ⌘R / Ctrl+R to toggle
              </p>
            </div>
          </>
        )}
      </div>
    </Draggable>
  )
}

// Missing Badge import - add this component
function Badge({ children, variant = 'default', className }: any) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
      variant === 'secondary' && "bg-gray-100 text-gray-700",
      className
    )}>
      {children}
    </span>
  )
}