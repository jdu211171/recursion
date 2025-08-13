require('dotenv').config();
const { execSync } = require('child_process');

const services = ['auth', 'business-logic', 'file-storage'];

const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = process.env;
const DATABASE_URL = `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

services.forEach(service => {
  console.log(`Running migrations for ${service}...`);
  try {
    execSync(`DATABASE_URL=${DATABASE_URL} bunx prisma migrate reset --force --schema=./services/${service}/prisma/schema.prisma`, { stdio: 'inherit' });
    execSync(`DATABASE_URL=${DATABASE_URL} bunx prisma migrate dev --schema=./services/${service}/prisma/schema.prisma`, { stdio: 'inherit' });
    execSync(`DATABASE_URL=${DATABASE_URL} bunx prisma generate --schema=./services/${service}/prisma/schema.prisma`, { stdio: 'inherit' });
    console.log(`Migrations and client generation for ${service} completed successfully.`);
  } catch (error) {
    console.error(`Error running migrations for ${service}:`, error);
  }
});
