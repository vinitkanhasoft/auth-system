#!/usr/bin/env node

import { seeder } from '@/database/seeder';
import { database } from '@/config/database';
import { logger } from '@/utils/logger';
import { UserRoles } from '@/enums/UserRoles';
import { TokenTypes } from '@/enums/TokenTypes';

interface SeederOptions {
  clear?: boolean;
  check?: boolean;
  stats?: boolean;
  custom?: boolean;
  banners?: boolean;
}

async function main() {
  const args = process.argv.slice(2);
  const options: SeederOptions = {};

  // Parse command line arguments
  for (const arg of args) {
    switch (arg) {
      case '--clear':
      case '-c':
        options.clear = true;
        break;
      case '--check':
      case '-k':
        options.check = true;
        break;
      case '--stats':
      case '-s':
        options.stats = true;
        break;
      case '--custom':
        options.custom = true;
        break;
      case '--banners':
        options.banners = true;
        break;
      case '--help':
      case '-h':
        showHelp();
        return;
      default:
        console.error(`Unknown option: ${arg}`);
        showHelp();
        process.exit(1);
    }
  }

  try {
    // Connect to database
    await database.connect();

    if (options.check) {
      const isSeeded = await seeder.isSeeded();
      console.log(`Database is ${isSeeded ? 'seeded' : 'not seeded'}`);
      return;
    }

    if (options.stats) {
      const stats = await seeder.getSeedStats();
      console.log('\n📊 Database Statistics:');
      console.log('========================');
      console.log(`Total Users: ${stats.users}`);
      console.log(`Total Banners: ${stats.banners}`);

      console.log('\n👥 Users by Role:');
      Object.entries(stats.usersByRole).forEach(([role, count]) => {
        console.log(`  ${role}: ${count}`);
      });

      console.log('\n🎨 Banners by Status:');
      console.log(`  Active: ${stats.bannersByStatus.active}`);
      console.log(`  Inactive: ${stats.bannersByStatus.inactive}`);
      return;
    }

    if (options.banners) {
      // Seed only banners
      await seeder.seedBanners();
      console.log('✅ Banners seeded successfully');
      return;
    }

    if (options.custom) {
      // Example of custom seeding
      const customData = {
        users: [
          {
            email: 'custom@example.com',
            password: 'Custom123!@#',
            firstName: 'Custom',
            lastName: 'User',
            role: UserRoles.USER,
            isEmailVerified: true,
          },
        ],
        banners: [
          {
            title: 'Custom Promotion Banner',
            description: 'This is a custom promotional banner for special offers',
            altText: 'Custom promotion banner with special deals',
            bannerImage: 'https://res.cloudinary.com/demo/image/upload/v1234567890/banners/custom-promo.jpg',
            bannerImagePublicId: 'banners/custom-promo',
            isActive: true,
            displayOrder: 10,
          },
        ],
      };

      await seeder.seedCustomData(customData);
      console.log('✅ Custom data seeded successfully');
      return;
    }

    // Run default seeder
    await seeder.runSeeder({ clear: options.clear });
    console.log('✅ Database seeded successfully');
  } catch (error) {
    logger.error('Seeder failed:', error);
    console.error('❌ Seeder failed:', error);
    process.exit(1);
  } finally {
    // Disconnect from database
    await database.disconnect();
  }
}

function showHelp() {
  console.log(`
🌱 Database Seeder Script

Usage: npm run seed [options]

Options:
  --clear, -c     Clear database before seeding
  --check, -k     Check if database is seeded
  --stats, -s     Show database statistics
  --banners       Seed only banners
  --custom        Seed custom example data
  --help, -h      Show this help message

Examples:
  npm run seed                    # Seed with default data (users + banners)
  npm run seed --clear           # Clear and seed with default data
  npm run seed --check           # Check if database is seeded
  npm run seed --stats           # Show database statistics
  npm run seed --banners         # Seed only banners
  npm run seed --custom          # Seed custom example data

Environment Variables:
  NODE_ENV=development           # Use development database
  NODE_ENV=production           # Use production database
  `);
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

export { main as seedScript };
