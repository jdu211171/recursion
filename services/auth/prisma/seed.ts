import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

// Get seed size from environment or default to medium
const SEED_SIZE = process.env.SEED_SIZE || 'medium'

// Configuration based on seed size
const CONFIG = {
  small: { orgs: 1, usersPerOrg: 10, instancesPerOrg: 2 },
  medium: { orgs: 3, usersPerOrg: 15, instancesPerOrg: 3 },
  large: { orgs: 5, usersPerOrg: 40, instancesPerOrg: 4 }
}

const config = CONFIG[SEED_SIZE as keyof typeof CONFIG] || CONFIG.medium

// Sample organization data
const ORGANIZATIONS = [
  { name: 'City University Library', deploymentType: 'dedicated' },
  { name: 'TechCorp Equipment Center', deploymentType: 'shared' },
  { name: 'Community Resource Hub', deploymentType: 'shared' },
  { name: 'Regional Medical Center', deploymentType: 'dedicated' },
  { name: 'Sports Complex Authority', deploymentType: 'shared' }
]

// Instance templates per organization type
const INSTANCE_TEMPLATES = {
  'City University Library': ['Main Library', 'Science Library', 'Digital Resources', 'Rare Books'],
  'TechCorp Equipment Center': ['Electronics Lab', 'Hardware Tools', 'Testing Equipment', 'Office Supplies'],
  'Community Resource Hub': ['Books & Media', 'Event Equipment', 'Sports Gear', 'Art Supplies'],
  'Regional Medical Center': ['Medical Equipment', 'Training Materials', 'Research Resources', 'Patient Devices'],
  'Sports Complex Authority': ['Indoor Sports', 'Outdoor Equipment', 'Water Sports', 'Fitness Center']
}

async function clearDatabase() {
  console.log('🧹 Clearing existing data...')
  
  // Delete in reverse order of dependencies
  await prisma.passwordResetToken.deleteMany()
  await prisma.userSession.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.apiKey.deleteMany()
  await prisma.userFeedback.deleteMany()
  await prisma.approvalWorkflow.deleteMany()
  await prisma.backgroundJob.deleteMany()
  await prisma.emailQueue.deleteMany()
  await prisma.systemNotification.deleteMany()
  await prisma.userPreference.deleteMany()
  await prisma.itemHistory.deleteMany()
  await prisma.lending.deleteMany()
  await prisma.reservation.deleteMany()
  await prisma.blacklist.deleteMany()
  await prisma.fileMetadata.deleteMany()
  await prisma.item.deleteMany()
  await prisma.category.deleteMany()
  await prisma.lendingPolicy.deleteMany()
  await prisma.customizationAuditLog.deleteMany()
  // customFieldValue doesn't exist in this schema
  await prisma.customFieldDefinition.deleteMany()
  await prisma.featureFlag.deleteMany()
  await prisma.orgConfiguration.deleteMany()
  await prisma.userActivityLog.deleteMany()
  await prisma.user.deleteMany()
  await prisma.instance.deleteMany()
  await prisma.organization.deleteMany()
  
  console.log('✅ Database cleared')
}

async function seedOrganizations() {
  console.log(`🏢 Creating ${config.orgs} organizations...`)
  
  const orgs = []
  for (let i = 0; i < config.orgs && i < ORGANIZATIONS.length; i++) {
    const org = await prisma.organization.create({
      data: ORGANIZATIONS[i]
    })
    orgs.push(org)
    console.log(`  ✓ Created org: ${org.name}`)
  }
  
  return orgs
}

async function seedInstances(organizations: any[]) {
  console.log(`🏗️  Creating instances...`)
  
  const instances = []
  for (const org of organizations) {
    const templates = INSTANCE_TEMPLATES[org.name as keyof typeof INSTANCE_TEMPLATES] || ['General', 'Special', 'Archive']
    
    for (let i = 0; i < config.instancesPerOrg && i < templates.length; i++) {
      const instance = await prisma.instance.create({
        data: {
          name: templates[i],
          orgId: org.id
        }
      })
      instances.push(instance)
      console.log(`  ✓ Created instance: ${instance.name} (${org.name})`)
    }
  }
  
  return instances
}

