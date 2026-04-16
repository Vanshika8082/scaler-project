require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE event_types ADD COLUMN bufferBefore INT NOT NULL DEFAULT 0, ADD COLUMN bufferAfter INT NOT NULL DEFAULT 0'
    );
    console.log('Buffer columns added!');
  } catch (e) {
    if (e.message && (e.message.includes('Duplicate') || e.message.includes('1060'))) {
      console.log('Columns already exist, skipping.');
    } else {
      console.error('Error:', e.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

run();
