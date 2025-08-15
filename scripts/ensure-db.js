const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Set up database path
const dataDir = process.env.DATA_DIR?.trim() || path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'insurance-launcher.db');
process.env.DATABASE_URL = `file:${dbPath}`;

console.log('[DB] Ensuring database at:', dbPath);

function run(cmd, args) {
  console.log(`Running: ${cmd} ${args.join(' ')}`);
  const result = spawnSync(cmd, args, { 
    stdio: 'inherit', 
    env: process.env,
    shell: true 
  });
  
  if (result.error) {
    console.error('Command failed:', result.error);
    return false;
  }
  
  return result.status === 0;
}

// Check if migrations folder exists
const migrationsPath = path.join(process.cwd(), 'prisma', 'migrations');
const hasMigrations = fs.existsSync(migrationsPath) && fs.readdirSync(migrationsPath).length > 0;

let success = false;

if (hasMigrations) {
  console.log('Applying migrations...');
  success = run('npx', ['prisma', 'migrate', 'deploy']);
  
  if (!success) {
    console.log('Migration failed, trying db push as fallback...');
    success = run('npx', ['prisma', 'db', 'push', '--accept-data-loss']);
  }
} else {
  console.log('No migrations found, using db push...');
  success = run('npx', ['prisma', 'db', 'push', '--accept-data-loss']);
}

if (success) {
  console.log('Database schema applied successfully!');
  
  // Check if we need to seed
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    prisma.$connect().then(async () => {
      const contactCount = await prisma.contact.count();
      
      if (contactCount === 0) {
        console.log('Database is empty, running seed...');
        run('node', ['prisma/seed.mjs']);
      } else {
        console.log(`Database has ${contactCount} contacts, skipping seed.`);
      }
      
      await prisma.$disconnect();
    }).catch(async (e) => {
      console.error('Error checking database:', e);
      await prisma.$disconnect();
    });
  } catch (e) {
    console.log('Could not check if seeding needed:', e.message);
  }
} else {
  console.error('Failed to set up database!');
  process.exit(1);
}