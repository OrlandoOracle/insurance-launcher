'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ActivityType } from '@prisma/client'
type Contact = any
import { logKpi } from '@/app/actions/kpis'
import { toast } from 'sonner'
import { Search, X } from 'lucide-react'

interface KpiLogModalProps {
  type: ActivityType
  open: boolean
  onOpenChange: (open: boolean) => void
  onLogged?: () => void
}

export function KpiLogModal({ type, open, onOpenChange, onLogged }: KpiLogModalProps) {
  const [count, setCount] = useState(1)
  const [revenue, setRevenue] = useState('')
  const [notes, setNotes] = useState('')
  const [voicemail, setVoicemail] = useState(false)
  const [smsSent, setSmsSent] = useState(false)
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([])
  const [contactSearch, setContactSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Contact[]>([])
  const [searching, setSearching] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16))

  useEffect(() => {
    if (contactSearch.length > 1) {
      searchContacts()
    } else {
      setSearchResults([])
    }
  }, [contactSearch])

  const searchContacts = async () => {
    setSearching(true)
    try {
      const response = await fetch(`/api/contacts/lookup?q=${encodeURIComponent(contactSearch)}`)
      if (response.ok) {
        const contacts = await response.json()
        setSearchResults(contacts)
      }
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setSearching(false)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const result = await logKpi({
        type,
        count: type !== ActivityType.REVENUE ? count : undefined,
        revenue: type === ActivityType.REVENUE ? parseFloat(revenue) : undefined,
        contactIds: selectedContacts.map(c => c.id),
        notes,
        voicemail: type === ActivityType.DIAL ? voicemail : undefined,
        smsSent: type === ActivityType.DIAL ? smsSent : undefined,
        date: new Date(date)
      })

      if (result.success) {
        toast.success(`${type} logged successfully`)
        onLogged?.()
        onOpenChange(false)
        resetForm()
      } else {
        toast.error('Failed to log KPI')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setCount(1)
    setRevenue('')
    setNotes('')
    setVoicemail(false)
    setSmsSent(false)
    setSelectedContacts([])
    setContactSearch('')
    setSearchResults([])
    setDate(new Date().toISOString().slice(0, 16))
  }

  const addContact = (contact: Contact) => {
    if (!selectedContacts.find(c => c.id === contact.id)) {
      setSelectedContacts([...selectedContacts, contact])
    }
    setContactSearch('')
    setSearchResults([])
  }

  const removeContact = (contactId: string) => {
    setSelectedContacts(selectedContacts.filter(c => c.id !== contactId))
  }

  const getTitle = () => {
    switch (type) {
      case ActivityType.DIAL:
        return 'Log Dials'
      case ActivityType.CONNECT:
        return 'Log Connects'
      case ActivityType.CLOSE:
        return 'Log Closes'
      case ActivityType.REVENUE:
        return 'Log Revenue'
      default:
        return 'Log Activity'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {type !== ActivityType.REVENUE ? (
            <div>
              <Label htmlFor="count">Count</Label>
              <Input
                id="count"
                type="number"
                min="1"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value) || 1)}
              />
            </div>
          ) : (
            <div>
              <Label htmlFor="revenue">Revenue Amount</Label>
              <Input
                id="revenue"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
              />
            </div>
          )}

          <div>
            <Label>Associated Leads (Optional)</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-auto">
                {searchResults.map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => addContact(contact)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                  >
                    {contact.firstName} {contact.lastName}
                    {contact.email && <span className="text-gray-500 ml-2">{contact.email}</span>}
                  </button>
                ))}
              </div>
            )}

            {selectedContacts.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedContacts.map(contact => (
                  <div key={contact.id} className="bg-gray-100 px-2 py-1 rounded-md flex items-center gap-1 text-sm">
                    <span>{contact.firstName} {contact.lastName}</span>
                    <button onClick={() => removeContact(contact.id)}>
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {type === ActivityType.DIAL && (
            <>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="voicemail"
                  checked={voicemail}
                  onCheckedChange={(checked) => setVoicemail(checked as boolean)}
                />
                <Label htmlFor="voicemail">Left voicemail</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sms"
                  checked={smsSent}
                  onCheckedChange={(checked) => setSmsSent(checked as boolean)}
                />
                <Label htmlFor="sms">Sent text message</Label>
              </div>
            </>
          )}

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="date">Date & Time</Label>
            <Input
              id="date"
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Logging...' : 'Log'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}