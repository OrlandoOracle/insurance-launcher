'use client'

// Export all step components
export { IntroStep } from './IntroStep'
export { ConfirmInfoStep } from './ConfirmInfoStep'
export { QualificationStep } from './QualificationStep'
export { HealthMedsStep } from './HealthMedsStep'
export { ClosingStep } from './ClosingStep'

// Simplified placeholder components for remaining steps
import { useDiscoveryStore } from '@/lib/discovery/store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'

export function PurposeStep() {
  const { data, updateData } = useDiscoveryStore()
  
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Purpose of the Call</CardTitle>
        <CardDescription>Setting expectations for our two-call process</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm">
            "Just to set expectations, this is a discovery call to understand your needs. 
            After this, we'll schedule a second call where I'll present personalized options 
            based on what we discuss today. Does that make sense?"
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="understood"
            checked={data.discovery.understoodTwoCallFlow}
            onCheckedChange={(checked) => 
              updateData('discovery.understoodTwoCallFlow', checked as boolean)
            }
          />
          <Label htmlFor="understood">Client understood the two-call process</Label>
        </div>
      </CardContent>
    </Card>
  )
}

export function SituationStep() {
  const { data, updateData } = useDiscoveryStore()
  
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Understanding Their Situation</CardTitle>
        <CardDescription>Captured in the Qualification step</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This information is captured in the Qualification step.
        </p>
      </CardContent>
    </Card>
  )
}

export function EducationStep() {
  const { data, updateData } = useDiscoveryStore()
  
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Private vs Marketplace Education</CardTitle>
        <CardDescription>Explaining the difference between private and marketplace plans</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm font-medium mb-2">Key Points to Cover:</p>
          <ul className="text-sm space-y-1 list-disc list-inside">
            <li>Private plans: More flexibility, potentially better pricing</li>
            <li>Marketplace: Subsidies available based on income</li>
            <li>We'll evaluate both options for you</li>
          </ul>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="understood-education"
            checked={data.privateMpEducation.understood}
            onCheckedChange={(checked) => 
              updateData('privateMpEducation.understood', checked as boolean)
            }
          />
          <Label htmlFor="understood-education">
            Client understood the difference
          </Label>
        </div>
      </CardContent>
    </Card>
  )
}

export function DiscountsStep() {
  const { data, updateData } = useDiscoveryStore()
  
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Income & Discounts</CardTitle>
        <CardDescription>Household income for 2025 to determine subsidy eligibility</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="income">2025 Projected Household Income</Label>
          <Input
            id="income"
            type="number"
            value={data.income.amount || ''}
            onChange={(e) => updateData('income.amount', 
              e.target.value ? parseInt(e.target.value) : null
            )}
            placeholder="$50,000"
          />
        </div>
        <RadioGroup
          value={data.income.basis}
          onValueChange={(value) => updateData('income.basis', value)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="gross" id="gross" />
            <Label htmlFor="gross">Gross (before taxes)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="after_tax" id="after_tax" />
            <Label htmlFor="after_tax">After tax (take-home)</Label>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  )
}

