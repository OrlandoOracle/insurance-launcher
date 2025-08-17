'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Save, Copy, Loader2 } from 'lucide-react';
import { dataStore } from '@/lib/data-store';
import type { Lead } from '@/lib/schema';
import { toast } from '@/components/ui/sonner';

interface DiscoveryFormProps {
  lead: Lead;
  onSave: () => void;
}

interface DiscoveryData {
  currentInsurance: {
    hasInsurance: string;
    carrier: string;
    monthlyPremium: string;
    satisfaction: string;
    coverageGaps: string;
  };
  healthStatus: {
    overallHealth: string;
    chronicConditions: string;
    medications: string;
    hospitalizations: string;
    tobaccoUse: string;
  };
  familyInfo: {
    maritalStatus: string;
    dependents: string;
    spouseWorking: string;
    familyHealthConcerns: string;
  };
  financialInfo: {
    employmentStatus: string;
    employer: string;
    monthlyBudget: string;
    savingsGoals: string;
    retirementPlanning: string;
  };
  needs: {
    primaryConcern: string;
    importantBenefits: string;
    preferredContact: string;
    decisionTimeframe: string;
    additionalQuestions: string;
  };
}

export function DiscoveryForm({ lead, onSave }: DiscoveryFormProps) {
  const [saving, setSaving] = useState(false);
  const [discovery, setDiscovery] = useState<DiscoveryData>(() => {
    const saved = lead.meta?.discovery as DiscoveryData | undefined;
    return saved || {
      currentInsurance: {
        hasInsurance: '',
        carrier: '',
        monthlyPremium: '',
        satisfaction: '',
        coverageGaps: ''
      },
      healthStatus: {
        overallHealth: '',
        chronicConditions: '',
        medications: '',
        hospitalizations: '',
        tobaccoUse: ''
      },
      familyInfo: {
        maritalStatus: '',
        dependents: '',
        spouseWorking: '',
        familyHealthConcerns: ''
      },
      financialInfo: {
        employmentStatus: '',
        employer: '',
        monthlyBudget: '',
        savingsGoals: '',
        retirementPlanning: ''
      },
      needs: {
        primaryConcern: '',
        importantBenefits: '',
        preferredContact: '',
        decisionTimeframe: '',
        additionalQuestions: ''
      }
    };
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      // Generate summary for rapport and notes
      const summary = generateSummary();
      
      await dataStore.updateLead(lead.id, {
        rapport: lead.rapport ? `${lead.rapport}\n\n--- Discovery Call ---\n${summary}` : summary,
        notes: lead.notes ? `${lead.notes}\n\n[Discovery completed on ${new Date().toLocaleDateString()}]` : `Discovery completed on ${new Date().toLocaleDateString()}`,
        meta: {
          ...lead.meta,
          discovery
        }
      });
      
      toast.success('Discovery information saved');
      onSave();
    } catch (error) {
      console.error('Failed to save discovery:', error);
      toast.error('Failed to save discovery information');
    } finally {
      setSaving(false);
    }
  };

  const generateSummary = () => {
    const parts = [];
    
    if (discovery.currentInsurance.hasInsurance === 'yes') {
      parts.push(`Currently insured with ${discovery.currentInsurance.carrier}, paying $${discovery.currentInsurance.monthlyPremium}/month.`);
      if (discovery.currentInsurance.satisfaction) {
        parts.push(`Satisfaction: ${discovery.currentInsurance.satisfaction}`);
      }
    } else {
      parts.push('Currently uninsured.');
    }
    
    if (discovery.healthStatus.overallHealth) {
      parts.push(`Health status: ${discovery.healthStatus.overallHealth}`);
    }
    
    if (discovery.healthStatus.chronicConditions) {
      parts.push(`Chronic conditions: ${discovery.healthStatus.chronicConditions}`);
    }
    
    if (discovery.familyInfo.maritalStatus) {
      parts.push(`${discovery.familyInfo.maritalStatus}`);
      if (discovery.familyInfo.dependents) {
        parts.push(`${discovery.familyInfo.dependents} dependents`);
      }
    }
    
    if (discovery.financialInfo.monthlyBudget) {
      parts.push(`Budget for insurance: $${discovery.financialInfo.monthlyBudget}/month`);
    }
    
    if (discovery.needs.primaryConcern) {
      parts.push(`Primary concern: ${discovery.needs.primaryConcern}`);
    }
    
    if (discovery.needs.decisionTimeframe) {
      parts.push(`Decision timeframe: ${discovery.needs.decisionTimeframe}`);
    }
    
    return parts.join(' ');
  };

  const copySummary = () => {
    const summary = generateSummary();
    navigator.clipboard.writeText(summary);
    toast.success('Summary copied to clipboard');
  };

  const updateField = (section: keyof DiscoveryData, field: string, value: string) => {
    setDiscovery(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  return (
    <div className="space-y-6">
      {/* Current Insurance */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Current Insurance</h3>
        
        <div className="space-y-2">
          <Label>Do you currently have health insurance?</Label>
          <RadioGroup
            value={discovery.currentInsurance.hasInsurance}
            onValueChange={(value) => updateField('currentInsurance', 'hasInsurance', value)}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="has-yes" />
              <Label htmlFor="has-yes">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="has-no" />
              <Label htmlFor="has-no">No</Label>
            </div>
          </RadioGroup>
        </div>
        
        {discovery.currentInsurance.hasInsurance === 'yes' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Insurance Carrier</Label>
                <Input
                  value={discovery.currentInsurance.carrier}
                  onChange={(e) => updateField('currentInsurance', 'carrier', e.target.value)}
                  placeholder="e.g., Blue Cross, Aetna"
                />
              </div>
              <div className="space-y-2">
                <Label>Monthly Premium</Label>
                <Input
                  type="number"
                  value={discovery.currentInsurance.monthlyPremium}
                  onChange={(e) => updateField('currentInsurance', 'monthlyPremium', e.target.value)}
                  placeholder="450"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Satisfaction Level</Label>
              <RadioGroup
                value={discovery.currentInsurance.satisfaction}
                onValueChange={(value) => updateField('currentInsurance', 'satisfaction', value)}
              >
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="very-satisfied" id="sat-1" />
                    <Label htmlFor="sat-1">Very Satisfied</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="satisfied" id="sat-2" />
                    <Label htmlFor="sat-2">Satisfied</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="neutral" id="sat-3" />
                    <Label htmlFor="sat-3">Neutral</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dissatisfied" id="sat-4" />
                    <Label htmlFor="sat-4">Dissatisfied</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label>Coverage Gaps or Concerns</Label>
              <Textarea
                rows={2}
                value={discovery.currentInsurance.coverageGaps}
                onChange={(e) => updateField('currentInsurance', 'coverageGaps', e.target.value)}
                placeholder="Any issues with current coverage?"
              />
            </div>
          </>
        )}
      </div>

      <Separator />

      {/* Health Status */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Health Status</h3>
        
        <div className="space-y-2">
          <Label>Overall Health</Label>
          <RadioGroup
            value={discovery.healthStatus.overallHealth}
            onValueChange={(value) => updateField('healthStatus', 'overallHealth', value)}
          >
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excellent" id="health-1" />
                <Label htmlFor="health-1">Excellent</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="good" id="health-2" />
                <Label htmlFor="health-2">Good</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fair" id="health-3" />
                <Label htmlFor="health-3">Fair</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="poor" id="health-4" />
                <Label htmlFor="health-4">Poor</Label>
              </div>
            </div>
          </RadioGroup>
        </div>
        
        <div className="space-y-2">
          <Label>Chronic Conditions</Label>
          <Textarea
            rows={2}
            value={discovery.healthStatus.chronicConditions}
            onChange={(e) => updateField('healthStatus', 'chronicConditions', e.target.value)}
            placeholder="List any chronic conditions (diabetes, heart disease, etc.)"
          />
        </div>
        
        <div className="space-y-2">
          <Label>Current Medications</Label>
          <Textarea
            rows={2}
            value={discovery.healthStatus.medications}
            onChange={(e) => updateField('healthStatus', 'medications', e.target.value)}
            placeholder="List current medications"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Recent Hospitalizations</Label>
            <Input
              value={discovery.healthStatus.hospitalizations}
              onChange={(e) => updateField('healthStatus', 'hospitalizations', e.target.value)}
              placeholder="Last 5 years"
            />
          </div>
          <div className="space-y-2">
            <Label>Tobacco Use</Label>
            <RadioGroup
              value={discovery.healthStatus.tobaccoUse}
              onValueChange={(value) => updateField('healthStatus', 'tobaccoUse', value)}
            >
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="never" id="tobacco-1" />
                  <Label htmlFor="tobacco-1">Never</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="former" id="tobacco-2" />
                  <Label htmlFor="tobacco-2">Former</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="current" id="tobacco-3" />
                  <Label htmlFor="tobacco-3">Current</Label>
                </div>
              </div>
            </RadioGroup>
          </div>
        </div>
      </div>

      <Separator />

      {/* Family Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Family Information</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Marital Status</Label>
            <Input
              value={discovery.familyInfo.maritalStatus}
              onChange={(e) => updateField('familyInfo', 'maritalStatus', e.target.value)}
              placeholder="Single, Married, etc."
            />
          </div>
          <div className="space-y-2">
            <Label>Number of Dependents</Label>
            <Input
              value={discovery.familyInfo.dependents}
              onChange={(e) => updateField('familyInfo', 'dependents', e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Is Spouse Working?</Label>
          <Input
            value={discovery.familyInfo.spouseWorking}
            onChange={(e) => updateField('familyInfo', 'spouseWorking', e.target.value)}
            placeholder="Yes/No/N/A"
          />
        </div>
        
        <div className="space-y-2">
          <Label>Family Health Concerns</Label>
          <Textarea
            rows={2}
            value={discovery.familyInfo.familyHealthConcerns}
            onChange={(e) => updateField('familyInfo', 'familyHealthConcerns', e.target.value)}
            placeholder="Any family health concerns to consider?"
          />
        </div>
      </div>

      <Separator />

      {/* Financial Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Financial Information</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Employment Status</Label>
            <Input
              value={discovery.financialInfo.employmentStatus}
              onChange={(e) => updateField('financialInfo', 'employmentStatus', e.target.value)}
              placeholder="Employed, Self-employed, Retired"
            />
          </div>
          <div className="space-y-2">
            <Label>Employer</Label>
            <Input
              value={discovery.financialInfo.employer}
              onChange={(e) => updateField('financialInfo', 'employer', e.target.value)}
              placeholder="Company name"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Monthly Budget for Insurance</Label>
          <Input
            type="number"
            value={discovery.financialInfo.monthlyBudget}
            onChange={(e) => updateField('financialInfo', 'monthlyBudget', e.target.value)}
            placeholder="500"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Savings Goals</Label>
            <Textarea
              rows={2}
              value={discovery.financialInfo.savingsGoals}
              onChange={(e) => updateField('financialInfo', 'savingsGoals', e.target.value)}
              placeholder="What are they saving for?"
            />
          </div>
          <div className="space-y-2">
            <Label>Retirement Planning</Label>
            <Textarea
              rows={2}
              value={discovery.financialInfo.retirementPlanning}
              onChange={(e) => updateField('financialInfo', 'retirementPlanning', e.target.value)}
              placeholder="Retirement plans and timeline"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Needs Assessment */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Needs Assessment</h3>
        
        <div className="space-y-2">
          <Label>Primary Concern</Label>
          <Textarea
            rows={2}
            value={discovery.needs.primaryConcern}
            onChange={(e) => updateField('needs', 'primaryConcern', e.target.value)}
            placeholder="What's their biggest concern about insurance?"
          />
        </div>
        
        <div className="space-y-2">
          <Label>Most Important Benefits</Label>
          <Textarea
            rows={2}
            value={discovery.needs.importantBenefits}
            onChange={(e) => updateField('needs', 'importantBenefits', e.target.value)}
            placeholder="What benefits matter most to them?"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Preferred Contact Method</Label>
            <Input
              value={discovery.needs.preferredContact}
              onChange={(e) => updateField('needs', 'preferredContact', e.target.value)}
              placeholder="Phone, Email, Text"
            />
          </div>
          <div className="space-y-2">
            <Label>Decision Timeframe</Label>
            <Input
              value={discovery.needs.decisionTimeframe}
              onChange={(e) => updateField('needs', 'decisionTimeframe', e.target.value)}
              placeholder="Immediate, 30 days, etc."
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Additional Questions/Concerns</Label>
          <Textarea
            rows={3}
            value={discovery.needs.additionalQuestions}
            onChange={(e) => updateField('needs', 'additionalQuestions', e.target.value)}
            placeholder="Any other questions or concerns they mentioned?"
          />
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={copySummary}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Summary
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Discovery
            </>
          )}
        </Button>
      </div>
    </div>
  );
}