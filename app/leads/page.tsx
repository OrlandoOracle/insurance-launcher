'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Phone, Mail, Eye, Copy, ExternalLink, Filter, X } from 'lucide-react'
import { getContacts, getAllTags } from '@/app/actions/contacts'
import { LeadIntakeForm } from '@/components/lead-intake-form'
import { StageBadge } from '@/components/stage-badge'
import { GlobalHotkeys } from '@/components/global-hotkeys'
import { toast } from 'sonner'
import Fuse from 'fuse.js'

const STAGE_OPTIONS = [
  { value: 'NEW', label: 'New' },
  { value: 'WORKING', label: 'Working' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'BOOKED', label: 'Booked' },
  { value: 'NO_SHOW', label: 'No Show' },
  { value: 'NURTURE', label: 'Nurture' },
  { value: 'CLOSED', label: 'Closed' }
]

export default function LeadsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [contacts, setContacts] = useState<any[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [selectedStages, setSelectedStages] = useState<string[]>(() => {
    const stages = searchParams.get('stages')
    return stages ? stages.split(',') : []
  })
  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    const tags = searchParams.get('tags')
    return tags ? tags.split(',') : []
  })
  const [noNextAction, setNoNextAction] = useState(searchParams.get('noNextAction') === 'true')
  const [loading, setLoading] = useState(true)
  const [showIntakeForm, setShowIntakeForm] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [tagSearch, setTagSearch] = useState('')

  useEffect(() => {
    loadContacts()
    loadTags()
  }, [selectedStages, selectedTags, noNextAction])

  useEffect(() => {
    // Update URL params when filters change
    const params = new URLSearchParams()
    if (searchQuery) params.set('search', searchQuery)
    if (selectedStages.length > 0) params.set('stages', selectedStages.join(','))
    if (selectedTags.length > 0) params.set('tags', selectedTags.join(','))
    if (noNextAction) params.set('noNextAction', 'true')
    
    const newUrl = params.toString() ? `?${params.toString()}` : '/leads'
    router.replace(newUrl, { scroll: false })
  }, [searchQuery, selectedStages, selectedTags, noNextAction])

  const loadContacts = async () => {
    setLoading(true)
    try {
      const data = await getContacts(
        undefined,
        selectedStages.length > 0 ? selectedStages as any : undefined,
        selectedTags.length > 0 ? selectedTags : undefined,
        noNextAction
      )
      setContacts(data)
    } catch (error) {
      console.error('Error loading contacts:', error)
      toast.error('Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }

  const loadTags = async () => {
    try {
      const tags = await getAllTags()
      setAllTags(tags)
    } catch (error) {
      console.error('Error loading tags:', error)
    }
  }

  const fuse = useMemo(() => {
    return new Fuse(contacts, {
      keys: ['firstName', 'lastName', 'email', 'phone', 'howHeard'],
      threshold: 0.3
    })
  }, [contacts])

  const filteredContacts = useMemo(() => {
    if (!searchQuery) return contacts
    return fuse.search(searchQuery).map(result => result.item)
  }, [searchQuery, contacts, fuse])

  const filteredTags = useMemo(() => {
    if (!tagSearch) return allTags
    return allTags.filter(tag => 
      tag.toLowerCase().includes(tagSearch.toLowerCase())
    )
  }, [tagSearch, allTags])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const exportToCSV = () => {
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'How Heard', 'Stage', 'Tags']
    const rows = filteredContacts.map(c => [
      c.firstName,
      c.lastName,
      c.email,
      c.phone,
      c.howHeard || '',
      c.stage,
      JSON.parse(c.tags || '[]').join(';')
    ])
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const toggleStage = (stage: string) => {
    setSelectedStages(prev =>
      prev.includes(stage)
        ? prev.filter(s => s !== stage)
        : [...prev, stage]
    )
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const clearFilters = () => {
    setSelectedStages([])
    setSelectedTags([])
    setNoNextAction(false)
    setSearchQuery('')
  }

  const hasActiveFilters = selectedStages.length > 0 || selectedTags.length > 0 || noNextAction

  return (
    <>
    <GlobalHotkeys onNewLead={() => setShowIntakeForm(true)} />
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Leads</h1>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline">
            Export CSV
          </Button>
          <Button onClick={() => setShowIntakeForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Lead
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by name, email, phone, or source..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant={hasActiveFilters ? "default" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters {hasActiveFilters && `(${selectedStages.length + selectedTags.length + (noNextAction ? 1 : 0)})`}
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="border-t pt-4 space-y-4">
                {/* Stage Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Stage</label>
                  <div className="flex flex-wrap gap-2">
                    {STAGE_OPTIONS.map(stage => (
                      <Button
                        key={stage.value}
                        size="sm"
                        variant={selectedStages.includes(stage.value) ? "default" : "outline"}
                        onClick={() => toggleStage(stage.value)}
                      >
                        {stage.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Tag Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Tags</label>
                  {allTags.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No tags available</p>
                  ) : (
                    <>
                      <Input
                        placeholder="Search tags..."
                        value={tagSearch}
                        onChange={(e) => setTagSearch(e.target.value)}
                        className="mb-2 max-w-xs"
                      />
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                        {filteredTags.map(tag => (
                          <Badge
                            key={tag}
                            variant={selectedTags.includes(tag) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleTag(tag)}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* No Next Action Filter */}
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={noNextAction}
                      onChange={(e) => setNoNextAction(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm font-medium">No Next Action (needs follow-up)</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery || hasActiveFilters ? 'No contacts found matching your filters' : 'No contacts yet. Create your first lead!'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>How Heard</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((contact) => {
                  const hasNoTasks = !contact.tasks || contact.tasks.length === 0
                  
                  return (
                    <TableRow 
                      key={contact.id}
                      className={hasNoTasks ? 'border-l-4 border-amber-300' : ''}
                    >
                      <TableCell className="font-medium">
                        {contact.firstName} {contact.lastName}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{contact.phone}</span>
                          {contact.phone && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(contact.phone)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {contact.email && (
                          <a href={`mailto:${contact.email}`} className="hover:underline">
                            {contact.email}
                          </a>
                        )}
                      </TableCell>
                      <TableCell>{contact.source || contact.howHeard || '-'}</TableCell>
                      <TableCell>
                        <StageBadge 
                          contactId={contact.id} 
                          stage={contact.stage}
                          onUpdate={loadContacts}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Link href={`/leads/${contact.id}`}>
                            <Button size="sm" variant="ghost">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {contact.ghlUrl && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={async () => {
                                // Open immediately in new tab
                                window.open(contact.ghlUrl, '_blank', 'noopener,noreferrer')
                                
                                // Try to also open in Chrome profile
                                try {
                                  const res = await fetch('/api/open-ghl', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ url: contact.ghlUrl })
                                  })
                                  const data = await res.json()
                                  if (!data.ok) {
                                    console.warn('[GHL Link] Profile launch failed:', data.error)
                                  }
                                } catch (err) {
                                  console.error('[GHL Link] Error:', err)
                                }
                              }}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <LeadIntakeForm 
        open={showIntakeForm} 
        onClose={() => {
          setShowIntakeForm(false)
          loadContacts()
        }} 
      />
    </div>
    </>
  )
}