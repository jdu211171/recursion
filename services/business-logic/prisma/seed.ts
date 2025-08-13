import { PrismaClient, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

// Get seed size from environment or default to medium
const SEED_SIZE = process.env.SEED_SIZE || 'medium'

// Configuration based on seed size
const CONFIG = {
  small: { itemsPerInstance: 10, lendingsPerOrg: 5, reservationsPerOrg: 3 },
  medium: { itemsPerInstance: 30, lendingsPerOrg: 20, reservationsPerOrg: 10 },
  large: { itemsPerInstance: 100, lendingsPerOrg: 80, reservationsPerOrg: 40 }
}

const config = CONFIG[SEED_SIZE as keyof typeof CONFIG] || CONFIG.medium

// Category templates by instance type
const CATEGORY_TEMPLATES = {
  library: ['Fiction', 'Non-Fiction', 'Reference', 'Periodicals', 'Digital Media'],
  equipment: ['Electronics', 'Tools', 'Safety Gear', 'Testing Equipment', 'Accessories'],
  sports: ['Ball Sports', 'Water Sports', 'Fitness', 'Outdoor Gear', 'Team Equipment'],
  medical: ['Diagnostic Tools', 'Patient Care', 'Training Models', 'Safety Equipment', 'Reference Materials'],
  general: ['Books', 'Equipment', 'Supplies', 'Media', 'Tools']
}

// Item templates by category
const ITEM_TEMPLATES = {
  'Fiction': [
    { name: 'The Great Adventure', totalCount: 5 },
    { name: 'Mystery of the Lost City', totalCount: 3 },
    { name: 'Space Odyssey 3000', totalCount: 4 },
    { name: 'The Last Kingdom', totalCount: 6 },
    { name: 'Dragons of Tomorrow', totalCount: 2 }
  ],
  'Electronics': [
    { name: 'Laptop - Dell XPS 15', totalCount: 10 },
    { name: 'iPad Pro 12.9"', totalCount: 15 },
    { name: 'Digital Camera - Canon EOS', totalCount: 5 },
    { name: 'Projector - Epson 4K', totalCount: 3 },
    { name: 'VR Headset - Meta Quest 3', totalCount: 4 }
  ],
  'Ball Sports': [
    { name: 'Basketball - Official Size', totalCount: 20 },
    { name: 'Soccer Ball - FIFA Approved', totalCount: 15 },
    { name: 'Volleyball - Indoor', totalCount: 10 },
    { name: 'Tennis Racket Set', totalCount: 8 },
    { name: 'Baseball Glove - Adult', totalCount: 12 }
  ],
  'Diagnostic Tools': [
    { name: 'Blood Pressure Monitor', totalCount: 10 },
    { name: 'Stethoscope - Digital', totalCount: 15 },
    { name: 'Pulse Oximeter', totalCount: 20 },
    { name: 'Thermometer - Infrared', totalCount: 25 },
    { name: 'ECG Machine - Portable', totalCount: 3 }
  ],
  'Tools': [
    { name: 'Power Drill - Cordless', totalCount: 8 },
    { name: 'Circular Saw', totalCount: 4 },
    { name: 'Tool Set - 200 pieces', totalCount: 6 },
    { name: 'Ladder - 12ft', totalCount: 5 },
    { name: 'Welding Equipment Set', totalCount: 2 }
  ]
}

async function getExistingData() {
  console.log('📊 Fetching existing auth data...')
  
  const orgs = await prisma.organization.findMany()
  const instances = await prisma.instance.findMany()
  const users = await prisma.user.findMany()
  
  if (orgs.length === 0) {
    throw new Error('No organizations found! Please run auth service seeder first.')
  }
  
  console.log(`  ✓ Found ${orgs.length} orgs, ${instances.length} instances, ${users.length} users`)
  return { orgs, instances, users }
}

async function clearBusinessData() {
  console.log('🧹 Clearing business logic data...')
  
  // Clear in reverse order of dependencies
  await prisma.itemHistory.deleteMany()
  await prisma.approvalWorkflow.deleteMany()
  await prisma.systemNotification.deleteMany()
  await prisma.emailQueue.deleteMany()
  await prisma.backgroundJob.deleteMany()
  await prisma.userFeedback.deleteMany()
  await prisma.lending.deleteMany()
  await prisma.reservation.deleteMany()
  await prisma.blacklist.deleteMany()
  await prisma.item.deleteMany()
  await prisma.category.deleteMany()
  await prisma.lendingPolicy.deleteMany()
  // customFieldValue doesn't exist in this schema
  await prisma.customFieldDefinition.deleteMany()
  await prisma.featureFlag.deleteMany()
  await prisma.orgConfiguration.deleteMany()
  
  console.log('✅ Business data cleared')
}

async function seedCategories(instances: any[]) {
  console.log('📁 Creating categories...')
  
  const categories = []
  
  for (const instance of instances) {
    // Determine category type based on instance name
    let categoryType = 'general'
    if (instance.name.toLowerCase().includes('library')) categoryType = 'library'
    else if (instance.name.toLowerCase().includes('equipment') || instance.name.toLowerCase().includes('electronics')) categoryType = 'equipment'
    else if (instance.name.toLowerCase().includes('sport')) categoryType = 'sports'
    else if (instance.name.toLowerCase().includes('medical')) categoryType = 'medical'
    
    const templates = CATEGORY_TEMPLATES[categoryType as keyof typeof CATEGORY_TEMPLATES]
    
    for (const categoryName of templates) {
      const category = await prisma.category.create({
        data: {
          name: categoryName,
          description: `${categoryName} items in ${instance.name}`,
          orgId: instance.orgId,
          instanceId: instance.id
        }
      })
      categories.push(category)
    }
  }
  
  console.log(`  ✓ Created ${categories.length} categories`)
  return categories
}

async function seedItems(categories: any[], instances: any[]) {
  console.log('📦 Creating items...')
  
  const items = []
  let itemCounter = 1000
  
  for (const category of categories) {
    const templates = ITEM_TEMPLATES[category.name as keyof typeof ITEM_TEMPLATES] || [
      { name: `${category.name} Item 1`, totalCount: 5 },
      { name: `${category.name} Item 2`, totalCount: 3 },
      { name: `${category.name} Item 3`, totalCount: 4 }
    ]
    
    const itemsToCreate = Math.min(templates.length, Math.ceil(config.itemsPerInstance / 5))
    
    for (let i = 0; i < itemsToCreate; i++) {
      const template = templates[i % templates.length]
      const item = await prisma.item.create({
        data: {
          uniqueId: `ITEM-${itemCounter++}`,
          name: template.name,
          description: `${template.name} - Available for lending`,
          categoryId: category.id,
          orgId: category.orgId,
          instanceId: category.instanceId,
          totalCount: template.totalCount,
          availableCount: template.totalCount, // Start with all available
          metadata: {
            manufacturer: 'Various',
            year: 2023 + Math.floor(Math.random() * 2),
            condition: 'Good'
          }
        }
      })
      items.push(item)
    }
  }
  
  console.log(`  ✓ Created ${items.length} items`)
  return items
}

async function seedLendings(items: any[], users: any[], orgs: any[]) {
  console.log('📋 Creating active lendings...')
  
  const lendings = []
  const borrowers = users.filter(u => u.role === UserRole.BORROWER)
  
  for (const org of orgs) {
    const orgItems = items.filter(i => i.orgId === org.id)
    const orgBorrowers = borrowers.filter(u => u.orgId === org.id)
    
    if (orgItems.length === 0 || orgBorrowers.length === 0) continue
    
    const lendingsToCreate = Math.min(config.lendingsPerOrg, orgItems.length, orgBorrowers.length)
    
    for (let i = 0; i < lendingsToCreate; i++) {
      const item = orgItems[i % orgItems.length]
      const borrower = orgBorrowers[i % orgBorrowers.length]
      
      // Skip if item has no available count
      if (item.availableCount <= 0) continue
      
      // Create lending with various due dates (some overdue)
      const daysOffset = Math.floor(Math.random() * 60) - 20 // -20 to +40 days
      const borrowedAt = new Date(Date.now() - Math.abs(daysOffset) * 24 * 60 * 60 * 1000)
      const dueDate = new Date(borrowedAt.getTime() + 14 * 24 * 60 * 60 * 1000) // 14 days loan period
      
      const lending = await prisma.lending.create({
        data: {
          itemId: item.id,
          userId: borrower.id,
          borrowedAt,
          dueDate,
          notes: daysOffset < -14 ? 'Item is overdue for return' : null,
          orgId: org.id,
          instanceId: item.instanceId,
          // If overdue, set a penalty
          penalty: daysOffset < -14 ? (Math.abs(daysOffset + 14) * 0.5) : 0,
          penaltyReason: daysOffset < -14 ? 'Late return' : null
        }
      })
      
      // Update item available count
      await prisma.item.update({
        where: { id: item.id },
        data: { availableCount: { decrement: 1 } }
      })
      
      // Update local item object
      item.availableCount -= 1
      
      lendings.push(lending)
      
      // Create overdue notification if applicable
      if (daysOffset < -14) {
        await prisma.systemNotification.create({
          data: {
            userId: borrower.id,
            type: 'OVERDUE_NOTICE',
            title: 'Item Overdue',
            message: `Your borrowed item "${item.name}" is overdue. Please return it as soon as possible.`,
            metadata: { lendingId: lending.id, daysOverdue: Math.abs(daysOffset + 14) },
            orgId: org.id,
            instanceId: item.instanceId
          }
        })
      }
    }
  }
  
  console.log(`  ✓ Created ${lendings.length} lendings (including overdue items)`)
  return lendings
}

async function seedReservations(items: any[], users: any[], orgs: any[]) {
  console.log('📅 Creating reservations...')
  
  const reservations = []
  const borrowers = users.filter(u => u.role === UserRole.BORROWER)
  
  for (const org of orgs) {
    const orgItems = items.filter(i => i.orgId === org.id && i.availableCount === 0) // Only unavailable items
    const orgBorrowers = borrowers.filter(u => u.orgId === org.id)
    
    if (orgItems.length === 0 || orgBorrowers.length === 0) continue
    
    const reservationsToCreate = Math.min(config.reservationsPerOrg, orgItems.length, orgBorrowers.length)
    
    for (let i = 0; i < reservationsToCreate; i++) {
      const item = orgItems[i % orgItems.length]
      const borrower = orgBorrowers[(i + 5) % orgBorrowers.length] // Different borrowers than lendings
      
      const startDate = new Date(Date.now() + (i + 1) * 7 * 24 * 60 * 60 * 1000) // Future dates
      const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000)
      
      const reservation = await prisma.reservation.create({
        data: {
          itemId: item.id,
          userId: borrower.id,
          startDate,
          endDate,
          quantity: 1,
          status: 'PENDING',
          notes: `Reserved for ${borrower.firstName} ${borrower.lastName}`,
          orgId: org.id,
          instanceId: item.instanceId,
          metadata: {
            queuePosition: i + 1,
            priority: 'normal',
            notifyOnAvailable: true
          }
        }
      })
      
      reservations.push(reservation)
    }
  }
  
  console.log(`  ✓ Created ${reservations.length} reservations`)
  return reservations
}

