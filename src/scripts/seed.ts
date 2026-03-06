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
      console.log(`Total Tokens: ${stats.tokens}`);

      console.log('\n👥 Users by Role:');
      Object.entries(stats.usersByRole).forEach(([role, count]) => {
        console.log(`  ${role}: ${count}`);
      });

      console.log('\n🔑 Tokens by Type:');
      Object.entries(stats.tokensByType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
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
        tokens: [
          {
            userId: null, // Will be set after user creation
            token: 'custom-token-123',
            type: TokenTypes.ACCESS_TOKEN,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            isRevoked: false,
          },
        ],
      };

      // Create user first, then assign to token
      const createdUsers = await seeder.seedUsers();
      if (createdUsers.length > 0) {
        customData.tokens[0].userId = createdUsers[0]._id;
      }

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
  --custom        Seed custom example data
  --help, -h      Show this help message

Examples:
  npm run seed                    # Seed with default data
  npm run seed --clear           # Clear and seed with default data
  npm run seed --check           # Check if database is seeded
  npm run seed --stats           # Show database statistics
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
