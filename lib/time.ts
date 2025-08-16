/**
 * Time utilities for scheduling tasks
 */

/**
 * Get tomorrow at 10:00 AM in user's local timezone
 */
export function getTomorrowAt10AM(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  return tomorrow;
}

/**
 * Get today at 5:00 PM in user's local timezone
 * If it's already past 5 PM, returns tomorrow at 10:00 AM instead
 */
export function getTodayAt5PMOrTomorrow10AM(): Date {
  const now = new Date();
  const today5PM = new Date();
  today5PM.setHours(17, 0, 0, 0);
  
  // If it's already past 5 PM, return tomorrow at 10 AM
  if (now >= today5PM) {
    return getTomorrowAt10AM();
  }
  
  return today5PM;
}

/**
 * Get a date at a specific time
 * @param daysFromNow Number of days from now (0 = today, 1 = tomorrow, etc.)
 * @param hour Hour in 24-hour format (0-23)
 * @param minute Minute (0-59)
 */
export function getDateAtTime(daysFromNow: number, hour: number, minute: number = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, minute, 0, 0);
  return date;
}

/**
 * Format a date for display in task lists
 * @param date The date to format
 * @returns A human-readable string like "Tomorrow at 10:00 AM" or "Dec 25 at 3:00 PM"
 */
export function formatTaskDueDate(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  let dayPart = '';
  if (taskDate.getTime() === today.getTime()) {
    dayPart = 'Today';
  } else if (taskDate.getTime() === tomorrow.getTime()) {
    dayPart = 'Tomorrow';
  } else {
    // Use month and day for other dates
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    dayPart = date.toLocaleDateString('en-US', options);
  }
  
  // Format time
  const timeOptions: Intl.DateTimeFormatOptions = { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  };
  const timePart = date.toLocaleTimeString('en-US', timeOptions);
  
  return `${dayPart} at ${timePart}`;
}

/**
 * Check if a date is overdue
 */
export function isOverdue(date: Date): boolean {
  return date < new Date();
}

/**
 * Check if a date is within the next N hours
 */
export function isWithinHours(date: Date, hours: number): boolean {
  const now = new Date();
  const futureTime = new Date(now.getTime() + hours * 60 * 60 * 1000);
  return date >= now && date <= futureTime;
}