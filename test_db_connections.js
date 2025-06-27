const mongoose = require('mongoose');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function testMongo() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connection: SUCCESS');
    await mongoose.disconnect();
  } catch (err) {
    console.error('MongoDB connection: FAIL', err.message);
  }
}

async function testPrisma() {
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    console.log('Postgres (Prisma) connection: SUCCESS');
    await prisma.$disconnect();
  } catch (err) {
    console.error('Postgres (Prisma) connection: FAIL', err.message);
  }
}

(async () => {
  await testMongo();
  await testPrisma();
})();
