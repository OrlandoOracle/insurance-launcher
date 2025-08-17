'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { StorageGate } from '@/components/StorageGate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, FileText, Calendar, Phone, Mail, MapPin, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { dataStore } from '@/lib/data-store';
import type { Lead } from '@/lib/schema';
import { format } from 'date-fns';
import { toast } from '@/components/ui/sonner';
import { LeadEditorPanel } from '@/components/LeadEditorPanel';
import { DiscoveryForm } from '@/components/DiscoveryForm';

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;
  
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [companionFiles, setCompanionFiles] = useState({
    medications: null as string | null,
    doctors: null as string | null,
    notes: null as string | null
  });

  useEffect(() => {
    loadLead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  const loadLead = async () => {
    setLoading(true);
    try {
      const data = await dataStore.getLead(leadId);
      if (data) {
        setLead(data);
        
        // Load companion files
        const [medications, doctors, notes] = await Promise.all([
          dataStore.getCompanionFile(leadId, 'Medications'),
          dataStore.getCompanionFile(leadId, 'Doctors'),
          dataStore.getCompanionFile(leadId, 'Notes')
        ]);
        
        setCompanionFiles({ medications, doctors, notes });
      } else {
        toast.error('Lead not found');
        router.push('/');
      }
    } catch (error: unknown) {
      console.error('Failed to load lead:', error);
      toast.error('Failed to load lead');
    } finally {
      setLoading(false);
    }
  };

  const createCompanionFile = async (type: 'Medications' | 'Doctors' | 'Notes') => {
    try {
      await dataStore.createCompanionFile(leadId, type);
      await loadLead();
      toast.success(`${type} file created`);
    } catch (error: unknown) {
      console.error(`Failed to create ${type} file:`, error);
      toast.error(`Failed to create ${type} file`);
    }
  };

  const getStageColor = (stage: string) => {
    if (stage.includes('Sold')) return 'bg-green-500';
    if (stage.includes('Lost')) return 'bg-red-500';
    if (stage.includes('Discovery')) return 'bg-blue-500';
    if (stage.includes('Pitch')) return 'bg-purple-500';
    if (stage.includes('Close')) return 'bg-orange-500';
    return 'bg-gray-500';
  };

  if (loading) {
    return (
      <StorageGate>
        <div className="container mx-auto py-6">
          <div className="text-center py-12">Loading lead...</div>
        </div>
      </StorageGate>
    );
  }

  if (!lead) {
    return (
      <StorageGate>
        <div className="container mx-auto py-6">
          <div className="text-center py-12">Lead not found</div>
        </div>
      </StorageGate>
    );
  }

  return (
    <StorageGate>
      <div className="container mx-auto py-6 space-y-6 max-w-6xl">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">
                {lead.firstName} {lead.lastName}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={getStageColor(lead.stage)} variant="secondary">
                  {lead.stage}
                </Badge>
                {lead.tags.map(tag => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
            </div>
          </div>
          <Button onClick={() => setEditing(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Lead
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {lead.phones.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      {lead.phones.map((phone, i) => (
                        <div key={i}>{phone}</div>
                      ))}
                    </div>
                  </div>
                )}
                
                {lead.emails.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      {lead.emails.map((email, i) => (
                        <div key={i}>{email}</div>
                      ))}
                    </div>
                  </div>
                )}
                
                {lead.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>{lead.address}</div>
                  </div>
                )}
                
                {lead.dob && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>DOB: {lead.dob}</div>
                  </div>
                )}
                
                {lead.income && (
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>Income: ${lead.income.toLocaleString()}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Tabs defaultValue="discovery" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="discovery">Discovery</TabsTrigger>
                <TabsTrigger value="rapport">Rapport</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="appointments">Appointments</TabsTrigger>
              </TabsList>
              
              <TabsContent value="discovery">
                <Card>
                  <CardHeader>
                    <CardTitle>Discovery Worksheet</CardTitle>
                    <CardDescription>
                      First call discovery information
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DiscoveryForm lead={lead} onSave={loadLead} />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="rapport">
                <Card>
                  <CardHeader>
                    <CardTitle>Rapport & Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">
                      {lead.rapport || 'No rapport information yet'}
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="notes">
                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">
                      {lead.notes || 'No notes yet'}
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="appointments">
                <Card>
                  <CardHeader>
                    <CardTitle>Appointments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {lead.appointments.length === 0 ? (
                      <p className="text-muted-foreground">No appointments scheduled</p>
                    ) : (
                      <div className="space-y-4">
                        {lead.appointments.map((apt, i) => (
                          <div key={i} className="border-l-2 border-primary pl-4">
                            <div className="font-medium">
                              {format(new Date(apt.when), 'PPP p')}
                            </div>
                            {apt.type && (
                              <div className="text-sm text-muted-foreground">{apt.type}</div>
                            )}
                            {apt.notes && (
                              <div className="text-sm mt-1">{apt.notes}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Lead Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Source</p>
                  <p className="font-medium">{lead.source || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Currently Insured With</p>
                  <p className="font-medium">{lead.insuredWith || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {format(new Date(lead.createdAt), 'PPP')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="font-medium">
                    {format(new Date(lead.updatedAt), 'PPP p')}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Companion Files</CardTitle>
                <CardDescription>
                  Additional documentation files
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Medications.md</span>
                  </div>
                  {companionFiles.medications ? (
                    <Badge variant="outline">Exists</Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => createCompanionFile('Medications')}
                    >
                      Create
                    </Button>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Doctors.md</span>
                  </div>
                  {companionFiles.doctors ? (
                    <Badge variant="outline">Exists</Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => createCompanionFile('Doctors')}
                    >
                      Create
                    </Button>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Notes.md</span>
                  </div>
                  {companionFiles.notes ? (
                    <Badge variant="outline">Exists</Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => createCompanionFile('Notes')}
                    >
                      Create
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {editing && (
          <LeadEditorPanel
            leadId={leadId}
            onClose={() => setEditing(false)}
            onSave={() => {
              setEditing(false);
              loadLead();
            }}
          />
        )}
      </div>
    </StorageGate>
  );
}