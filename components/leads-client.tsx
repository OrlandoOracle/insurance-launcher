'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Filter, Archive, ArrowRight } from 'lucide-react'
import { getContacts } from '@/app/actions/contacts'
import { logKpi } from '@/app/actions/kpis'
import { format, differenceInDays } from 'date-fns'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LeadIntakeForm } from '@/components/lead-intake-form'
import { toast } from 'sonner'
import { StageBadge } from '@/components/stage-badge'
import { LeadDetailDrawer } from '@/components/lead/LeadDetailDrawer'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"

interface LeadsClientProps {
  initialContacts: any[]
}

export function LeadsClient({ initialContacts }: LeadsClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [contacts, setContacts] = useState(initialContacts)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [showIntakeForm, setShowIntakeForm] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

  const loadContacts = async () => {
    setLoading(true)
    const filters: any = {}
    
    if (searchQuery) {
      filters.search = searchQuery
    }
    
    if (stageFilter !== 'all') {
      filters.stage = stageFilter
    }
    
    if (sourceFilter !== 'all') {
      filters.source = sourceFilter
    }

    const data = await getContacts(filters)
    setContacts(data)
    setLoading(false)
  }

  useEffect(() => {
    // Check URL params for intake form
    if (searchParams.get('action') === 'new') {
      setShowIntakeForm(true)
      // Clear the param
      router.replace('/leads')
    }
  }, [searchParams, router])

  const handleArchive = async (id: string) => {
    try {
      // TODO: Implement archive functionality
      console.log('Archive lead:', id)
      toast.success('Archive functionality coming soon')
    } catch (error) {
      toast.error('Failed to archive lead')
    }
  }

  const handleLogKPI = async (contactId: string, type: 'CALL' | 'EMAIL', outcome?: string) => {
    try {
      await logKpi({
        contactId,
        type,
        outcome: outcome as any,
        date: new Date()
      })
      toast.success('Activity logged')
      await loadContacts()
    } catch (error) {
      toast.error('Failed to log activity')
    }
  }

  const getLastContactedDays = (lastContacted: any) => {
    if (!lastContacted) return null
    return differenceInDays(new Date(), new Date(lastContacted))
  }

  const getLastContactedColor = (days: number | null) => {
    if (days === null) return 'text-gray-400'
    if (days === 0) return 'text-green-600'
    if (days <= 3) return 'text-blue-600'
    if (days <= 7) return 'text-yellow-600'
    return 'text-red-600'
  }

  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      if (searchQuery && !`${contact.firstName} ${contact.lastName} ${contact.email} ${contact.phone}`.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      if (stageFilter !== 'all' && contact.stage !== stageFilter) {
        return false
      }
      if (sourceFilter !== 'all' && contact.source !== sourceFilter) {
        return false
      }
      return true
    })
  }, [contacts, searchQuery, stageFilter, sourceFilter])

  return (
    <>
      <div className="container mx-auto px-4 py-6 md:py-8 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Leads</h1>
          <Button onClick={() => setShowIntakeForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Lead
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <CardTitle className="text-xl">All Leads</CardTitle>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search leads..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10"
                  />
                </div>
                
                <Select value={stageFilter} onValueChange={setStageFilter}>
                  <SelectTrigger className="w-[140px] h-10">
                    <SelectValue placeholder="All Stages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    <SelectItem value="NEW">New</SelectItem>
                    <SelectItem value="WORKING">Working</SelectItem>
                    <SelectItem value="QUALIFIED">Qualified</SelectItem>
                    <SelectItem value="BOOKED">Booked</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-[140px] h-10">
                    <SelectValue placeholder="All Sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="Website">Website</SelectItem>
                    <SelectItem value="Referral">Referral</SelectItem>
                    <SelectItem value="Social Media">Social Media</SelectItem>
                    <SelectItem value="Import">Import</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">Loading leads...</div>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <div className="text-muted-foreground text-center">
                  {searchQuery || stageFilter !== 'all' || sourceFilter !== 'all' ? (
                    <>
                      <p className="text-lg font-medium">No leads found</p>
                      <p className="text-sm mt-1">Try adjusting your filters or search criteria</p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-medium">No leads yet</p>
                      <p className="text-sm mt-1">Get started by adding your first lead</p>
                      <Button onClick={() => setShowIntakeForm(true)} className="mt-4" size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Lead
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[200px]">Name</TableHead>
                      <TableHead className="w-[250px]">Contact</TableHead>
                      <TableHead className="w-[120px]">Stage</TableHead>
                      <TableHead className="w-[120px]">Source</TableHead>
                      <TableHead className="w-[140px]">Last Contact</TableHead>
                      <TableHead className="w-[120px]">Created</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {filteredContacts.map((contact) => {
                    const daysSinceContact = getLastContactedDays(contact.lastContacted)
                    
                    return (
                      <TableRow key={contact.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium py-4">
                          <button
                            onClick={() => setSelectedLeadId(contact.id)}
                            className="hover:underline text-primary text-left block truncate max-w-[180px]"
                            title={`${contact.firstName} ${contact.lastName}`}
                          >
                            {contact.firstName} {contact.lastName}
                          </button>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="space-y-1">
                            {contact.email && (
                              <div className="text-sm text-muted-foreground truncate max-w-[230px]" title={contact.email}>
                                {contact.email}
                              </div>
                            )}
                            {contact.phone && (
                              <div className="text-sm text-muted-foreground">{contact.phone}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <StageBadge stage={contact.stage || 'NEW'} />
                        </TableCell>
                        <TableCell className="py-4">
                          {contact.source && (
                            <Badge variant="outline" className="truncate max-w-[100px]">
                              {contact.source}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-4">
                          <span className={`text-sm ${getLastContactedColor(daysSinceContact)}`}>
                            {daysSinceContact === null ? 'Never' :
                             daysSinceContact === 0 ? 'Today' :
                             daysSinceContact === 1 ? 'Yesterday' :
                             `${daysSinceContact} days ago`}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground py-4">
                          <span className="text-sm">
                            {format(new Date(contact.createdAt), 'MMM d, yyyy')}
                          </span>
                        </TableCell>
                        <TableCell className="py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/leads/${contact.id}`}>
                                  <ArrowRight className="mr-2 h-4 w-4" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleLogKPI(contact.id, 'CALL')}>
                                Log Call
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleLogKPI(contact.id, 'EMAIL')}>
                                Log Email
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleArchive(contact.id)}>
                                <Archive className="mr-2 h-4 w-4" />
                                Archive
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <LeadIntakeForm 
        open={showIntakeForm} 
        onClose={() => {
          setShowIntakeForm(false)
          loadContacts()
        }} 
      />

      {selectedLeadId && (
        <LeadDetailDrawer
          leadId={selectedLeadId}
          open={!!selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
        />
      )}
    </>
  )
}