async function seedBlacklists(users: any[], lendings: any[]) {
  console.log('🚫 Creating blacklisted users...')
  
  const blacklists = []
  const overdueLendings = lendings.filter(l => l.status === 'OVERDUE')
  const processedUsers = new Set()
  
  for (const lending of overdueLendings) {
    if (processedUsers.has(lending.userId)) continue
    
    const user = users.find(u => u.id === lending.userId)
    if (!user) continue
    
    const daysOverdue = Math.floor((Date.now() - new Date(lending.dueDate).getTime()) / (24 * 60 * 60 * 1000))
    const blacklistDays = Math.min(daysOverdue * 3, 30) // 3 days per overdue day, max 30
    
    const blacklist = await prisma.blacklist.create({
      data: {
        userId: user.id,
        reason: `Overdue item: ${daysOverdue} days late`,
        startDate: new Date(),
        endDate: new Date(Date.now() + blacklistDays * 24 * 60 * 60 * 1000),
        isActive: true,
        orgId: user.orgId,
        instanceId: user.instanceId
      }
    })
    
    blacklists.push(blacklist)
    processedUsers.add(lending.userId)
  }
  
  console.log(`  ✓ Created ${blacklists.length} blacklist entries`)
  return blacklists
}

async function seedOrgConfigurations(orgs: any[]) {
  console.log('⚙️  Creating organization configurations...')
  
  for (const org of orgs) {
    await prisma.orgConfiguration.create({
      data: {
        orgId: org.id,
        maxLendingDays: 30,
        latePenaltyPerDay: 1.00,
        maxItemsPerUser: 5,
        requireApproval: org.name.includes('University'),
        allowExtensions: true,
        maxExtensions: 2,
        autoBlacklist: true,
        blacklistThresholdFirst: 3,
        blacklistThresholdSecond: 7,
        blacklistThresholdThird: 30,
        themeConfig: {
          primaryColor: '#1976d2',
          logo: `${org.name.toLowerCase().replace(/\s+/g, '-')}-logo.png`
        },
        enabledFeatures: ['lending', 'reservations', 'penalties', 'notifications'],
        customFields: {},
        emailTemplates: {
          overdue: 'Your item is overdue. Please return it as soon as possible.',
          reminder: 'Your item is due soon. Please remember to return it on time.'
        }
      }
    })
  }
  
  console.log(`  ✓ Created configurations for ${orgs.length} organizations`)
}

