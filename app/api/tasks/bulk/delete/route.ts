import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import type { TaskFilters } from '@/components/tasks/useBulkSelectionStore';
import type { Prisma } from '@prisma/client';

export async function POST(req: Request) {
  try {
    const { scope, filters, ids } = await req.json();

    // Build the where clause based on scope
    const where = scope === 'GLOBAL' 
      ? filtersToWhere(filters) 
      : { id: { in: ids ?? [] } };

    // Count matching records before deletion
    const matched = await prisma.task.count({ where });
    
    // Store task data for potential undo (optional enhancement)
    // const tasksToDelete = await prisma.task.findMany({ where });
    
    // Perform the bulk deletion
    const result = await prisma.task.deleteMany({ where });
    
    return NextResponse.json({ 
      matched, 
      deleted: result.count,
      success: true 
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete tasks', success: false },
      { status: 500 }
    );
  }
}

function filtersToWhere(filters: TaskFilters | undefined): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = {};
  
  if (!filters) return where;
  
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
      contains: filters.q
    } as any;
  }
  
  // Label filter
  if (filters.label) {
    where.label = {
      contains: filters.label
    } as any;
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