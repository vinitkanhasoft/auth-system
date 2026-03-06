import { database } from '@/config/database';
import User, { UserDocument } from '@/models/User';
import { UserRoles } from '@/enums/UserRoles';
import { logger } from '@/utils/logger';
import bcrypt from 'bcryptjs';

export interface SeedData {
  users: Partial<UserDocument>[];
}

export class DatabaseSeeder {
  private static instance: DatabaseSeeder;

  private constructor() {}

  public static getInstance(): DatabaseSeeder {
    if (!DatabaseSeeder.instance) {
      DatabaseSeeder.instance = new DatabaseSeeder();
    }
    return DatabaseSeeder.instance;
  }

  /**
   * Clear all collections
   */
  public async clearDatabase(): Promise<void> {
    try {
      await User.deleteMany({});
      logger.info('Database cleared successfully');
    } catch (error) {
      logger.error('Error clearing database:', error);
      throw error;
    }
  }

  /**
   * Seed default users
   */
  public async seedUsers(): Promise<UserDocument[]> {
    try {
      const defaultUsers = [
        {
          email: 'admin@example.com',
          password: 'Admin123!@#',
          firstName: 'Super',
          lastName: 'Admin',
          role: UserRoles.ADMIN,
          isEmailVerified: true,
          phone: '+1-555-0100',
          phoneCountryCode: '+1',
          address: '123 Admin Street, Washington DC',
          dateOfBirth: new Date('1980-01-01'),
        },
        {
          email: 'moderator@example.com',
          password: 'Moderator123!@#',
          firstName: 'John',
          lastName: 'Moderator',
          role: UserRoles.MODERATOR,
          isEmailVerified: true,
          phone: '+1-555-0101',
          phoneCountryCode: '+1',
          address: '456 Moderator Ave, New York NY',
          dateOfBirth: new Date('1985-05-15'),
        },
        {
          email: 'user@example.com',
          password: 'User123!@#',
          firstName: 'Jane',
          lastName: 'User',
          role: UserRoles.USER,
          isEmailVerified: true,
          phone: '+1-555-0102',
          phoneCountryCode: '+1',
          address: '789 User Blvd, Los Angeles CA',
          dateOfBirth: new Date('1990-10-20'),
        },
        {
          email: 'unverified@example.com',
          password: 'Unverified123!@#',
          firstName: 'Bob',
          lastName: 'Unverified',
          role: UserRoles.USER,
          isEmailVerified: false,
          phone: '+1-555-0103',
          phoneCountryCode: '+1',
          address: '321 Unverified St, Chicago IL',
          dateOfBirth: new Date('1992-03-10'),
        },
      ];

      const createdUsers: UserDocument[] = [];

      for (const userData of defaultUsers) {
        const user = new User(userData);
        await user.save();
        createdUsers.push(user);
        logger.info(`Created user: ${user.email} with role: ${user.role}`);
      }

      return createdUsers;
    } catch (error) {
      logger.error('Error seeding users:', error);
      throw error;
    }
  }

  /**
   * Seed custom data
   */
  public async seedCustomData(data: SeedData): Promise<{ users: UserDocument[] }> {
    try {
      const createdUsers: UserDocument[] = [];

      // Seed custom users
      if (data.users && data.users.length > 0) {
        for (const userData of data.users) {
          const user = new User(userData);
          await user.save();
          createdUsers.push(user);
          logger.info(`Created custom user: ${user.email}`);
        }
      }

      return { users: createdUsers };
    } catch (error) {
      logger.error('Error seeding custom data:', error);
      throw error;
    }
  }

  /**
   * Seed all default data
   */
  public async seedAll(customData?: SeedData): Promise<void> {
    try {
      const isSeeded = await this.isSeeded();
      if (isSeeded) {
        logger.info('Database already seeded. Skipping...');
        return;
      }

      // Seed custom data if provided, otherwise use default data
      if (customData) {
        await this.seedCustomData(customData);
      } else {
        // Seed default data
        await this.seedUsers();
      }

      logger.info('Database seeding completed successfully');
    } catch (error) {
      logger.error('Error during database seeding:', error);
      throw error;
    }
  }

  /**
   * Check if database is already seeded
   */
  public async isSeeded(): Promise<boolean> {
    try {
      const userCount = await User.countDocuments();

      logger.info(`Database status - Users: ${userCount}`);

      return userCount > 0;
    } catch (error) {
      logger.error('Error checking seed status:', error);
      return false;
    }
  }

  /**
   * Get database statistics
   */
  public async getSeedStats(): Promise<{
    users: number;
    usersByRole: Record<UserRoles, number>;
  }> {
    try {
      const [userCount, userByRole] = await Promise.all([
        User.countDocuments(),
        User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]).then(results =>
          results.reduce(
            (acc, item) => {
              acc[item._id] = item.count;
              return acc;
            },
            {} as Record<UserRoles, number>
          )
        ),
      ]);

      return {
        users: userCount,
        usersByRole: userByRole,
      };
    } catch (error) {
      logger.error('Error getting seed stats:', error);
      throw error;
    }
  }
}

export default DatabaseSeeder;
