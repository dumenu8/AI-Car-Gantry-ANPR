import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

// 1. Load environment variables from your .env file
dotenv.config();

// IF THIS PRINTS "undefined", THAT IS OUR BUG!
console.log("My DB URL is:", process.env.DATABASE_URL);

// 1. Setup the connection pool using the standard pg library
const connectionString = process.env.DATABASE_URL;

// 2. Safety check: Ensure the URL was actually found
if (!connectionString) {
  console.error("❌ ERROR: DATABASE_URL is missing. Please check your .env file.");
  process.exit(1);
}

// 3. Setup the connection pool using the standard pg library
const pool = new Pool({ connectionString });

// 4. Create the Prisma adapter and initialize the client
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });



async function main() {
  console.log('Starting to seed database...');

  const adminVehicle = await prisma.vehicle.upsert({
    where: { plateNumber: '1กก 7890' },
    update: {}, // If it exists, do nothing
    create: {
      plateNumber: '1กก 7890',
      province: 'กรุงเทพมหานคร',
      isRegistered: true,
      isBanned: false,
    },
  });

  console.log('✅ Seed successful:', { adminVehicle });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error during seeding:', e);
    await prisma.$disconnect();
    process.exit(1);
  });