'use client'

import { useDiscoveryStore } from '@/lib/discovery/store'
import { SOURCE_OPTIONS } from '@/lib/discovery/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'

export function IntroStep() {
  const { data, updateData } = useDiscoveryStore()

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Introduction</CardTitle>
          <CardDescription>
            Build rapport and understand how they found us
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="source">How did you hear about us?</Label>
            <RadioGroup
              value={data.discovery.source}
              onValueChange={(value) => updateData('discovery.source', value)}
            >
              {SOURCE_OPTIONS.map(option => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label htmlFor={option.value}>{option.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {data.discovery.source === 'other' && (
            <div className="space-y-2">
              <Label htmlFor="sourceOther">Please specify</Label>
              <Input
                id="sourceOther"
                value={data.discovery.sourceOther || ''}
                onChange={(e) => updateData('discovery.sourceOther', e.target.value)}
                placeholder="Where did you hear about us?"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="initialRapport">Initial rapport notes (optional)</Label>
            <Textarea
              id="initialRapport"
              placeholder="Any initial observations, mood, concerns mentioned..."
              className="h-24"
            />
            <p className="text-xs text-muted-foreground">
              Use the floating Rapport Pad (⌘R) for ongoing notes during the call
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}