async function seedLendingPolicies(orgs: any[]) {
  console.log('📜 Creating lending policies...')
  
  const policies = []
  
  for (const org of orgs) {
    const policy = await prisma.lendingPolicy.create({
      data: {
        name: 'Standard Lending Policy',
        description: 'Default lending policy for all items',
        maxDays: 14,
        maxItems: 5,
        requiresApproval: false,
        penaltyRules: {
          finePerDay: 1.00,
          gracePeriodDays: 2,
          blacklistThresholdDays: 7,
          autoRenewEnabled: false,
          notificationSchedule: [7, 3, 1]
        },
        priority: 1,
        orgId: org.id,
        isActive: true
      }
    })
    policies.push(policy)
    
    // Create a high-value item policy
    const hvPolicy = await prisma.lendingPolicy.create({
      data: {
        name: 'High-Value Item Policy',
        description: 'Special policy for expensive or rare items',
        maxDays: 7,
        maxItems: 1,
        requiresApproval: true,
        penaltyRules: {
          finePerDay: 5.00,
          gracePeriodDays: 0,
          blacklistThresholdDays: 3,
          minimumUserLevel: 'verified',
          requiresDeposit: true,
          depositAmount: 100
        },
        priority: 2,
        orgId: org.id,
        isActive: true
      }
    })
    policies.push(hvPolicy)
  }
  
  console.log(`  ✓ Created ${policies.length} lending policies`)
  return policies
}

