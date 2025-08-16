'use client'

import { useDiscoveryStore } from '@/lib/discovery/store'
import { validateEmail } from '@/lib/discovery/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'

export function ClosingStep() {
  const { data, updateData } = useDiscoveryStore()

  const addTimeSlot = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const newSlot = {
      date: tomorrow.toISOString().split('T')[0],
      start: '10:00',
      end: '11:00'
    }
    updateData('nextCall.proposedSlots', [...data.nextCall.proposedSlots, newSlot])
  }

  const removeTimeSlot = (index: number) => {
    const updated = data.nextCall.proposedSlots.filter((_, i) => i !== index)
    updateData('nextCall.proposedSlots', updated)
  }

  const updateTimeSlot = (index: number, field: string, value: string) => {
    const updated = [...data.nextCall.proposedSlots]
    updated[index] = { ...updated[index], [field]: value }
    updateData('nextCall.proposedSlots', updated)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Schedule Next Call</CardTitle>
          <CardDescription>
            Book the presentation appointment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Proposed Time Slots */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Proposed appointment times *</Label>
              <Button
                type="button"
                onClick={addTimeSlot}
                size="sm"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Time Slot
              </Button>
            </div>

            {data.nextCall.proposedSlots.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No time slots added. Add at least one proposed time.
              </p>
            ) : (
              data.nextCall.proposedSlots.map((slot, index) => (
                <Card key={index} className="p-3">
                  <div className="flex items-center gap-3">
                    <Input
                      type="date"
                      value={slot.date}
                      onChange={(e) => updateTimeSlot(index, 'date', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="time"
                      value={slot.start}
                      onChange={(e) => updateTimeSlot(index, 'start', e.target.value)}
                      className="w-32"
                    />
                    <span className="text-sm">to</span>
                    <Input
                      type="time"
                      value={slot.end}
                      onChange={(e) => updateTimeSlot(index, 'end', e.target.value)}
                      className="w-32"
                    />
                    <Button
                      type="button"
                      onClick={() => removeTimeSlot(index)}
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Email for Calendar Invite */}
          <div className="space-y-2">
            <Label htmlFor="inviteEmail">Email for calendar invite *</Label>
            <Input
              id="inviteEmail"
              type="email"
              value={data.nextCall.inviteEmail}
              onChange={(e) => updateData('nextCall.inviteEmail', e.target.value)}
              placeholder="client@example.com"
            />
            {data.nextCall.inviteEmail && !validateEmail(data.nextCall.inviteEmail) && (
              <p className="text-xs text-red-500">Please enter a valid email address</p>
            )}
          </div>

          {/* Decision Maker */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="spouse"
              checked={data.nextCall.spouseJoining}
              onCheckedChange={(checked) => 
                updateData('nextCall.spouseJoining', checked as boolean)
              }
            />
            <Label htmlFor="spouse">
              Will spouse/partner be joining for decision-making?
            </Label>
          </div>

          {/* Screen Share */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="screenshare"
              checked={data.nextCall.screenShareOk}
              onCheckedChange={(checked) => 
                updateData('nextCall.screenShareOk', checked as boolean)
              }
            />
            <Label htmlFor="screenshare">
              Confirmed they can join a screen share (Zoom/Teams)
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Final Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
          <CardDescription>
            Any other important details for the presentation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Budget */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="budget">Budget expectations (if discussed)</Label>
              <Input
                id="budget"
                value={data.budget.text}
                onChange={(e) => updateData('budget.text', e.target.value)}
                placeholder="Looking to stay under $500/month, flexible on deductible..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budgetMin">Min budget (optional)</Label>
                <Input
                  id="budgetMin"
                  type="number"
                  value={data.budget.min || ''}
                  onChange={(e) => updateData('budget.min', 
                    e.target.value ? parseInt(e.target.value) : null
                  )}
                  placeholder="$0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budgetMax">Max budget (optional)</Label>
                <Input
                  id="budgetMax"
                  type="number"
                  value={data.budget.max || ''}
                  onChange={(e) => updateData('budget.max', 
                    e.target.value ? parseInt(e.target.value) : null
                  )}
                  placeholder="$0"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-green-800">Ready to Complete</CardTitle>
          <CardDescription className="text-green-700">
            Review the information and save the discovery session
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>✓ Client: {data.client.firstName} {data.client.lastName}</p>
            <p>✓ Location: {data.client.zip}, {data.client.state}</p>
            <p>✓ Next call: {data.nextCall.proposedSlots.length} time slot(s) proposed</p>
            <p>✓ Email: {data.nextCall.inviteEmail}</p>
            {data.rapport.length > 0 && (
              <p>✓ Rapport notes: {data.rapport.length} items captured</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}