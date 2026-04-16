const { PrismaClient } = require('@prisma/client');

// keep a single prisma instance so we don't open a new db connection on every request
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
});

module.exports = prisma;
