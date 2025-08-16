'use client'

import { useDiscoveryStore } from '@/lib/discovery/store'
import { CHANNEL_OPTIONS } from '@/lib/discovery/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function QualificationStep() {
  const { data, updateData } = useDiscoveryStore()
  const { status } = data.discovery

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Qualification</CardTitle>
          <CardDescription>
            Understanding their current insurance situation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Situation Summary */}
          <div className="space-y-2">
            <Label htmlFor="situation">What made you reach out today? *</Label>
            <Textarea
              id="situation"
              value={data.discovery.situationSummary}
              onChange={(e) => updateData('discovery.situationSummary', e.target.value)}
              placeholder="Tell me about your current situation..."
              className="h-24"
            />
          </div>

          {/* Status Checkboxes */}
          <div className="space-y-2">
            <Label>Which applies to your situation? (Check all that apply)</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="losing"
                  checked={status.losingCoverage}
                  onCheckedChange={(checked) => 
                    updateData('discovery.status.losingCoverage', checked)
                  }
                />
                <Label htmlFor="losing">Losing coverage soon</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="toomuch"
                  checked={status.payingTooMuch}
                  onCheckedChange={(checked) => 
                    updateData('discovery.status.payingTooMuch', checked)
                  }
                />
                <Label htmlFor="toomuch">Paying too much for current coverage</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="uninsured"
                  checked={status.uninsured}
                  onCheckedChange={(checked) => 
                    updateData('discovery.status.uninsured', checked)
                  }
                />
                <Label htmlFor="uninsured">Currently uninsured</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conditional Sections Based on Status */}
      {(status.losingCoverage || status.payingTooMuch) && (
        <Card>
          <CardHeader>
            <CardTitle>Current Coverage Details</CardTitle>
            <CardDescription>
              Tell me about your existing insurance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="carrier">Insurance Carrier</Label>
                <Input
                  id="carrier"
                  value={data.coverage.current.carrier}
                  onChange={(e) => updateData('coverage.current.carrier', e.target.value)}
                  placeholder="Blue Cross, Aetna, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="channel">How did you get this coverage?</Label>
                <select
                  id="channel"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={data.coverage.current.channel}
                  onChange={(e) => updateData('coverage.current.channel', e.target.value)}
                >
                  <option value="">Select...</option>
                  {CHANNEL_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {status.losingCoverage && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lastDay">Last day of coverage</Label>
                    <Input
                      id="lastDay"
                      type="date"
                      value={data.coverage.current.lastDay}
                      onChange={(e) => updateData('coverage.current.lastDay', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>COBRA offered?</Label>
                    <RadioGroup
                      value={data.coverage.current.cobraOffered ? 'yes' : 'no'}
                      onValueChange={(value) => 
                        updateData('coverage.current.cobraOffered', value === 'yes')
                      }
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="cobra-yes" />
                          <Label htmlFor="cobra-yes">Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="cobra-no" />
                          <Label htmlFor="cobra-no">No</Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                {data.coverage.current.cobraOffered && (
                  <div className="space-y-2">
                    <Label htmlFor="cobraCost">COBRA monthly cost</Label>
                    <Input
                      id="cobraCost"
                      type="number"
                      value={data.coverage.current.cobraCost || ''}
                      onChange={(e) => updateData('coverage.current.cobraCost', 
                        e.target.value ? parseInt(e.target.value) : null
                      )}
                      placeholder="$0"
                    />
                  </div>
                )}
              </>
            )}

            {/* Plan Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="premium">Monthly Premium</Label>
                <Input
                  id="premium"
                  type="number"
                  value={data.coverage.current.premium || ''}
                  onChange={(e) => updateData('coverage.current.premium', 
                    e.target.value ? parseInt(e.target.value) : null
                  )}
                  placeholder="$0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deductible">Annual Deductible</Label>
                <Input
                  id="deductible"
                  type="number"
                  value={data.coverage.current.deductible || ''}
                  onChange={(e) => updateData('coverage.current.deductible', 
                    e.target.value ? parseInt(e.target.value) : null
                  )}
                  placeholder="$0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="oopm">Out-of-Pocket Maximum</Label>
                <Input
                  id="oopm"
                  type="number"
                  value={data.coverage.current.oopm || ''}
                  onChange={(e) => updateData('coverage.current.oopm', 
                    e.target.value ? parseInt(e.target.value) : null
                  )}
                  placeholder="$0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="network">Network Type</Label>
                <Input
                  id="network"
                  value={data.coverage.current.network}
                  onChange={(e) => updateData('coverage.current.network', e.target.value)}
                  placeholder="PPO, HMO, EPO, etc."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="copays">Copays (office visits, specialists, ER)</Label>
              <Input
                id="copays"
                value={data.coverage.current.copays}
                onChange={(e) => updateData('coverage.current.copays', e.target.value)}
                placeholder="$30 primary, $60 specialist, $250 ER"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="likes">What do you like about current plan?</Label>
                <Textarea
                  id="likes"
                  value={data.coverage.current.likes}
                  onChange={(e) => updateData('coverage.current.likes', e.target.value)}
                  placeholder="Low deductible, good network, etc."
                  className="h-20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dislikes">What don't you like?</Label>
                <Textarea
                  id="dislikes"
                  value={data.coverage.current.dislikes}
                  onChange={(e) => updateData('coverage.current.dislikes', e.target.value)}
                  placeholder="High premium, limited doctors, etc."
                  className="h-20"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {status.uninsured && (
        <Card>
          <CardHeader>
            <CardTitle>Uninsured Details</CardTitle>
            <CardDescription>
              Information about your last coverage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lastInsured">When were you last insured?</Label>
                <Input
                  id="lastInsured"
                  type="date"
                  value={data.coverage.uninsured?.lastInsuredDate || ''}
                  onChange={(e) => updateData('coverage.uninsured.lastInsuredDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastCarrier">Who was your last carrier?</Label>
                <Input
                  id="lastCarrier"
                  value={data.coverage.uninsured?.lastCarrier || ''}
                  onChange={(e) => updateData('coverage.uninsured.lastCarrier', e.target.value)}
                  placeholder="Previous insurance company"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastDetails">Any details you remember about that plan?</Label>
              <Textarea
                id="lastDetails"
                value={data.coverage.uninsured?.lastPlanDetails || ''}
                onChange={(e) => updateData('coverage.uninsured.lastPlanDetails', e.target.value)}
                placeholder="Deductible, network type, what you liked/disliked..."
                className="h-20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastPremium">What was the monthly premium?</Label>
              <Input
                id="lastPremium"
                type="number"
                value={data.coverage.uninsured?.lastPremium || ''}
                onChange={(e) => updateData('coverage.uninsured.lastPremium', 
                  e.target.value ? parseInt(e.target.value) : null
                )}
                placeholder="$0"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}