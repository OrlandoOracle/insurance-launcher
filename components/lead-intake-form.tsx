'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createContact } from '@/app/actions/contacts'
import { createTask } from '@/app/actions/tasks'

interface LeadIntakeFormProps {
  open: boolean
  onClose: () => void
}

export function LeadIntakeForm({ open, onClose }: LeadIntakeFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    howHeard: '',
    tags: '',
    ghlUrl: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // Validate
    if (!formData.firstName || !formData.lastName) {
      setError('First and last name are required')
      return
    }
    
    if (!formData.email && !formData.phone) {
      setError('Either email or phone is required')
      return
    }
    
    setLoading(true)
    
    try {
      // Normalize data
      const normalizedEmail = formData.email?.toLowerCase().trim()
      const normalizedPhone = formData.phone?.replace(/\D/g, '')
      
      // Create contact
      const tagArray = formData.tags
        ? formData.tags.split(',').map(t => t.trim()).filter(Boolean)
        : []
      
      const contact = await createContact({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: normalizedEmail || '',
        phone: normalizedPhone || '',
        howHeard: formData.howHeard.trim() || undefined,
        ghlUrl: formData.ghlUrl.trim() || undefined,
        tags: tagArray
      })
      
      // Create follow-up task
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      
      await createTask({
        contactId: contact.id,
        title: 'Call new lead',
        dueAt: tomorrow,
        source: 'SYSTEM'
      })
      
      // Success! Navigate to contact page
      onClose()
      router.push(`/leads/${contact.id}`)
    } catch (error: any) {
      console.error('Error creating contact:', error)
      if (error.message?.includes('already exists')) {
        setError(error.message)
      } else {
        setError('Failed to create contact. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Lead</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">First Name *</label>
              <Input
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="John"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Last Name *</label>
              <Input
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Smith"
              />
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@example.com"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Phone</label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(555) 123-4567"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">How Heard</label>
            <Input
              value={formData.howHeard}
              onChange={(e) => setFormData({ ...formData, howHeard: e.target.value })}
              placeholder="Facebook Ad, Referral, etc."
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Tags</label>
            <Input
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="hot-lead, facebook (comma-separated)"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">GHL URL</label>
            <Input
              type="url"
              value={formData.ghlUrl}
              onChange={(e) => setFormData({ ...formData, ghlUrl: e.target.value })}
              placeholder="https://..."
            />
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-800 p-3 rounded text-sm">
              {error}
            </div>
          )}
          
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Lead'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}