export function DoctorsStep() {
  const { data, updateData } = useDiscoveryStore()

  const addDoctor = () => {
    const newDoc = {
      firstName: '',
      lastName: '',
      specialty: '',
      city: '',
      state: '',
      clinic: '',
      notes: ''
    }
    updateData('doctors', [...data.doctors, newDoc])
  }

  const removeDoctor = (index: number) => {
    const updated = data.doctors.filter((_, i) => i !== index)
    updateData('doctors', updated)
  }

  const updateDoctor = (index: number, field: string, value: string) => {
    const updated = [...data.doctors]
    updated[index] = { ...updated[index], [field]: value }
    updateData('doctors', updated)
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Doctor Preferences</CardTitle>
        <CardDescription>Doctors they want to keep in-network</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Doctors to stay in-network</Label>
          <Button onClick={addDoctor} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Doctor
          </Button>
        </div>

        {data.doctors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No specific doctor requirements</p>
        ) : (
          data.doctors.map((doc, index) => (
            <Card key={index} className="p-3">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Doctor {index + 1}</span>
                  <Button
                    onClick={() => removeDoctor(index)}
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
                    value={doc.firstName}
                    onChange={(e) => updateDoctor(index, 'firstName', e.target.value)}
                  />
                  <Input
                    placeholder="Last Name"
                    value={doc.lastName}
                    onChange={(e) => updateDoctor(index, 'lastName', e.target.value)}
                  />
                  <Input
                    placeholder="Specialty"
                    value={doc.specialty}
                    onChange={(e) => updateDoctor(index, 'specialty', e.target.value)}
                  />
                  <Input
                    placeholder="City"
                    value={doc.city}
                    onChange={(e) => updateDoctor(index, 'city', e.target.value)}
                  />
                  <Input
                    placeholder="State"
                    value={doc.state}
                    onChange={(e) => updateDoctor(index, 'state', e.target.value)}
                  />
                  <Input
                    placeholder="Clinic/Hospital"
                    value={doc.clinic}
                    onChange={(e) => updateDoctor(index, 'clinic', e.target.value)}
                  />
                </div>
              </div>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export function PrioritiesStep() {
  const { data, updateData } = useDiscoveryStore()
  const priorities = [
    'Catastrophic coverage',
    'Maternity',
    'Preventive care',
    'Accident protection',
    'Better overall coverage',
    'HSA compatible',
    'Low deductible',
    'Low premium',
    'Wide network'
  ]

  const togglePriority = (priority: string) => {
    const current = data.priorities
    if (current.includes(priority)) {
      updateData('priorities', current.filter(p => p !== priority))
    } else {
      updateData('priorities', [...current, priority])
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Coverage Priorities</CardTitle>
        <CardDescription>What's most important in their health plan</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {priorities.map(priority => (
            <div key={priority} className="flex items-center space-x-2">
              <Checkbox
                id={priority}
                checked={data.priorities.includes(priority)}
                onCheckedChange={() => togglePriority(priority)}
              />
              <Label htmlFor={priority}>{priority}</Label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function DentalVisionStep() {
  const { data, updateData } = useDiscoveryStore()
  
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Dental & Vision Coverage</CardTitle>
        <CardDescription>Additional coverage interests</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="dental"
            checked={data.dentalVision.dental}
            onCheckedChange={(checked) => 
              updateData('dentalVision.dental', checked as boolean)
            }
          />
          <Label htmlFor="dental">Interested in dental coverage</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="vision"
            checked={data.dentalVision.vision}
            onCheckedChange={(checked) => 
              updateData('dentalVision.vision', checked as boolean)
            }
          />
          <Label htmlFor="vision">Interested in vision coverage</Label>
        </div>
      </CardContent>
    </Card>
  )
}

export function LifeStep() {
  const { data, updateData } = useDiscoveryStore()
  
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Life Insurance</CardTitle>
        <CardDescription>Existing life insurance coverage</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="hasLife"
            checked={data.lifeInsurance.has}
            onCheckedChange={(checked) => 
              updateData('lifeInsurance.has', checked as boolean)
            }
          />
          <Label htmlFor="hasLife">Currently has life insurance</Label>
        </div>
        
        {data.lifeInsurance.has && (
          <>
            <RadioGroup
              value={data.lifeInsurance.type}
              onValueChange={(value) => updateData('lifeInsurance.type', value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="term" id="term" />
                <Label htmlFor="term">Term Life</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="whole" id="whole" />
                <Label htmlFor="whole">Whole Life</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="unknown" id="unknown-life" />
                <Label htmlFor="unknown-life">Not Sure</Label>
              </div>
            </RadioGroup>
            
            <div className="space-y-2">
              <Label htmlFor="cashValue">Cash value (if whole life)</Label>
              <Input
                id="cashValue"
                type="number"
                value={data.lifeInsurance.cashValue || ''}
                onChange={(e) => updateData('lifeInsurance.cashValue', 
                  e.target.value ? parseInt(e.target.value) : null
                )}
                placeholder="$0"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="employer"
                checked={data.lifeInsurance.throughEmployer}
                onCheckedChange={(checked) => 
                  updateData('lifeInsurance.throughEmployer', checked as boolean)
                }
              />
              <Label htmlFor="employer">Through employer</Label>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function BudgetStep() {
  const { data, updateData } = useDiscoveryStore()
  
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Budget</CardTitle>
        <CardDescription>Monthly budget for health insurance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="budgetText">Budget expectations</Label>
          <Input
            id="budgetText"
            value={data.budget.text}
            onChange={(e) => updateData('budget.text', e.target.value)}
            placeholder="Hoping to stay under $500/month..."
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="budgetMin">Minimum budget</Label>
            <Input
              id="budgetMin"
              type="number"
              value={data.budget.min || ''}
              onChange={(e) => updateData('budget.min', 
                e.target.value ? parseInt(e.target.value) : null
              )}
              placeholder="$200"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budgetMax">Maximum budget</Label>
            <Input
              id="budgetMax"
              type="number"
              value={data.budget.max || ''}
              onChange={(e) => updateData('budget.max', 
                e.target.value ? parseInt(e.target.value) : null
              )}
              placeholder="$600"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}