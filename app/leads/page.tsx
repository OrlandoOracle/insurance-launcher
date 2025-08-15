'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Search, Phone, Mail, Eye, Copy, ExternalLink } from 'lucide-react'
import { getContacts } from '@/app/actions/contacts'
import { LeadIntakeForm } from '@/components/lead-intake-form'
import { StageBadge } from '@/components/stage-badge'
import Fuse from 'fuse.js'

export default function LeadsPage() {
  const [contacts, setContacts] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showIntakeForm, setShowIntakeForm] = useState(false)

  useEffect(() => {
    loadContacts()
  }, [])

  const loadContacts = async () => {
    setLoading(true)
    const data = await getContacts()
    setContacts(data)
    setLoading(false)
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
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

  return (
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
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No contacts found matching your search' : 'No contacts yet. Create your first lead!'}
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
                {filteredContacts.map((contact) => (
                  <TableRow key={contact.id}>
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
                    <TableCell>{contact.howHeard || '-'}</TableCell>
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
                          <a href={contact.ghlUrl} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="ghost">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
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
  )
}