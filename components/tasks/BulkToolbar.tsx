'use client'

import { useState } from 'react';
import { useBulkSelectionStore } from './useBulkSelectionStore';
import { Button } from '@/components/ui/button';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { 
  CheckCircle, 
  Clock, 
  Calendar as CalendarIcon,
  Tag,
  Flag,
  Trash2,
  X,
  Layers
} from 'lucide-react';
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

export type BulkAction = 
  | { type: 'status'; value: 'OPEN' | 'DONE' }
  | { type: 'dueAt'; value: string | null }
  | { type: 'priority'; value: 'LOW' | 'MEDIUM' | 'HIGH' }
  | { type: 'stage'; value: 'NEW' | 'WORKING' | 'WAITING' | 'DONE' }
  | { type: 'label'; value: string | null }
  | { type: 'delete' };

interface BulkToolbarProps {
  onAction: (action: BulkAction) => Promise<void>;
  totalTasks?: number;
}

export function BulkToolbar({ onAction, totalTasks }: BulkToolbarProps) {
  const { 
    mode, 
    allMatchingSelected, 
    selectedIdsOnPage, 
    totalMatchingCount, 
    clear 
  } = useBulkSelectionStore();

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [globalActionDialog, setGlobalActionDialog] = useState<{
    open: boolean;
    action: BulkAction | null;
  }>({ open: false, action: null });

  if (mode === 'NONE') return null;

  const count = allMatchingSelected ? totalMatchingCount : selectedIdsOnPage.size;

  const handleAction = async (action: BulkAction) => {
    if (allMatchingSelected && action.type !== 'delete') {
      // Show confirmation for global actions
      setGlobalActionDialog({ open: true, action });
    } else if (action.type === 'delete') {
      setDeleteDialogOpen(true);
    } else {
      await onAction(action);
    }
  };

  const confirmGlobalAction = async () => {
    if (globalActionDialog.action) {
      await onAction(globalActionDialog.action);
      setGlobalActionDialog({ open: false, action: null });
    }
  };

  const confirmDelete = async () => {
    await onAction({ type: 'delete' });
    setDeleteDialogOpen(false);
  };

  const handleDateSelect = async (date: Date | undefined) => {
    if (date) {
      await handleAction({ 
        type: 'dueAt', 
        value: format(date, 'yyyy-MM-dd') 
      });
      setDatePickerOpen(false);
      setSelectedDate(undefined);
    }
  };

  return (
    <>
      <div className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="container mx-auto flex items-center gap-2 px-4 py-2">
          <span className="text-sm font-medium">
            {allMatchingSelected 
              ? `All ${count} matching selected` 
              : `${count} selected`}
          </span>
          
          <div className="flex items-center gap-1 border-l pl-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleAction({ type: 'status', value: 'DONE' })}
              title="Mark as Done (D)"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Done
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleAction({ type: 'status', value: 'OPEN' })}
              title="Mark as Open (O)"
            >
              <Clock className="h-4 w-4 mr-1" />
              Open
            </Button>
            
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button size="sm" variant="ghost">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  Due Date
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                />
                <div className="p-2 border-t">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      handleAction({ type: 'dueAt', value: null });
                      setDatePickerOpen(false);
                    }}
                  >
                    Clear Due Date
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="ghost">
                  <Flag className="h-4 w-4 mr-1" />
                  Priority
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-1">
                <div className="flex flex-col">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="justify-start"
                    onClick={() => handleAction({ type: 'priority', value: 'HIGH' })}
                  >
                    <Flag className="h-4 w-4 mr-2 text-red-500" />
                    High
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="justify-start"
                    onClick={() => handleAction({ type: 'priority', value: 'MEDIUM' })}
                  >
                    <Flag className="h-4 w-4 mr-2 text-yellow-500" />
                    Medium
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="justify-start"
                    onClick={() => handleAction({ type: 'priority', value: 'LOW' })}
                  >
                    <Flag className="h-4 w-4 mr-2 text-gray-400" />
                    Low
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="ghost">
                  <Layers className="h-4 w-4 mr-1" />
                  Stage
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-1">
                <div className="flex flex-col">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="justify-start"
                    onClick={() => handleAction({ type: 'stage', value: 'NEW' })}
                  >
                    New
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="justify-start"
                    onClick={() => handleAction({ type: 'stage', value: 'WORKING' })}
                  >
                    Working
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="justify-start"
                    onClick={() => handleAction({ type: 'stage', value: 'WAITING' })}
                  >
                    Waiting
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="justify-start"
                    onClick={() => handleAction({ type: 'stage', value: 'DONE' })}
                  >
                    Done
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600 hover:text-red-700"
              onClick={() => setDeleteDialogOpen(true)}
              title="Delete (Delete/Backspace)"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            onClick={clear}
            title="Clear Selection (U)"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tasks</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {count} task{count !== 1 ? 's' : ''}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Global action confirmation dialog */}
      <AlertDialog 
        open={globalActionDialog.open} 
        onOpenChange={(open) => setGlobalActionDialog({ open, action: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply to All Matching Tasks</AlertDialogTitle>
            <AlertDialogDescription>
              This action will be applied to all {totalMatchingCount} tasks matching 
              the current filter. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmGlobalAction}>
              Apply to All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}