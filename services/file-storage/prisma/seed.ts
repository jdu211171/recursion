import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Get seed size from environment or default to medium
const SEED_SIZE = process.env.SEED_SIZE || 'medium'

// Configuration based on seed size
const CONFIG = {
  small: { filesPerOrg: 5 },
  medium: { filesPerOrg: 15 },
  large: { filesPerOrg: 50 }
}

const config = CONFIG[SEED_SIZE as keyof typeof CONFIG] || CONFIG.medium

// File templates
const FILE_TEMPLATES = [
  { 
    filename: 'user-manual.pdf',
    mimeType: 'application/pdf',
    size: 2048576, // 2MB
    description: 'User manual and operating instructions'
  },
  {
    filename: 'safety-guidelines.pdf',
    mimeType: 'application/pdf',
    size: 1024000, // 1MB
    description: 'Safety guidelines and precautions'
  },
  {
    filename: 'maintenance-schedule.pdf',
    mimeType: 'application/pdf',
    size: 512000, // 512KB
    description: 'Maintenance schedule and procedures'
  },
  {
    filename: 'product-image-1.jpg',
    mimeType: 'image/jpeg',
    size: 819200, // 800KB
    description: 'Product photo - front view'
  },
  {
    filename: 'product-image-2.jpg',
    mimeType: 'image/jpeg',
    size: 768000, // 750KB
    description: 'Product photo - side view'
  },
  {
    filename: 'specifications.pdf',
    mimeType: 'application/pdf',
    size: 256000, // 256KB
    description: 'Technical specifications document'
  },
  {
    filename: 'warranty-info.pdf',
    mimeType: 'application/pdf',
    size: 128000, // 128KB
    description: 'Warranty information and terms'
  },
  {
    filename: 'quick-start-guide.pdf',
    mimeType: 'application/pdf',
    size: 384000, // 384KB
    description: 'Quick start guide for new users'
  },
  {
    filename: 'troubleshooting.pdf',
    mimeType: 'application/pdf',
    size: 640000, // 640KB
    description: 'Common issues and troubleshooting steps'
  },
  {
    filename: 'parts-catalog.pdf',
    mimeType: 'application/pdf',
    size: 3072000, // 3MB
    description: 'Complete parts catalog with diagrams'
  }
]

async function getExistingData() {
  console.log('📊 Fetching existing data...')
  
  const orgs = await prisma.organization.findMany()
  const users = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'STAFF'] } }
  })
  const items = await prisma.item.findMany({
    take: 100 // Limit to prevent too many files
  })
  
  if (orgs.length === 0) {
    throw new Error('No organizations found! Please run auth service seeder first.')
  }
  
  if (items.length === 0) {
    throw new Error('No items found! Please run business-logic service seeder first.')
  }
  
  console.log(`  ✓ Found ${orgs.length} orgs, ${users.length} staff/admin users, ${items.length} items`)
  return { orgs, users, items }
}

async function clearFileData() {
  console.log('🧹 Clearing file storage data...')
  
  await prisma.fileMetadata.deleteMany()
  
  console.log('✅ File data cleared')
}

async function seedFiles(orgs: any[], users: any[], items: any[]) {
  console.log('📎 Creating file metadata...')
  
  const files = []
  let fileCounter = 1
  
  for (const org of orgs) {
    const orgUsers = users.filter(u => u.orgId === org.id)
    const orgItems = items.filter(i => i.orgId === org.id)
    
    if (orgUsers.length === 0 || orgItems.length === 0) continue
    
    const filesToCreate = Math.min(config.filesPerOrg, FILE_TEMPLATES.length)
    const itemsPerFile = Math.ceil(orgItems.length / filesToCreate)
    
    for (let i = 0; i < filesToCreate; i++) {
      const template = FILE_TEMPLATES[i % FILE_TEMPLATES.length]
      const uploader = orgUsers[i % orgUsers.length]
      const itemIndex = (i * itemsPerFile) % orgItems.length
      const item = orgItems[itemIndex]
      
      // Generate unique storage key
      const date = new Date()
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const storageKey = `${org.id}/${year}/${month}/FILE-${fileCounter++}-${template.filename}`
      
      const file = await prisma.fileMetadata.create({
        data: {
          filename: template.filename,
          originalName: template.filename,
          mimeType: template.mimeType,
          size: template.size,
          bucket: `org-${org.id}`,
          objectName: storageKey,
          uploadedBy: uploader.id,
          itemId: item.id,
          orgId: org.id,
          instanceId: item.instanceId
        }
      })
      
      files.push(file)
    }
  }
  
  // Create some files without item associations (general org files)
  for (const org of orgs) {
    const orgUsers = users.filter(u => u.orgId === org.id)
    if (orgUsers.length === 0) continue
    
    const uploader = orgUsers[0]
    
    // Organization policies document
    const policyFile = await prisma.fileMetadata.create({
      data: {
        filename: 'organization-policies.pdf',
        originalName: 'organization-policies.pdf',
        mimeType: 'application/pdf',
        size: 1536000, // 1.5MB
        bucket: `org-${org.id}`,
        objectName: `${org.id}/policies/org-policies-${Date.now()}.pdf`,
        uploadedBy: uploader.id,
        itemId: null,
        orgId: org.id,
        instanceId: null
      }
    })
    files.push(policyFile)
  }
  
  console.log(`  ✓ Created ${files.length} file metadata entries`)
  return files
}

async function main() {
  console.log(`🌱 Starting file storage seed (${SEED_SIZE} dataset)...`)
  console.log('━'.repeat(50))
  
  try {
    // Get existing data from other services
    const { orgs, users, items } = await getExistingData()
    
    // Clear file data
    await clearFileData()
    
    // Seed file metadata
    const files = await seedFiles(orgs, users, items)
    
    console.log('━'.repeat(50))
    console.log('✅ File storage seeding completed!')
    console.log(`📊 Summary:`)
    console.log(`  - Total Files: ${files.length}`)
    console.log(`  - Files per Org: ~${Math.floor(files.length / orgs.length)}`)
    console.log(`  - Item-linked Files: ${files.filter(f => f.itemId).length}`)
    console.log(`  - Org Policy Files: ${files.filter(f => !f.itemId).length}`)
    
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()