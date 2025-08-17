'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { StorageGate } from '@/components/StorageGate';
import { LeadTable } from '@/components/LeadTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Upload, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { dataStore } from '@/lib/data-store';
import { indexService } from '@/lib/index';
import { toast } from '@/components/ui/sonner';
import DebugPanel from '@/components/DebugPanel';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function HomeClient() {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Ensure we only show dynamic content after mount
  useState(() => {
    setMounted(true);
  });

  const { data: leads = [], refetch, isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      return dataStore.getLeads();
    },
    enabled: mounted,
  });

  // Auto-open last lead
  useEffect(() => {
    if (!mounted || isLoading || leads.length === 0) return;
    
    (async () => {
      try {
        const lastPath = await dataStore.getLastOpen();
        if (!lastPath) return;
        // Find the entry by jsonPath
        const entry = leads.find(e => e.jsonPath === lastPath || e.filePath === lastPath);
        if (entry?.id) {
          // Navigate to detail page
          router.push(`/lead/${entry.id}`);
        }
      } catch (e: unknown) {
        console.error('[auto-open] failed', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, isLoading]);

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      await dataStore.deleteLead(deleteId);
      toast.success('Lead moved to backup');
      refetch();
    } catch (error) {
      console.error('Failed to delete lead:', error);
      toast.error('Failed to delete lead');
    } finally {
      setDeleteId(null);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await dataStore.duplicateLead(id);
      toast.success('Lead duplicated to Potential Duplicates folder');
      refetch();
    } catch (error) {
      console.error('Failed to duplicate lead:', error);
      toast.error('Failed to duplicate lead');
    }
  };

  const handleRebuildIndex = async () => {
    try {
      await indexService.rebuild();
      toast.success('Index rebuilt successfully');
      refetch();
    } catch (error) {
      console.error('Failed to rebuild index:', error);
      toast.error('Failed to rebuild index');
    }
  };

  return (
    <StorageGate>
      <div className="container mx-auto py-6 space-y-6">
        {mounted && (
          <div className="rounded-md border p-3 text-sm bg-green-50 border-green-200">
            <b>Smoke Test:</b> App mounted OK. Client-side only.
          </div>
        )}
        
        <DebugPanel />
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Lead Manager</h1>
            <p className="text-muted-foreground">
              Manage your insurance leads and track progress
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRebuildIndex}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Rebuild Index
            </Button>
            <Link href="/import">
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
            </Link>
            <Link href="/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Lead
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{leads.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {leads.filter(l => !l.stage.includes('Sold') && !l.stage.includes('Lost')).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Sold</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {leads.filter(l => l.stage.includes('Sold')).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Lost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {leads.filter(l => l.stage.includes('Lost')).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Leads</CardTitle>
            <CardDescription>
              View and manage all your insurance leads
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading leads...
              </div>
            ) : (
              <LeadTable
                leads={leads}
                onUpdate={refetch}
                onDelete={(id) => setDeleteId(id)}
                onDuplicate={handleDuplicate}
              />
            )}
          </CardContent>
        </Card>

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Lead</AlertDialogTitle>
              <AlertDialogDescription>
                This will move the lead to the Backups/Deleted folder. You can restore it manually if needed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </StorageGate>
  );
}