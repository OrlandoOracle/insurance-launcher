'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { format } from 'date-fns'
import { DateRange } from 'react-day-picker'
import { cn } from '@/lib/utils'

interface RangePickerProps {
  value: string
  onRangeChange: (preset: string, customRange?: { from: Date; to: Date }) => void
}

export function RangePicker({ value, onRangeChange }: RangePickerProps) {
  const [isCustomOpen, setIsCustomOpen] = useState(false)
  const [customRange, setCustomRange] = useState<DateRange | undefined>()

  const handlePresetChange = (preset: string) => {
    if (preset === 'custom') {
      setIsCustomOpen(true)
    } else {
      onRangeChange(preset)
    }
  }

  const handleCustomRangeSelect = () => {
    if (customRange?.from && customRange?.to) {
      onRangeChange('custom', { from: customRange.from, to: customRange.to })
      setIsCustomOpen(false)
    }
  }

  const getDisplayValue = () => {
    if (value === 'custom' && customRange?.from && customRange?.to) {
      return `${format(customRange.from, 'MMM d')} - ${format(customRange.to, 'MMM d')}`
    }
    
    switch (value) {
      case 'today':
        return 'Today'
      case 'week':
        return 'This Week'
      case '7d':
        return 'Last 7 Days'
      case '30d':
        return 'Last 30 Days'
      default:
        return 'Select Range'
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue>{getDisplayValue()}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="week">This Week</SelectItem>
          <SelectItem value="7d">Last 7 Days</SelectItem>
          <SelectItem value="30d">Last 30 Days</SelectItem>
          <SelectItem value="custom">Custom Range...</SelectItem>
        </SelectContent>
      </Select>

      <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn('hidden', value === 'custom' && 'inline-flex')}
          >
            <Calendar className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-4">
            <p className="text-sm text-muted-foreground mb-2">
              Select a date range
            </p>
            <div className="flex gap-2">
              <input
                type="date"
                onChange={(e) => setCustomRange({ 
                  from: e.target.value ? new Date(e.target.value) : undefined,
                  to: customRange?.to 
                })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <input
                type="date"
                onChange={(e) => setCustomRange({ 
                  from: customRange?.from,
                  to: e.target.value ? new Date(e.target.value) : undefined
                })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCustomOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCustomRangeSelect}
                disabled={!customRange?.from || !customRange?.to}
              >
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}