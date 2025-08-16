import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import type { TaskFilters } from '@/components/tasks/useBulkSelectionStore';
import type { Prisma } from '@prisma/client';

export async function POST(req: Request) {
  try {
    const { scope, filters, ids, patch } = await req.json();

    // Build the where clause based on scope
    const where = scope === 'GLOBAL' 
      ? filtersToWhere(filters) 
      : { id: { in: ids ?? [] } };

    // Sanitize and build the update data
    const data: Prisma.TaskUpdateManyMutationInput = {};
    
    if (patch.status) {
      data.status = patch.status;
    }
    
    if ('dueAt' in patch) {
      data.dueAt = patch.dueAt ? new Date(patch.dueAt) : null;
    }
    
    if (patch.priority) {
      data.priority = patch.priority;
    }
    
    if ('label' in patch) {
      data.label = patch.label ?? null;
    }
    
    if (patch.stage) {
      data.stage = patch.stage;
    }
    
    // Auto-archive/unarchive based on status
    if (patch.status === 'DONE') {
      const now = new Date();
      data.archivedAt = now;
      data.completedAt = data.completedAt ?? now;
    } else if (patch.status === 'OPEN') {
      data.archivedAt = null;
      data.completedAt = null;
    }

    // Count matching records before update
    const matched = await prisma.task.count({ where });
    
    // Perform the bulk update
    const result = await prisma.task.updateMany({ where, data });
    
    return NextResponse.json({ 
      matched, 
      modified: result.count,
      success: true 
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    return NextResponse.json(
      { error: 'Failed to update tasks', success: false },
      { status: 500 }
    );
  }
}

function filtersToWhere(filters: TaskFilters | undefined): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = {};
  
  if (!filters) return where;
  
  // Exclude archived tasks by default unless explicitly requested
  if (!filters.showArchived) {
    where.archivedAt = null;
  }
  
  // Status filter
  if (filters.status?.length) {
    where.status = { in: filters.status };
  }
  
  // Stage filter
  if (filters.stage?.length) {
    where.stage = { in: filters.stage };
  }
  
  // Priority filter
  if (filters.priority?.length) {
    where.priority = { in: filters.priority };
  }
  
  // Contact filter
  if (filters.contactId) {
    where.contactId = filters.contactId;
  }
  
  // Text search
  if (filters.q) {
    where.title = { 
      contains: filters.q,
      mode: 'insensitive' 
    };
  }
  
  // Label filter
  if (filters.label) {
    where.label = {
      contains: filters.label,
      mode: 'insensitive'
    };
  }
  
  // Date range filters
  const dateFilters: Prisma.TaskWhereInput[] = [];
  
  if (filters.dueFrom) {
    dateFilters.push({
      dueAt: { gte: new Date(filters.dueFrom) }
    });
  }
  
  if (filters.dueTo) {
    dateFilters.push({
      dueAt: { lte: new Date(filters.dueTo) }
    });
  }
  
  if (dateFilters.length > 0) {
    where.AND = dateFilters;
  }
  
  return where;
}