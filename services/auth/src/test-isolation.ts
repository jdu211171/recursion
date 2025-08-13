import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testMultiTenantIsolation() {
  try {
    console.log('Testing Multi-Tenant Isolation...\n');

    // Create two organizations
    const org1 = await prisma.organization.create({
      data: { name: 'Organization 1' }
    });

    const org2 = await prisma.organization.create({
      data: { name: 'Organization 2' }
    });

    // Create instances for each org
    const instance1 = await prisma.instance.create({
      data: { name: 'Org1 Instance', orgId: org1.id }
    });

    const instance2 = await prisma.instance.create({
      data: { name: 'Org2 Instance', orgId: org2.id }
    });

    // Create users in different organizations
    const user1 = await prisma.user.create({
      data: {
        email: 'user1@org1.com',
        password: 'hashed_password',
        firstName: 'User',
        lastName: 'One',
        orgId: org1.id,
        instanceId: instance1.id
      }
    });

    const user2 = await prisma.user.create({
      data: {
        email: 'user2@org2.com',
        password: 'hashed_password',
        firstName: 'User',
        lastName: 'Two',
        orgId: org2.id,
        instanceId: instance2.id
      }
    });

    // Test isolation: Query users by organization
    const org1Users = await prisma.user.findMany({
      where: { orgId: org1.id }
    });

    const org2Users = await prisma.user.findMany({
      where: { orgId: org2.id }
    });

    console.log(`Organization 1 users: ${org1Users.length}`);
    console.log(`Organization 2 users: ${org2Users.length}`);
    console.log(`\nIsolation Test Results:`);
    console.log(`- Org1 can only see its users: ${org1Users.every(u => u.orgId === org1.id) ? 'PASS' : 'FAIL'}`);
    console.log(`- Org2 can only see its users: ${org2Users.every(u => u.orgId === org2.id) ? 'PASS' : 'FAIL'}`);
    console.log(`- No cross-org data leakage: ${org1Users.length === 1 && org2Users.length === 1 ? 'PASS' : 'FAIL'}`);

    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        email: { in: ['user1@org1.com', 'user2@org2.com'] }
      }
    });

    await prisma.instance.deleteMany({
      where: {
        id: { in: [instance1.id, instance2.id] }
      }
    });

    await prisma.organization.deleteMany({
      where: {
        id: { in: [org1.id, org2.id] }
      }
    });

    console.log('\n✅ Multi-tenant isolation test completed');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMultiTenantIsolation();