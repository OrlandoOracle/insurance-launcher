import { prisma } from '@/lib/db'

async function cleanupDemoData() {
  console.log('Starting cleanup of demo/seed data...')
  
  try {
    // Delete demo leads that were likely created as test data
    // These are identified by common test patterns
    const demoPatterns = [
      // Email patterns
      { email: { contains: 'test' } },
      { email: { contains: 'demo' } },
      { email: { contains: 'example' } },
      { email: { endsWith: '@example.com' } },
      
      // Name patterns
      { firstName: { in: ['Test', 'Demo', 'Sample', 'John', 'Jane'] } },
      { lastName: { in: ['Test', 'Demo', 'Sample', 'Doe', 'User'] } },
      
      // Source patterns indicating demo data
      { source: { contains: 'Demo' } },
      { source: { contains: 'Sample' } },
      { source: { contains: 'Test' } },
      
      // Common test phone numbers
      { phone: { in: ['(555) 555-5555', '(123) 456-7890', '(000) 000-0000'] } }
    ]
    
    let totalDeleted = 0
    
    for (const pattern of demoPatterns) {
      const result = await prisma.lead.deleteMany({
        where: pattern
      })
      
      if (result.count > 0) {
        console.log(`Deleted ${result.count} records matching:`, pattern)
        totalDeleted += result.count
      }
    }
    
    // Also clean up leads without any real identifying information
    const emptyLeads = await prisma.lead.deleteMany({
      where: {
        AND: [
          { email: null },
          { phone: null },
          { ghlId: null }
        ]
      }
    })
    
    if (emptyLeads.count > 0) {
      console.log(`Deleted ${emptyLeads.count} leads with no contact information`)
      totalDeleted += emptyLeads.count
    }
    
    // Clean up orphaned activities (activities without a lead)
    const orphanedActivities = await prisma.activity.deleteMany({
      where: {
        contactId: null
      }
    })
    
    if (orphanedActivities.count > 0) {
      console.log(`Deleted ${orphanedActivities.count} orphaned activities`)
    }
    
    // Clean up orphaned tasks
    const orphanedTasks = await prisma.task.deleteMany({
      where: {
        contactId: null
      }
    })
    
    if (orphanedTasks.count > 0) {
      console.log(`Deleted ${orphanedTasks.count} orphaned tasks`)
    }
    
    console.log(`\nCleanup complete! Removed ${totalDeleted} demo leads.`)
    
    // Show remaining lead count
    const remainingLeads = await prisma.lead.count()
    console.log(`${remainingLeads} real leads remain in the database.`)
    
  } catch (error) {
    console.error('Error during cleanup:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the cleanup
cleanupDemoData()