async function seedFeedback(users: any[], items: any[]) {
  console.log('💬 Creating user feedback...')
  
  const feedback = []
  const categories = ['bug', 'feature_request', 'improvement', 'other']
  const priorities = ['low', 'medium', 'high', 'critical']
  
  // Create feedback from 10% of users
  const feedbackUsers = users.filter(() => Math.random() > 0.9)
  
  for (const user of feedbackUsers) {
    const userItems = items.filter(i => i.orgId === user.orgId)
    if (userItems.length === 0) continue
    
    const item = userItems[Math.floor(Math.random() * userItems.length)]
    
    const fb = await prisma.userFeedback.create({
      data: {
        title: `Feedback about ${item.name}`,
        description: `I have some thoughts about how we could improve the lending process for ${item.name}. 
          It would be great if we could have more flexible return dates or automatic renewals.`,
        category: categories[Math.floor(Math.random() * categories.length)],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        status: 'PENDING',
        userId: user.id,
        orgId: user.orgId,
        instanceId: user.instanceId
      }
    })
    feedback.push(fb)
  }
  
  console.log(`  ✓ Created ${feedback.length} feedback entries`)
  return feedback
}

async function main() {
  console.log(`🌱 Starting business logic seed (${SEED_SIZE} dataset)...`)
  console.log('━'.repeat(50))
  
  try {
    // Get existing auth data
    const { orgs, instances, users } = await getExistingData()
    
    // Clear business data
    await clearBusinessData()
    
    // Seed business logic data
    const categories = await seedCategories(instances)
    const items = await seedItems(categories, instances)
    const lendings = await seedLendings(items, users, orgs)
    const reservations = await seedReservations(items, users, orgs)
    const blacklists = await seedBlacklists(users, lendings)
    await seedOrgConfigurations(orgs)
    // const policies = await seedLendingPolicies(orgs) // Skipping - table structure mismatch
    // await seedFeedback(users, items) // Skipping - table structure mismatch
    
    console.log('━'.repeat(50))
    console.log('✅ Business logic seeding completed!')
    console.log(`📊 Summary:`)
    console.log(`  - Categories: ${categories.length}`)
    console.log(`  - Items: ${items.length}`)
    console.log(`  - Active Lendings: ${lendings.length}`)
    console.log(`  - Reservations: ${reservations.length}`)
    console.log(`  - Blacklisted Users: ${blacklists.length}`)
    // console.log(`  - Lending Policies: ${policies.length}`)
    
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()