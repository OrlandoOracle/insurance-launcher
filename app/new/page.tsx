'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StorageGate } from '@/components/StorageGate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Save, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { dataStore } from '@/lib/data-store';
import { StageEnum, type Lead } from '@/lib/schema';
import { toast } from '@/components/ui/sonner';
import { Badge } from '@/components/ui/badge';

export default function NewLeadPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Lead>>({
    firstName: '',
    lastName: '',
    phones: [],
    emails: [],
    stage: 'Data Lead',
    tags: [],
    source: '',
    rapport: '',
    notes: ''
  });
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newTag, setNewTag] = useState('');
  const [createCompanions, setCreateCompanions] = useState({
    medications: false,
    doctors: false,
    notes: false
  });

  const addPhone = () => {
    if (newPhone && !formData.phones?.includes(newPhone)) {
      setFormData({
        ...formData,
        phones: [...(formData.phones || []), newPhone]
      });
      setNewPhone('');
    }
  };

  const removePhone = (phone: string) => {
    setFormData({
      ...formData,
      phones: formData.phones?.filter(p => p !== phone) || []
    });
  };

  const addEmail = () => {
    if (newEmail && !formData.emails?.includes(newEmail)) {
      setFormData({
        ...formData,
        emails: [...(formData.emails || []), newEmail]
      });
      setNewEmail('');
    }
  };

  const removeEmail = (email: string) => {
    setFormData({
      ...formData,
      emails: formData.emails?.filter(e => e !== email) || []
    });
  };

  const addTag = () => {
    if (newTag && !formData.tags?.includes(newTag)) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), newTag]
      });
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter(t => t !== tag) || []
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName) {
      toast.error('First name and last name are required');
      return;
    }

    setSaving(true);
    try {
      const lead = await dataStore.createLead(formData);
      
      // Create companion files if requested
      if (createCompanions.medications) {
        await dataStore.createCompanionFile(lead.id, 'Medications');
      }
      if (createCompanions.doctors) {
        await dataStore.createCompanionFile(lead.id, 'Doctors');
      }
      if (createCompanions.notes) {
        await dataStore.createCompanionFile(lead.id, 'Notes');
      }
      
      toast.success('Lead created successfully');
      router.push('/');
    } catch (error) {
      console.error('Failed to create lead:', error);
      toast.error('Failed to create lead');
    } finally {
      setSaving(false);
    }
  };

  return (
    <StorageGate>
      <div className="container mx-auto py-6 space-y-6 max-w-4xl">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">New Lead</h1>
            <p className="text-muted-foreground">
              Create a new insurance lead
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Lead Information</CardTitle>
              <CardDescription>
                Enter the basic information for the new lead
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="required">
                    First Name *
                  </Label>
                  <Input
                    id="firstName"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="required">
                    Last Name *
                  </Label>
                  <Input
                    id="lastName"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.dob || ''}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source">Source</Label>
                  <Input
                    id="source"
                    value={formData.source || ''}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    placeholder="e.g., Facebook, Referral, Website"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stage">Stage</Label>
                <Select
                  value={formData.stage}
                  onValueChange={(value) => setFormData({ ...formData, stage: value as (typeof StageEnum.options)[number] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {StageEnum.options.map(stage => (
                      <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Phone Numbers</Label>
                <div className="space-y-2">
                  {formData.phones?.map((phone, i) => (
                    <div key={i} className="flex gap-2">
                      <Input value={phone} readOnly />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removePhone(phone)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add phone number"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addPhone();
                        }
                      }}
                    />
                    <Button type="button" size="sm" onClick={addPhone}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email Addresses</Label>
                <div className="space-y-2">
                  {formData.emails?.map((email, i) => (
                    <div key={i} className="flex gap-2">
                      <Input value={email} readOnly />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeEmail(email)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="Add email address"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addEmail();
                        }
                      }}
                    />
                    <Button type="button" size="sm" onClick={addEmail}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  rows={2}
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street address, city, state, ZIP"
                />
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags?.map((tag, i) => (
                    <Badge key={i} variant="secondary">
                      {tag}
                      <button
                        type="button"
                        className="ml-1 hover:text-destructive"
                        onClick={() => removeTag(tag)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add tag"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button type="button" size="sm" onClick={addTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="insuredWith">Currently Insured With</Label>
                  <Input
                    id="insuredWith"
                    value={formData.insuredWith || ''}
                    onChange={(e) => setFormData({ ...formData, insuredWith: e.target.value })}
                    placeholder="Current insurance provider"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="income">Annual Income</Label>
                  <Input
                    id="income"
                    type="number"
                    value={formData.income || ''}
                    onChange={(e) => setFormData({ ...formData, income: Number(e.target.value) })}
                    placeholder="50000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rapport">Rapport / Personal Information</Label>
                <Textarea
                  id="rapport"
                  rows={3}
                  value={formData.rapport || ''}
                  onChange={(e) => setFormData({ ...formData, rapport: e.target.value })}
                  placeholder="Personal details, interests, family information..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Initial Notes</Label>
                <Textarea
                  id="notes"
                  rows={4}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional notes about this lead..."
                />
              </div>

              <div className="space-y-2">
                <Label>Create Companion Files</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="medications"
                      checked={createCompanions.medications}
                      onCheckedChange={(checked) => 
                        setCreateCompanions({ ...createCompanions, medications: checked as boolean })
                      }
                    />
                    <Label htmlFor="medications" className="font-normal">
                      Medications.md - Track medications and allergies
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="doctors"
                      checked={createCompanions.doctors}
                      onCheckedChange={(checked) => 
                        setCreateCompanions({ ...createCompanions, doctors: checked as boolean })
                      }
                    />
                    <Label htmlFor="doctors" className="font-normal">
                      Doctors.md - Track healthcare providers
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="notes-file"
                      checked={createCompanions.notes}
                      onCheckedChange={(checked) => 
                        setCreateCompanions({ ...createCompanions, notes: checked as boolean })
                      }
                    />
                    <Label htmlFor="notes-file" className="font-normal">
                      Notes.md - Extended notes and history
                    </Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Link href="/">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Save className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Create Lead
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </StorageGate>
  );
}