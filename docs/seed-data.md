# Seed Data Documentation

## Overview

This document describes the seed data available in the application for both users and banners. The seeder provides comprehensive test data for development and testing purposes.

## Users Seed Data

### Default Users

The seeder creates 4 default users with different roles:

#### 1. Super Admin
- **Email**: `admin@example.com`
- **Password**: `Admin123!@#`
- **Name**: Super Admin
- **Role**: `ADMIN`
- **Verified**: Yes
- **Phone**: +1-555-0100
- **Address**: 123 Admin Street, Washington DC

#### 2. Moderator
- **Email**: `moderator@example.com`
- **Password**: `Moderator123!@#`
- **Name**: John Moderator
- **Role**: `MODERATOR`
- **Verified**: Yes
- **Phone**: +1-555-0101
- **Address**: 456 Moderator Ave, New York NY

#### 3. Regular User
- **Email**: `user@example.com`
- **Password**: `User123!@#`
- **Name**: Jane User
- **Role**: `USER`
- **Verified**: Yes
- **Phone**: +1-555-0102
- **Address**: 789 User Blvd, Los Angeles CA

#### 4. Unverified User
- **Email**: `unverified@example.com`
- **Password**: `Unverified123!@#`
- **Name**: Bob Unverified
- **Role**: `USER`
- **Verified**: No
- **Phone**: +1-555-0103
- **Address**: 321 Unverified St, Chicago IL

## Banners Seed Data

### Default Banners

The seeder creates 6 default banners with various content and statuses:

#### 1. Summer Sale 2024
- **Title**: Summer Sale 2024
- **Description**: Get amazing discounts on all summer products. Up to 50% off on selected items!
- **Alt Text**: Summer sale banner with colorful beach products and discount text
- **Status**: Active
- **Display Order**: 1
- **Image**: `banners/summer-sale-2024`

#### 2. New Collection Launch
- **Title**: New Collection Launch
- **Description**: Discover our latest collection with trendy designs and premium quality materials.
- **Alt Text**: New collection banner showcasing fashion products
- **Status**: Active
- **Display Order**: 2
- **Image**: `banners/new-collection`

#### 3. Flash Sale - Limited Time
- **Title**: Flash Sale - Limited Time
- **Description**: Hurry! Limited time offer on electronics. Save big on laptops, phones, and more.
- **Alt Text**: Flash sale banner with electronics and countdown timer
- **Status**: Active
- **Display Order**: 3
- **Image**: `banners/flash-sale`

#### 4. Welcome to Our Store
- **Title**: Welcome to Our Store
- **Description**: Sign up now and get 10% off on your first purchase. Exclusive member benefits await!
- **Alt Text**: Welcome banner with store logo and signup promotion
- **Status**: Active
- **Display Order**: 4
- **Image**: `banners/welcome-banner`

#### 5. Holiday Special Offer
- **Title**: Holiday Special Offer
- **Description**: Celebrate the holiday season with special discounts and gift wrapping services.
- **Alt Text**: Holiday themed banner with festive decorations and gift boxes
- **Status**: Inactive
- **Display Order**: 5
- **Image**: `banners/holiday-special`

#### 6. Tech Week Deals
- **Title**: Tech Week Deals
- **Description**: Tech week is here! Get the best deals on gadgets, smart devices, and accessories.
- **Alt Text**: Technology themed banner with gadgets and devices
- **Status**: Active
- **Display Order**: 6
- **Image**: `banners/tech-week`

## Usage

### Run Seeder Commands

```bash
# Seed all default data (users + banners)
npm run seed

# Clear database and seed fresh data
npm run seed --clear

# Check if database is seeded
npm run seed --check

# Show database statistics
npm run seed --stats

# Seed only banners
npm run seed --banners

# Seed custom example data
npm run seed --custom
```

### Custom Seeding

You can create custom seed data by modifying the `SeedData` interface:

```typescript
const customData = {
  users: [
    {
      email: 'custom@example.com',
      password: 'Custom123!@#',
      firstName: 'Custom',
      lastName: 'User',
      role: UserRoles.USER,
      isEmailVerified: true,
    }
  ],
  banners: [
    {
      title: 'Custom Banner',
      description: 'Custom banner description',
      altText: 'Custom alt text',
      bannerImage: 'https://example.com/image.jpg',
      bannerImagePublicId: 'custom/banner',
      isActive: true,
      displayOrder: 10
    }
  ]
};
```

## Database Statistics

After seeding, you can view statistics including:

- Total number of users
- Total number of banners
- Users by role (Admin, Moderator, User)
- Banners by status (Active, Inactive)

Example output:
```
📊 Database Statistics:
========================
Total Users: 4
Total Banners: 6

👥 Users by Role:
  ADMIN: 1
  MODERATOR: 1
  USER: 2

🎨 Banners by Status:
  Active: 5
  Inactive: 1
```

## Important Notes

1. **Password Security**: All passwords are hashed using bcrypt before storage
2. **Email Verification**: Some users are created with unverified emails for testing email verification flows
3. **Banner Images**: Default banner images use placeholder Cloudinary URLs - replace with actual images in production
4. **Display Order**: Banners are sorted by `displayOrder` in ascending order
5. **Role-Based Access**: Use the admin user (`admin@example.com`) for testing admin-only features like banner management

## Testing Scenarios

The seed data supports various testing scenarios:

### Authentication Testing
- Login with different user roles
- Test email verification flows
- Test password reset functionality

### Banner Management Testing
- Create, read, update, delete banners
- Test banner ordering
- Test active/inactive banner filtering
- Test image upload functionality

### Permission Testing
- Test admin-only endpoints
- Test moderator permissions
- Test regular user access limitations

## Production Considerations

For production deployment:

1. **Remove Test Data**: Clear all seed data before going live
2. **Update Images**: Replace placeholder banner images with actual production images
3. **Change Passwords**: Update default user passwords or remove test accounts
4. **Environment Configuration**: Ensure proper database connections for production environment