async function seedUsers(organizations: any[], instances: any[]) {
  console.log(`👥 Creating users...`)
  
  const users = []
  const hashedPassword = await bcrypt.hash('password123', 10)
  
  for (const org of organizations) {
    const orgInstances = instances.filter(inst => inst.orgId === org.id)
    
    // Create one admin per org
    const admin = await prisma.user.create({
      data: {
        email: `admin@${org.name.toLowerCase().replace(/\s+/g, '')}.com`,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: org.name.split(' ')[0],
        role: UserRole.ADMIN,
        orgId: org.id,
        instanceId: orgInstances[0]?.id,
        contactInfo: 'Admin Office, Ext 100'
      }
    })
    users.push(admin)
    console.log(`  ✓ Created admin: ${admin.email}`)
    
    // Create staff members (20% of users)
    const staffCount = Math.floor(config.usersPerOrg * 0.2)
    for (let i = 0; i < staffCount; i++) {
      const instance = orgInstances[i % orgInstances.length]
      const staff = await prisma.user.create({
        data: {
          email: `staff${i + 1}@${org.name.toLowerCase().replace(/\s+/g, '')}.com`,
          password: hashedPassword,
          firstName: `Staff${i + 1}`,
          lastName: org.name.split(' ')[0],
          role: UserRole.STAFF,
          orgId: org.id,
          instanceId: instance?.id,
          contactInfo: `Staff Office ${i + 1}, Ext 20${i}`
        }
      })
      users.push(staff)
    }
    
    // Create borrowers (remaining users)
    const borrowerCount = config.usersPerOrg - staffCount - 1
    for (let i = 0; i < borrowerCount; i++) {
      const instance = orgInstances[i % orgInstances.length]
      const borrower = await prisma.user.create({
        data: {
          email: `user${i + 1}@${org.name.toLowerCase().replace(/\s+/g, '')}.com`,
          password: hashedPassword,
          firstName: `User${i + 1}`,
          lastName: org.name.split(' ')[0],
          role: UserRole.BORROWER,
          orgId: org.id,
          instanceId: instance?.id,
          contactInfo: `Phone: 555-${String(i + 1000).padStart(4, '0')}`
        }
      })
      users.push(borrower)
    }
  }
  
  console.log(`  ✓ Created ${users.length} users total`)
  return users
}

async function seedUserPreferences(users: any[]) {
  console.log('⚙️  Creating user preferences...')
  
  for (const user of users) {
    await prisma.userPreference.create({
      data: {
        userId: user.id,
        emailNotifications: Math.random() > 0.3,
        smsNotifications: Math.random() > 0.7,
        theme: Math.random() > 0.5 ? 'dark' : 'light',
        language: 'en',
        timezone: 'America/New_York',
        metadata: {
          betaFeatures: Math.random() > 0.8,
          itemsPerPage: 25,
          defaultView: 'grid'
        }
      }
    })
  }
  
  console.log(`  ✓ Created preferences for ${users.length} users`)
}

async function seedActivityLogs(users: any[]) {
  console.log('📝 Creating sample activity logs...')
  
  const activities = ['login', 'logout', 'password_change', 'profile_update']
  let count = 0
  
  // Create some recent activity for 30% of users
  const activeUsers = users.filter(() => Math.random() > 0.7)
  
  for (const user of activeUsers) {
    const numActivities = Math.floor(Math.random() * 5) + 1
    
    for (let i = 0; i < numActivities; i++) {
      const daysAgo = Math.floor(Math.random() * 30)
      await prisma.userActivityLog.create({
        data: {
          userId: user.id,
          action: activities[Math.floor(Math.random() * activities.length)],
          ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          orgId: user.orgId,
          createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
        }
      })
      count++
    }
  }
  
  console.log(`  ✓ Created ${count} activity logs`)
}

async function main() {
  console.log(`🌱 Starting database seed (${SEED_SIZE} dataset)...`)
  console.log('━'.repeat(50))
  
  try {
    // Clear existing data
    await clearDatabase()
    
    // Seed in dependency order
    const orgs = await seedOrganizations()
    const instances = await seedInstances(orgs)
    const users = await seedUsers(orgs, instances)
    await seedUserPreferences(users)
    await seedActivityLogs(users)
    
    console.log('━'.repeat(50))
    console.log('✅ Auth service seeding completed!')
    console.log(`📊 Summary:`)
    console.log(`  - Organizations: ${orgs.length}`)
    console.log(`  - Instances: ${instances.length}`)
    console.log(`  - Users: ${users.length}`)
    
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()