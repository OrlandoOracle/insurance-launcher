'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, ChevronUp, ChevronDown, Edit, Trash, Copy } from 'lucide-react';
import { format } from 'date-fns';
import type { IndexEntry } from '@/lib/schema';
import { StageEnum } from '@/lib/schema';
import { LeadEditorPanel } from './LeadEditorPanel';

interface LeadTableProps {
  leads: IndexEntry[];
  onUpdate: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

type SortField = 'name' | 'stage' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

export function LeadTable({ leads, onUpdate, onDelete, onDuplicate }: LeadTableProps) {
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const stages = StageEnum.options;

  const filteredAndSorted = useMemo(() => {
    let filtered = [...leads];

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(lead =>
        lead.firstName.toLowerCase().includes(q) ||
        lead.lastName.toLowerCase().includes(q) ||
        lead.emails.some(e => e.toLowerCase().includes(q)) ||
        lead.phones.some(p => p.includes(q))
      );
    }

    // Stage filter
    if (stageFilter !== 'all') {
      filtered = filtered.filter(lead => lead.stage === stageFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let compareValue = 0;

      switch (sortField) {
        case 'name':
          compareValue = `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
          break;
        case 'stage':
          compareValue = a.stage.localeCompare(b.stage);
          break;
        case 'updatedAt':
          compareValue = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return filtered;
  }, [leads, search, stageFilter, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? 
      <ChevronUp className="h-4 w-4 inline ml-1" /> : 
      <ChevronDown className="h-4 w-4 inline ml-1" />;
  };

  const getStageColor = (stage: string) => {
    if (stage.includes('Sold')) return 'bg-green-500';
    if (stage.includes('Lost')) return 'bg-red-500';
    if (stage.includes('Discovery')) return 'bg-blue-500';
    if (stage.includes('Pitch')) return 'bg-purple-500';
    if (stage.includes('Close')) return 'bg-orange-500';
    return 'bg-gray-500';
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {stages.map(stage => (
                <SelectItem key={stage} value={stage}>{stage}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => toggleSort('name')}
                >
                  Name <SortIcon field="name" />
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => toggleSort('stage')}
                >
                  Stage <SortIcon field="stage" />
                </TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => toggleSort('updatedAt')}
                >
                  Last Modified <SortIcon field="updatedAt" />
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {search || stageFilter !== 'all' ? 'No leads match your filters' : 'No leads found'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSorted.map((lead) => (
                  <TableRow 
                    key={lead.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedLeadId(lead.id)}
                  >
                    <TableCell className="font-medium">
                      {lead.firstName} {lead.lastName}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStageColor(lead.stage)} variant="secondary">
                        {lead.stage}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {lead.phones[0] || '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {lead.emails[0] || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(lead.updatedAt), 'MMM d, yyyy h:mm a')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedLeadId(lead.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDuplicate(lead.id)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => onDelete(lead.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="text-sm text-muted-foreground">
          Showing {filteredAndSorted.length} of {leads.length} leads
        </div>
      </div>

      {selectedLeadId && (
        <LeadEditorPanel
          leadId={selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
          onSave={() => {
            onUpdate();
            setSelectedLeadId(null);
          }}
        />
      )}
    </>
  );
}