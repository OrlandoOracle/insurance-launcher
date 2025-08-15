'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createContact } from '@/app/actions/contacts'

export default function NewLeadPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    howHeard: '',
    ghlUrl: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const contact = await createContact(formData)
    router.push(`/leads/${contact.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">New Lead</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">First Name *</label>
                <Input
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Last Name *</label>
                <Input
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Email *</label>
              <Input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Phone *</label>
              <Input
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">How Heard</label>
              <Input
                placeholder="e.g., Facebook Ad, Referral, Google..."
                value={formData.howHeard}
                onChange={(e) => setFormData({ ...formData, howHeard: e.target.value })}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">GHL URL (Optional)</label>
              <Input
                type="url"
                placeholder="https://..."
                value={formData.ghlUrl}
                onChange={(e) => setFormData({ ...formData, ghlUrl: e.target.value })}
              />
            </div>
            
            <div className="flex gap-2">
              <Button type="submit">Create Lead</Button>
              <Button type="button" variant="outline" onClick={() => router.push('/leads')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}