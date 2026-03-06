import { database } from '@/config/database';
import User, { UserDocument } from '@/models/User';
import { Banner, IBanner } from '@/models/Banner';
import { UserRoles } from '@/enums/UserRoles';
import { logger } from '@/utils/logger';
import bcrypt from 'bcryptjs';

export interface SeedData {
  users: Partial<UserDocument>[];
  banners?: Partial<IBanner>[];
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
      await Banner.deleteMany({});
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
   * Seed default banners
   */
  public async seedBanners(): Promise<IBanner[]> {
    try {
      const defaultBanners = [
        {
          title: 'Summer Sale 2024',
          description: 'Get amazing discounts on all summer products. Up to 50% off on selected items!',
          altText: 'Summer sale banner with colorful beach products and discount text',
          bannerImage: 'https://res.cloudinary.com/demo/image/upload/v1234567890/banners/summer-sale-2024.jpg',
          bannerImagePublicId: 'banners/summer-sale-2024',
          isActive: true,
          displayOrder: 1,
        },
        {
          title: 'New Collection Launch',
          description: 'Discover our latest collection with trendy designs and premium quality materials.',
          altText: 'New collection banner showcasing fashion products',
          bannerImage: 'https://res.cloudinary.com/demo/image/upload/v1234567890/banners/new-collection.jpg',
          bannerImagePublicId: 'banners/new-collection',
          isActive: true,
          displayOrder: 2,
        },
        {
          title: 'Flash Sale - Limited Time',
          description: 'Hurry! Limited time offer on electronics. Save big on laptops, phones, and more.',
          altText: 'Flash sale banner with electronics and countdown timer',
          bannerImage: 'https://res.cloudinary.com/demo/image/upload/v1234567890/banners/flash-sale.jpg',
          bannerImagePublicId: 'banners/flash-sale',
          isActive: true,
          displayOrder: 3,
        },
        {
          title: 'Welcome to Our Store',
          description: 'Sign up now and get 10% off on your first purchase. Exclusive member benefits await!',
          altText: 'Welcome banner with store logo and signup promotion',
          bannerImage: 'https://res.cloudinary.com/demo/image/upload/v1234567890/banners/welcome-banner.jpg',
          bannerImagePublicId: 'banners/welcome-banner',
          isActive: true,
          displayOrder: 4,
        },
        {
          title: 'Holiday Special Offer',
          description: 'Celebrate the holiday season with special discounts and gift wrapping services.',
          altText: 'Holiday themed banner with festive decorations and gift boxes',
          bannerImage: 'https://res.cloudinary.com/demo/image/upload/v1234567890/banners/holiday-special.jpg',
          bannerImagePublicId: 'banners/holiday-special',
          isActive: false, // Inactive banner
          displayOrder: 5,
        },
        {
          title: 'Tech Week Deals',
          description: 'Tech week is here! Get the best deals on gadgets, smart devices, and accessories.',
          altText: 'Technology themed banner with gadgets and devices',
          bannerImage: 'https://res.cloudinary.com/demo/image/upload/v1234567890/banners/tech-week.jpg',
          bannerImagePublicId: 'banners/tech-week',
          isActive: true,
          displayOrder: 6,
        },
      ];

      const createdBanners: IBanner[] = [];

      for (const bannerData of defaultBanners) {
        const banner = new Banner(bannerData);
        await banner.save();
        createdBanners.push(banner);
        logger.info(`Created banner: ${banner.title} (Order: ${banner.displayOrder})`);
      }

      return createdBanners;
    } catch (error) {
      logger.error('Error seeding banners:', error);
      throw error;
    }
  }

  /**
   * Seed custom data
   */
  public async seedCustomData(data: SeedData): Promise<{ users: UserDocument[]; banners: IBanner[] }> {
    try {
      const createdUsers: UserDocument[] = [];
      const createdBanners: IBanner[] = [];

      // Seed custom users
      if (data.users && data.users.length > 0) {
        for (const userData of data.users) {
          const user = new User(userData);
          await user.save();
          createdUsers.push(user);
          logger.info(`Created custom user: ${user.email}`);
        }
      }

      // Seed custom banners
      if (data.banners && data.banners.length > 0) {
        for (const bannerData of data.banners) {
          const banner = new Banner(bannerData);
          await banner.save();
          createdBanners.push(banner);
          logger.info(`Created custom banner: ${banner.title}`);
        }
      }

      return { users: createdUsers, banners: createdBanners };
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
        await this.seedBanners();
      }

      logger.info('Database seeding completed successfully');
    } catch (error) {
      logger.error('Error during database seeding:', error);
      throw error;
    }
  }

  /**
   * Run seeder with options
   */
  public async runSeeder(options: { clear?: boolean } = {}): Promise<void> {
    try {
      if (options.clear) {
        await this.clearDatabase();
        logger.info('Database cleared. Starting fresh seed...');
      }

      await this.seedAll();
    } catch (error) {
      logger.error('Error running seeder:', error);
      throw error;
    }
  }

  /**
   * Check if database is already seeded
   */
  public async isSeeded(): Promise<boolean> {
    try {
      const [userCount, bannerCount] = await Promise.all([
        User.countDocuments(),
        Banner.countDocuments()
      ]);

      logger.info(`Database status - Users: ${userCount}, Banners: ${bannerCount}`);

      return userCount > 0 && bannerCount > 0;
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
    banners: number;
    usersByRole: Record<UserRoles, number>;
    bannersByStatus: { active: number; inactive: number };
  }> {
    try {
      const [userCount, bannerCount, userByRole, bannerByStatus] = await Promise.all([
        User.countDocuments(),
        Banner.countDocuments(),
        User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]).then(results =>
          results.reduce(
            (acc, item) => {
              acc[item._id] = item.count;
              return acc;
            },
            {} as Record<UserRoles, number>
          )
        ),
        Banner.aggregate([
          {
            $group: {
              _id: '$isActive',
              count: { $sum: 1 }
            }
          }
        ]).then(results => {
          const status = { active: 0, inactive: 0 };
          results.forEach(item => {
            if (item._id) {
              status.active = item.count;
            } else {
              status.inactive = item.count;
            }
          });
          return status;
        })
      ]);

      return {
        users: userCount,
        banners: bannerCount,
        usersByRole: userByRole,
        bannersByStatus: bannerByStatus
      };
    } catch (error) {
      logger.error('Error getting seed stats:', error);
      throw error;
    }
  }
}

export default DatabaseSeeder;
