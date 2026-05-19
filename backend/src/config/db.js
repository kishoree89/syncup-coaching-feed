// Single PrismaClient instance for the whole app.
// Reusing one client avoids exhausting Postgres connections.
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

module.exports = prisma;
