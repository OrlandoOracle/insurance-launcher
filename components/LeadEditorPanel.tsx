'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, Plus, ExternalLink, Save, Loader2 } from 'lucide-react';
import { dataStore } from '@/lib/data-store';
import { StageEnum, type Lead } from '@/lib/schema';
import { toast } from '@/components/ui/sonner';

interface LeadEditorPanelProps {
  leadId: string;
  onClose: () => void;
  onSave: () => void;
}

export function LeadEditorPanel({ leadId, onClose, onSave }: LeadEditorPanelProps) {
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Lead>>({});
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    loadLead();
  }, [leadId]);

  const loadLead = async () => {
    setLoading(true);
    try {
      const data = await dataStore.getLead(leadId);
      if (data) {
        setLead(data);
        setFormData(data);
      }
    } catch (error) {
      console.error('Failed to load lead:', error);
      toast.error('Failed to load lead');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await dataStore.updateLead(leadId, formData);
      toast.success('Lead updated successfully');
      onSave();
    } catch (error) {
      console.error('Failed to save lead:', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Lead</SheetTitle>
          <SheetDescription>
            Update lead information and save changes
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : formData && (
          <div className="space-y-6 py-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName || ''}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName || ''}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stage">Stage</Label>
              <Select
                value={formData.stage}
                onValueChange={(value) => setFormData({ ...formData, stage: value as any })}
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

            <Separator />

            <div className="space-y-2">
              <Label>Phone Numbers</Label>
              <div className="space-y-2">
                {formData.phones?.map((phone, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={phone} readOnly />
                    <Button
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
                    onKeyPress={(e) => e.key === 'Enter' && addPhone()}
                  />
                  <Button size="sm" onClick={addPhone}>
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
                    onKeyPress={(e) => e.key === 'Enter' && addEmail()}
                  />
                  <Button size="sm" onClick={addEmail}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags?.map((tag, i) => (
                  <Badge key={i} variant="secondary">
                    {tag}
                    <button
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
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                />
                <Button size="sm" onClick={addTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="insuredWith">Insured With</Label>
                <Input
                  id="insuredWith"
                  value={formData.insuredWith || ''}
                  onChange={(e) => setFormData({ ...formData, insuredWith: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="income">Income</Label>
                <Input
                  id="income"
                  type="number"
                  value={formData.income || ''}
                  onChange={(e) => setFormData({ ...formData, income: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rapport">Rapport</Label>
              <Textarea
                id="rapport"
                rows={3}
                value={formData.rapport || ''}
                onChange={(e) => setFormData({ ...formData, rapport: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={4}
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <Separator />

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => router.push(`/lead/${leadId}`)}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Full View
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}