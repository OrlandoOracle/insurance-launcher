'use client'

import { useDiscoveryStore } from '@/lib/discovery/store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'

export function HealthMedsStep() {
  const { data, updateData } = useDiscoveryStore()

  const addMedication = () => {
    const newMed = { name: '', dose: '', frequency: '', purpose: '' }
    updateData('health.medications', [...data.health.medications, newMed])
  }

  const removeMedication = (index: number) => {
    const updated = data.health.medications.filter((_, i) => i !== index)
    updateData('health.medications', updated)
  }

  const updateMedication = (index: number, field: string, value: string) => {
    const updated = [...data.health.medications]
    updated[index] = { ...updated[index], [field]: value }
    updateData('health.medications', updated)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Health Information</CardTitle>
          <CardDescription>
            Pre-existing conditions and medications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="conditions">Pre-existing conditions</Label>
            <Textarea
              id="conditions"
              value={data.health.conditions.join(', ')}
              onChange={(e) => {
                const conditions = e.target.value
                  .split(',')
                  .map(c => c.trim())
                  .filter(Boolean)
                updateData('health.conditions', conditions)
              }}
              placeholder="Diabetes, High blood pressure, Asthma... (comma-separated)"
              className="h-20"
            />
            <p className="text-xs text-muted-foreground">
              Enter conditions separated by commas
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Current Medications</Label>
              <Button
                type="button"
                onClick={addMedication}
                size="sm"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Medication
              </Button>
            </div>

            {data.health.medications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No medications listed</p>
            ) : (
              data.health.medications.map((med, index) => (
                <Card key={index} className="p-3">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Medication {index + 1}</span>
                      <Button
                        type="button"
                        onClick={() => removeMedication(index)}
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Medication name"
                        value={med.name}
                        onChange={(e) => updateMedication(index, 'name', e.target.value)}
                      />
                      <Input
                        placeholder="Dose (e.g., 10mg)"
                        value={med.dose}
                        onChange={(e) => updateMedication(index, 'dose', e.target.value)}
                      />
                      <Input
                        placeholder="Frequency (e.g., 2x daily)"
                        value={med.frequency}
                        onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                      />
                      <Input
                        placeholder="Purpose/Condition"
                        value={med.purpose}
                        onChange={(e) => updateMedication(index, 'purpose', e.target.value)}
                      />
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}