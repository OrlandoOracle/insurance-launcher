'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { createContact } from '@/app/actions/contacts'
import { createTask } from '@/app/actions/tasks'
import { toast } from 'sonner'
import { Chrome, ClipboardPaste, AlertCircle, Calendar, Phone, Clock, CheckCircle } from 'lucide-react'
import { getTomorrowAt10AM, getTodayAt5PMOrTomorrow10AM, getDateAtTime, formatTaskDueDate } from '@/lib/time'

interface LeadIntakeFormProps {
  open: boolean
  onClose: () => void
}

interface DuplicateContact {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  stage: string
}

interface TaskOption {
  id: string
  title: string
  dueAt: Date | null
  description: string
}

export function LeadIntakeForm({ open, onClose }: LeadIntakeFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [phoneError, setPhoneError] = useState('')
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    howHeard: '',
    tags: '',
    ghlUrl: ''
  })

  // GHL button state
  const [showPasteButton, setShowPasteButton] = useState(false)
  const [ghlOpened, setGhlOpened] = useState(false)

  // Duplicate check state
  const [duplicate, setDuplicate] = useState<DuplicateContact | null>(null)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [forceCreate, setForceCreate] = useState(false)

  // Next task picker state
  const [showTaskPicker, setShowTaskPicker] = useState(false)
  const [selectedTaskOption, setSelectedTaskOption] = useState('call-tomorrow')
  const [createdContactId, setCreatedContactId] = useState<string | null>(null)

  const taskOptions: TaskOption[] = [
    {
      id: 'call-tomorrow',
      title: 'Call',
      dueAt: getTomorrowAt10AM(),
      description: `Call ${formatTaskDueDate(getTomorrowAt10AM())}`
    },
    {
      id: 'call-today',
      title: 'Call',
      dueAt: getTodayAt5PMOrTomorrow10AM(),
      description: `Call ${formatTaskDueDate(getTodayAt5PMOrTomorrow10AM())}`
    },
    {
      id: 'follow-up-3-days',
      title: 'Follow up',
      dueAt: getDateAtTime(3, 10),
      description: `Follow up ${formatTaskDueDate(getDateAtTime(3, 10))}`
    },
    {
      id: 'no-task',
      title: '',
      dueAt: null,
      description: 'No task needed'
    }
  ]

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        howHeard: '',
        tags: '',
        ghlUrl: ''
      })
      setShowPasteButton(false)
      setGhlOpened(false)
      setDuplicate(null)
      setShowDuplicateModal(false)
      setForceCreate(false)
      setShowTaskPicker(false)
      setCreatedContactId(null)
      setPhoneError('')
      setSelectedTaskOption('call-tomorrow')
    }
  }, [open])

  const handleOpenGHL = async () => {
    const fallbackUrl =
      process.env.NEXT_PUBLIC_GHL_OPPS_URL ||
      "https://app.gohighlevel.com/v2/location/NNo96bNDoBnBlHRQwsf4/opportunities/list";

    // 1) Always open a tab immediately so the user isn't blocked
    const win = window.open(fallbackUrl, "_blank", "noopener,noreferrer");
    if (!win) {
      console.warn("[OpenGHL] Popup blocked; user may need to allow popups");
      toast.warning("Popup blocked - please allow popups for this site");
    } else {
      toast.success("Opening GHL...");
    }

    setShowPasteButton(true);
    setGhlOpened(true);

    // 2) Fire-and-forget server launch (attempt profile-specific open, bring-to-front)
    try {
      const res = await fetch("/api/open-ghl/launch", { method: "POST" });
      const data = await res.json();

      if (data.ok) {
        console.info("[OpenGHL] ✅ Launched via:", data.via, "profile:", data.profile);
        toast.success(`Chrome opened with profile: ${data.profile}`);
      } else {
        console.warn("[OpenGHL] ⚠️ Launch fallback:", data.fallback, data.reason || "");
        if (data.profiles?.length) {
          console.info("[OpenGHL] 📋 Detected Chrome profiles:", data.profiles);
          console.info("[OpenGHL] 💡 Current setting:", data.profile);
          console.info("[OpenGHL] ℹ️ To use a different profile, update in Settings");
        }
        if (data.message) {
          console.info("[OpenGHL] 💬", data.message);
          toast.info(data.message);
        }
      }
    } catch (err) {
      console.error("[OpenGHL] ❌ Server launch error:", err);
      // Tab is already open, so just log the error
    }
  }

  const handlePasteGHL = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText()
      
      let data: any
      try {
        data = JSON.parse(clipboardText)
      } catch (e) {
        toast.error("Clipboard content isn't valid JSON. Make sure you used your GHL copy button.")
        return
      }
      
      // Debug log to see what's in the clipboard
      console.log('[Paste GHL] Clipboard data:', data)
      
      // Fill form with pasted data
      setFormData(prev => ({
        ...prev,
        firstName: data.firstName || prev.firstName,
        lastName: data.lastName || prev.lastName,
        email: data.email || prev.email,
        phone: data.phone || prev.phone,
        ghlUrl: data.contactUrl || prev.ghlUrl  // Map contactUrl to ghlUrl
      }))
      
      // Log what we set
      console.log('[Paste GHL] GHL URL set to:', data.contactUrl || 'unchanged')
      
      toast.success('Contact details pasted from GHL')
      
      // Check for duplicates after paste
      if (data.email || data.phone) {
        await checkForDuplicate(data.email, data.phone)
      }
    } catch (error) {
      console.error('Error reading clipboard:', error)
      toast.error('Failed to read clipboard. Make sure you copied from GHL.')
    }
  }

  const checkForDuplicate = async (email?: string, phone?: string) => {
    if (!email && !phone) return
    
    try {
      const response = await fetch('/api/contacts/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone })
      })
      
      const result = await response.json()
      
      if (result.found && result.contact) {
        setDuplicate(result.contact)
        setShowDuplicateModal(true)
      }
    } catch (error) {
      console.error('Error checking for duplicate:', error)
    }
  }

  const handleOpenExisting = () => {
    if (duplicate) {
      onClose()
      router.push(`/leads/${duplicate.id}`)
    }
  }

  const handleContinueAnyway = () => {
    setShowDuplicateModal(false)
    setForceCreate(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPhoneError('')
    
    // Validate phone is not empty
    if (!formData.phone) {
      setPhoneError('Phone number is required')
      return
    }
    
    // Validate other required fields
    if (!formData.firstName || !formData.lastName) {
      toast.error('First and last name are required')
      return
    }
    
    if (!formData.email && !formData.phone) {
      toast.error('Either email or phone is required')
      return
    }
    
    setLoading(true)
    
    try {
      // Normalize data
      const normalizedEmail = formData.email?.toLowerCase().trim()
      const normalizedPhone = formData.phone?.replace(/\D/g, '')
      
      // Add batch tag
      const now = new Date()
      const batchTag = `batch:${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
      
      // Create contact
      const tagArray = formData.tags
        ? formData.tags.split(',').map(t => t.trim()).filter(Boolean)
        : []
      
      // Add batch tag if not already present
      if (!tagArray.includes(batchTag)) {
        tagArray.push(batchTag)
      }
      
      const contact = await createContact({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: normalizedEmail || '',
        phone: normalizedPhone || '',
        source: formData.howHeard.trim() || undefined,
        ghlUrl: formData.ghlUrl.trim() || undefined,
        tags: tagArray
      })
      
      // Store contact ID and show task picker
      setCreatedContactId(contact.id)
      setShowTaskPicker(true)
      
      toast.success(`Lead created: ${formData.firstName} ${formData.lastName}`)
    } catch (error: any) {
      console.error('Error creating contact:', error)
      if (error.message?.includes('already exists')) {
        // Check for duplicate and show modal
        await checkForDuplicate(formData.email, formData.phone)
      } else {
        toast.error('Failed to create contact')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleTaskCreate = async () => {
    if (!createdContactId) return
    
    const selectedOption = taskOptions.find(opt => opt.id === selectedTaskOption)
    
    if (selectedOption && selectedOption.dueAt && selectedOption.title) {
      try {
        await createTask({
          contactId: createdContactId,
          title: selectedOption.title,
          dueAt: selectedOption.dueAt,
          source: 'SYSTEM'
        })
        toast.success('Task created')
      } catch (error) {
        console.error('Error creating task:', error)
        toast.error('Failed to create task')
      }
    }
    
    // Navigate to contact profile tab
    onClose()
    router.push(`/leads/${createdContactId}`)
  }

  // Show duplicate modal
  if (showDuplicateModal && duplicate) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Duplicate Contact Found
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="font-medium text-sm">Existing contact:</p>
              <p className="text-sm mt-1">
                {duplicate.firstName} {duplicate.lastName}
              </p>
              {duplicate.email && (
                <p className="text-sm text-muted-foreground">{duplicate.email}</p>
              )}
              {duplicate.phone && (
                <p className="text-sm text-muted-foreground">{duplicate.phone}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">Stage: {duplicate.stage}</p>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleOpenExisting} className="flex-1">
                Open Existing Contact
              </Button>
              <Button onClick={handleContinueAnyway} variant="outline" className="flex-1">
                Continue Anyway
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Show task picker after successful creation
  if (showTaskPicker && createdContactId) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Lead Created Successfully!
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {formData.firstName} {formData.lastName} has been added to your leads.
              What would you like to do next?
            </p>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Next Action</label>
              <RadioGroup value={selectedTaskOption} onValueChange={setSelectedTaskOption}>
                {taskOptions.map(option => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.id} id={option.id} />
                    <Label htmlFor={option.id} className="flex items-center gap-2 cursor-pointer">
                      {option.id !== 'no-task' && (
                        <>
                          {option.id.includes('call') ? <Phone className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                        </>
                      )}
                      {option.description}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            
            <Button onClick={handleTaskCreate} className="w-full">
              Continue to Contact Profile
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Main form
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>New Lead</span>
            <div className="flex gap-2">
              {!showPasteButton ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleOpenGHL}
                  className="gap-2"
                >
                  <Chrome className="h-4 w-4" />
                  Open GHL
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handlePasteGHL}
                  className="gap-2"
                >
                  <ClipboardPaste className="h-4 w-4" />
                  Paste GHL
                </Button>
              )}
            </div>
          </DialogTitle>
          {ghlOpened && (
            <p className="text-xs text-muted-foreground">Switched to Paste mode</p>
          )}
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">First Name *</label>
              <Input
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="First name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Last Name *</label>
              <Input
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Last name"
              />
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Email address"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Phone *</label>
            <Input
              value={formData.phone}
              onChange={(e) => {
                setFormData({ ...formData, phone: e.target.value })
                setPhoneError('')
              }}
              placeholder="Phone number"
              className={phoneError ? 'border-red-500' : ''}
            />
            {phoneError && (
              <p className="text-sm text-red-600 mt-1">{phoneError}</p>
            )}
          </div>
          
          <div>
            <label className="text-sm font-medium">How Heard</label>
            <Input
              value={formData.howHeard}
              onChange={(e) => setFormData({ ...formData, howHeard: e.target.value })}
              placeholder="How they heard about you"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Tags</label>
            <Input
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="Tags (comma-separated)"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Batch tag will be added automatically
            </p>
          </div>
          
          <div>
            <label className="text-sm font-medium">GHL URL</label>
            <Input
              type="url"
              value={formData.ghlUrl}
              onChange={(e) => setFormData({ ...formData, ghlUrl: e.target.value })}
              placeholder="GHL contact URL"
            />
          </div>
          
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