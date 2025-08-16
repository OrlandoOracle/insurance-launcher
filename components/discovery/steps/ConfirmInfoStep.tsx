'use client'

import { useEffect } from 'react'
import { useDiscoveryStore } from '@/lib/discovery/store'
import { validateZip, getStateFromZip } from '@/lib/discovery/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Plus, Trash2 } from 'lucide-react'

export function ConfirmInfoStep() {
  const { data, updateData } = useDiscoveryStore()

  useEffect(() => {
    // Auto-detect state from ZIP
    if (data.client.zip && validateZip(data.client.zip)) {
      const state = getStateFromZip(data.client.zip)
      if (state && state !== data.client.state) {
        updateData('client.state', state)
      }
    }
  }, [data.client.zip])

  const addHouseholdMember = () => {
    const newMember = {
      firstName: '',
      lastName: '',
      dob: '',
      relationship: ''
    }
    updateData('client.household', [...data.client.household, newMember])
  }

  const removeHouseholdMember = (index: number) => {
    const updated = data.client.household.filter((_, i) => i !== index)
    updateData('client.household', updated)
  }

  const updateHouseholdMember = (index: number, field: string, value: string) => {
    const updated = [...data.client.household]
    updated[index] = { ...updated[index], [field]: value }
    updateData('client.household', updated)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Confirm Contact Information</CardTitle>
          <CardDescription>
            Verify location and household details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Primary Client */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={data.client.firstName}
                onChange={(e) => updateData('client.firstName', e.target.value)}
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={data.client.lastName}
                onChange={(e) => updateData('client.lastName', e.target.value)}
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dob">Date of Birth</Label>
            <Input
              id="dob"
              type="date"
              value={data.client.dob}
              onChange={(e) => updateData('client.dob', e.target.value)}
            />
          </div>

          {/* Location */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP Code *</Label>
              <Input
                id="zip"
                value={data.client.zip}
                onChange={(e) => updateData('client.zip', e.target.value)}
                placeholder="90210"
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                value={data.client.state}
                onChange={(e) => updateData('client.state', e.target.value)}
                placeholder="CA"
                maxLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="county">County</Label>
              <Input
                id="county"
                value={data.client.county}
                onChange={(e) => updateData('client.county', e.target.value)}
                placeholder="Los Angeles"
              />
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={data.client.contact.phone}
                onChange={(e) => updateData('client.contact.phone', e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={data.client.contact.email}
                onChange={(e) => updateData('client.contact.email', e.target.value)}
                placeholder="john@example.com"
              />
            </div>
          </div>

          {/* Coverage Type */}
          <div className="space-y-2">
            <Label>Looking for coverage for:</Label>
            <RadioGroup
              value={data.client.household.length > 0 ? 'household' : 'self'}
              onValueChange={(value) => {
                if (value === 'self' && data.client.household.length > 0) {
                  updateData('client.household', [])
                }
              }}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="self" id="self" />
                <Label htmlFor="self">Just myself</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="household" id="household" />
                <Label htmlFor="household">My household/family</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Household Members */}
          {data.client.household.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Household Members</Label>
                <Button
                  type="button"
                  onClick={addHouseholdMember}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </div>
              
              {data.client.household.map((member, index) => (
                <Card key={index} className="p-3">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Member {index + 1}</span>
                      <Button
                        type="button"
                        onClick={() => removeHouseholdMember(index)}
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="First Name"
                        value={member.firstName}
                        onChange={(e) => updateHouseholdMember(index, 'firstName', e.target.value)}
                      />
                      <Input
                        placeholder="Last Name"
                        value={member.lastName}
                        onChange={(e) => updateHouseholdMember(index, 'lastName', e.target.value)}
                      />
                      <Input
                        type="date"
                        placeholder="Date of Birth"
                        value={member.dob}
                        onChange={(e) => updateHouseholdMember(index, 'dob', e.target.value)}
                      />
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={member.relationship}
                        onChange={(e) => updateHouseholdMember(index, 'relationship', e.target.value)}
                      >
                        <option value="">Relationship</option>
                        <option value="spouse">Spouse</option>
                        <option value="child">Child</option>
                        <option value="dependent">Dependent</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {data.client.household.length === 0 && (
        <Button
          onClick={addHouseholdMember}
          variant="outline"
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Household Members
        </Button>
      )}
    </div>
  )
}