'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { parseCSV, mapCSVToLead, validateLead, checkDuplicate, DEFAULT_MAPPING, type CSVRow } from '@/lib/csv';
import { dataStore } from '@/lib/data-store';
import { indexService } from '@/lib/index';
import { fs } from '@/lib/fs';
import { FOLDER_STRUCTURE, getLeadFolderByStage, getLeadFilename } from '@/lib/paths';
import { toast } from '@/components/ui/sonner';
import type { Lead, ImportReport } from '@/lib/schema';
import { format } from 'date-fns';

interface ImportStepperProps {
  onComplete: () => void;
}

type Step = 'upload' | 'mapping' | 'validation' | 'review' | 'import';

export function ImportStepper({ onComplete }: ImportStepperProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('upload');
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, keyof Lead | 'meta' | 'ignore'>>({});
  const [mappedLeads, setMappedLeads] = useState<Partial<Lead>[]>([]);
  const [validationResults, setValidationResults] = useState<{ lead: Partial<Lead>; validation: ReturnType<typeof validateLead>; duplicate: ReturnType<typeof checkDuplicate> }[]>([]);
  const [duplicateResults, setDuplicateResults] = useState<{ lead: Partial<Lead>; validation: ReturnType<typeof validateLead>; duplicate: ReturnType<typeof checkDuplicate> }[]>([]);
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const text = await file.text();
    const data = await parseCSV(text);
    
    if (data.length === 0) {
      toast.error('No data found in CSV');
      return;
    }

    const csvHeaders = Object.keys(data[0]);
    setCsvData(data);
    setHeaders(csvHeaders);
    
    // Auto-map headers
    const autoMapping: Record<string, keyof Lead | 'meta' | 'ignore'> = {};
    csvHeaders.forEach(header => {
      autoMapping[header] = DEFAULT_MAPPING[header] || 'ignore';
    });
    setMapping(autoMapping);
    
    setStep('mapping');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'text/plain': ['.txt']
    },
    maxFiles: 1
  });

  const handleMapping = () => {
    const leads = csvData.map(row => mapCSVToLead(row, mapping));
    setMappedLeads(leads);
    
    // Validate all leads
    const validations = leads.map(lead => ({
      lead,
      validation: validateLead(lead),
      duplicate: checkDuplicate(lead)
    }));
    
    setValidationResults(validations);
    setDuplicateResults(validations.filter(v => v.duplicate.isDuplicate));
    setStep('validation');
  };

  const handleImport = async () => {
    setImporting(true);
    const report: ImportReport = {
      timestamp: new Date().toISOString(),
      totalRows: mappedLeads.length,
      imported: 0,
      duplicates: 0,
      errors: 0,
      details: []
    };

    // Ensure folders exist before import
    try {
      await fs.ensureFolders([
        FOLDER_STRUCTURE.duplicates,
        FOLDER_STRUCTURE.imports,
        FOLDER_STRUCTURE.active,
        FOLDER_STRUCTURE.sold,
        FOLDER_STRUCTURE.lost
      ]);
    } catch (error) {
      console.error('[import] Failed to ensure folders:', error);
      toast.error('Failed to create necessary folders. Please check permissions.');
      setImporting(false);
      return;
    }

    for (let i = 0; i < mappedLeads.length; i++) {
      const lead = mappedLeads[i];
      const validation = validationResults[i];
      
      try {
        if (validation.duplicate.isDuplicate) {
          // Save to duplicates folder with unique name
          console.log(`[import] Row ${i + 1}: Duplicate detected, saving to duplicates folder`);
          
          try {
            const folder = FOLDER_STRUCTURE.duplicates;
            const filePath = await fs.uniqueLeadPathFor(
              { firstName: lead.firstName || 'Unknown', lastName: lead.lastName || 'Lead' },
              folder
            );
            
            // Add duplicate info to lead
            const duplicateLead = {
              ...lead,
              id: lead.id || uuidv4(),
              createdAt: lead.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              meta: {
                ...lead.meta,
                duplicateOf: validation.duplicate.matches,
                duplicateReason: validation.duplicate.reason,
                importedAt: new Date().toISOString()
              }
            };
            
            await fs.writeFile(filePath, JSON.stringify(duplicateLead, null, 2));
            
            report.duplicates++;
            report.details.push({
              originalRow: csvData[i],
              result: 'duplicate',
              duplicateOf: validation.duplicate.matches,
              filePath
            });
            
            console.log(`[import] Row ${i + 1}: Saved duplicate to ${filePath}`);
          } catch (dupError) {
            console.error(`[import] Row ${i + 1}: Failed to save duplicate:`, dupError);
            throw dupError;
          }
        } else if (validation.validation.isValid) {
          // Create new lead
          console.log(`[import] Row ${i + 1}: Creating new lead`);
          
          try {
            const created = await dataStore.createLead(lead);
            
            report.imported++;
            report.details.push({
              originalRow: csvData[i],
              result: 'imported',
              leadId: created.id,
              filePath: `${getLeadFolderByStage(created.stage)}/${getLeadFilename(created.firstName, created.lastName)}`
            });
            
            console.log(`[import] Row ${i + 1}: Lead created with ID ${created.id}`);
          } catch (createError) {
            console.error(`[import] Row ${i + 1}: Failed to create lead:`, createError);
            throw createError;
          }
        } else {
          // Invalid lead data
          console.warn(`[import] Row ${i + 1}: Invalid data:`, validation.validation.errors);
          
          report.errors++;
          report.details.push({
            originalRow: csvData[i],
            result: 'error',
            error: validation.validation.errors.join('; ')
          });
        }
      } catch (error: unknown) {
        console.error(`[import] Row ${i + 1}: Unexpected error:`, error);
        
        report.errors++;
        report.details.push({
          originalRow: csvData[i],
          result: 'error',
          error: (error instanceof Error ? error.message : String(error))
        });
      }
    }

    // Save import report
    try {
      const reportFilename = `import-${format(new Date(), 'yyyyMMdd_HHmm')}.json`;
      await fs.writeFile(
        `${FOLDER_STRUCTURE.imports}/${reportFilename}`,
        JSON.stringify(report, null, 2)
      );
      console.log(`[import] Report saved to ${reportFilename}`);
    } catch (error) {
      console.error('[import] Failed to save import report:', error);
      // Don't fail the import if we can't save the report
    }

    // Refresh the index to show new leads immediately
    try {
      await indexService.fullScan();
      console.log('[import] Index refreshed after import');
    } catch (e: unknown) {
      console.error('[import] post-import scan failed', e);
    }

    setImportReport(report);
    setImporting(false);
    setStep('import');
    
    toast.success(`Import complete: ${report.imported} imported, ${report.duplicates} duplicates, ${report.errors} errors`);
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex justify-between mb-8">
        {['upload', 'mapping', 'validation', 'review', 'import'].map((s, i) => (
          <div
            key={s}
            className={`flex items-center ${i < 4 ? 'flex-1' : ''}`}
          >
            <div
              className={`
                w-10 h-10 rounded-full flex items-center justify-center font-semibold
                ${step === s ? 'bg-primary text-primary-foreground' : 
                  ['upload', 'mapping', 'validation', 'review', 'import'].indexOf(step) > i ? 
                  'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}
              `}
            >
              {['upload', 'mapping', 'validation', 'review', 'import'].indexOf(step) > i ? 
                <CheckCircle className="h-5 w-5" /> : i + 1}
            </div>
            {i < 4 && (
              <div className={`flex-1 h-1 mx-2 ${
                ['upload', 'mapping', 'validation', 'review', 'import'].indexOf(step) > i ? 
                'bg-green-500' : 'bg-muted'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {step === 'upload' && (
        <div>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
              transition-colors hover:border-primary hover:bg-muted/50
              ${isDragActive ? 'border-primary bg-muted' : 'border-muted-foreground/25'}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">
              {isDragActive ? 'Drop the CSV file here' : 'Drag & drop your CSV file here'}
            </p>
            <p className="text-sm text-muted-foreground">
              or click to select a file
            </p>
          </div>
        </div>
      )}

      {step === 'mapping' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Map CSV Columns</h3>
          <p className="text-sm text-muted-foreground">
            Map your CSV columns to lead fields. We&apos;ve auto-detected some mappings for you.
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            {headers.map(header => (
              <div key={header} className="flex items-center gap-2">
                <Label className="w-1/2 text-sm">{header}:</Label>
                <Select
                  value={mapping[header]}
                  onValueChange={(value) => setMapping({ ...mapping, [header]: value as (keyof Lead | 'meta' | 'ignore') })}
                >
                  <SelectTrigger className="w-1/2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ignore">Ignore</SelectItem>
                    <SelectItem value="firstName">First Name</SelectItem>
                    <SelectItem value="lastName">Last Name</SelectItem>
                    <SelectItem value="phones">Phone(s)</SelectItem>
                    <SelectItem value="emails">Email(s)</SelectItem>
                    <SelectItem value="stage">Stage</SelectItem>
                    <SelectItem value="tags">Tags</SelectItem>
                    <SelectItem value="createdAt">Created Date</SelectItem>
                    <SelectItem value="source">Source</SelectItem>
                    <SelectItem value="meta">Store in Meta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('upload')}>
              Back
            </Button>
            <Button onClick={handleMapping}>
              Continue to Validation
            </Button>
          </div>
        </div>
      )}

      {step === 'validation' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Validation Results</h3>
          
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {validationResults.filter(v => v.validation.isValid && !v.duplicate.isDuplicate).length}
                    </p>
                    <p className="text-sm text-muted-foreground">Valid Leads</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {duplicateResults.length}
                    </p>
                    <p className="text-sm text-muted-foreground">Duplicates</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {validationResults.filter(v => !v.validation.isValid).length}
                    </p>
                    <p className="text-sm text-muted-foreground">Errors</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="warnings">
            <TabsList>
              <TabsTrigger value="warnings">
                Warnings ({validationResults.filter(v => v.validation.warnings.length > 0).length})
              </TabsTrigger>
              <TabsTrigger value="duplicates">
                Duplicates ({duplicateResults.length})
              </TabsTrigger>
              <TabsTrigger value="errors">
                Errors ({validationResults.filter(v => !v.validation.isValid).length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="warnings" className="space-y-2">
              {validationResults
                .filter(v => v.validation.warnings.length > 0)
                .slice(0, 10)
                .map((v, i) => (
                  <Alert key={i}>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Row {i + 1}: {v.validation.warnings.join(', ')}
                    </AlertDescription>
                  </Alert>
                ))}
            </TabsContent>
            
            <TabsContent value="duplicates" className="space-y-2">
              {duplicateResults.slice(0, 10).map((v, i) => (
                <Alert key={i}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {v.lead.firstName} {v.lead.lastName}: {v.duplicate.reason}
                  </AlertDescription>
                </Alert>
              ))}
            </TabsContent>
            
            <TabsContent value="errors" className="space-y-2">
              {validationResults
                .filter(v => !v.validation.isValid)
                .slice(0, 10)
                .map((v, i) => (
                  <Alert key={i} variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      Row {i + 1}: {v.validation.errors.join(', ')}
                    </AlertDescription>
                  </Alert>
                ))}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mapping')}>
              Back
            </Button>
            <Button onClick={() => setStep('review')}>
              Continue to Review
            </Button>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Import Summary</h3>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold mb-2">Ready to import:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>{validationResults.filter(v => v.validation.isValid && !v.duplicate.isDuplicate).length} leads will be imported to Active folder</li>
                <li>{duplicateResults.length} duplicates will be saved to Potential Duplicates folder</li>
                <li>{validationResults.filter(v => !v.validation.isValid).length} rows will be skipped due to errors</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('validation')}>
              Back
            </Button>
            <Button onClick={handleImport} disabled={importing}>
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                'Start Import'
              )}
            </Button>
          </div>
        </div>
      )}

      {step === 'import' && importReport && (
        <div className="space-y-4">
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Import Complete!</h3>
            <p className="text-muted-foreground">
              Successfully imported {importReport.imported} leads
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-bold text-green-600">{importReport.imported}</p>
                <p className="text-sm text-muted-foreground">Imported</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-bold text-yellow-600">{importReport.duplicates}</p>
                <p className="text-sm text-muted-foreground">Duplicates</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-bold text-red-600">{importReport.errors}</p>
                <p className="text-sm text-muted-foreground">Errors</p>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              Import report saved to: Imports/import-{format(new Date(importReport.timestamp), 'yyyyMMdd_HHmm')}.json
            </AlertDescription>
          </Alert>

          <div className="flex justify-center">
            <Button onClick={() => {
              onComplete();
              router.push('/');
            }}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}