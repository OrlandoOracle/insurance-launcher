'use client';

import { useRouter } from 'next/navigation';
import { StorageGate } from '@/components/StorageGate';
import { ImportStepper } from '@/components/ImportStepper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ImportPage() {
  const router = useRouter();

  return (
    <StorageGate>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Import CSV</h1>
            <p className="text-muted-foreground">
              Import leads from a CSV file
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>CSV Import Wizard</CardTitle>
            <CardDescription>
              Upload your CSV file and map the columns to lead fields
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImportStepper onComplete={() => router.push('/')} />
          </CardContent>
        </Card>
      </div>
    </StorageGate>
  );
}