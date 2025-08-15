'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'

interface AIPromptModalProps {
  type: 'summary' | 'objection'
  contact: any
  onClose: () => void
}

export function AIPromptModal({ type, contact, onClose }: AIPromptModalProps) {
  const [copied, setCopied] = useState(false)
  const [objectionType, setObjectionType] = useState('price')
  const [callNotes, setCallNotes] = useState('')

  const generateSummaryPrompt = () => {
    return `Summarize this call into a concise CRM block using YAML keys:
contact: ${contact.firstName} ${contact.lastName}, phone: ${contact.phone}, email: ${contact.email}
stage: NEW_LEAD
outcomes: [SPECIFY_OUTCOME]
Please produce:
- summary: 2-4 bullet lines
- key_details: [bullets]
- objections: [bullets]
- next_actions: [bullets]
- scheduling: {if any}
Source notes/transcript:
---
${callNotes || '[PASTE YOUR CALL NOTES OR TRANSCRIPT HERE]'}`
  }

  const generateObjectionPrompt = () => {
    return `Based on this prospect's context:
- persona: ${contact.howHeard || 'Unknown source'}
- product: ACA primary with optional secondary
Provide 3 succinct objection responses for: ${objectionType}
Include: power line + brief rationale + next-step question.`
  }

  const promptText = type === 'summary' ? generateSummaryPrompt() : generateObjectionPrompt()

  const copyToClipboard = () => {
    navigator.clipboard.writeText(promptText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {type === 'summary' ? 'Call Summary Prompt' : 'Objection Helper Prompt'}
          </DialogTitle>
        </DialogHeader>
        
        {type === 'summary' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Call Notes (Optional)</label>
              <textarea
                className="w-full h-32 p-2 border rounded mt-1"
                placeholder="Paste your call notes or transcript here..."
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
              />
            </div>
          </div>
        )}
        
        {type === 'objection' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Objection Type</label>
              <select
                className="w-full p-2 border rounded mt-1"
                value={objectionType}
                onChange={(e) => setObjectionType(e.target.value)}
              >
                <option value="price">Price/Cost</option>
                <option value="time">Not a good time</option>
                <option value="trust">Trust/Legitimacy</option>
                <option value="need">Don't need insurance</option>
                <option value="existing">Already have coverage</option>
                <option value="think">Need to think about it</option>
              </select>
            </div>
          </div>
        )}
        
        <div>
          <label className="text-sm font-medium">Generated Prompt</label>
          <div className="relative mt-1">
            <pre className="p-4 bg-gray-50 rounded border text-sm whitespace-pre-wrap">
              {promptText}
            </pre>
            <Button
              size="sm"
              variant="outline"
              className="absolute top-2 right-2"
              onClick={copyToClipboard}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}