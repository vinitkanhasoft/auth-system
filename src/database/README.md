# Database Seeder

This directory contains the database seeding functionality for the Node.js authentication system.

## Overview

The seeder provides a comprehensive way to populate your MongoDB database with initial data for development and testing purposes. It includes:

- Default users with different roles (Admin, Moderator, User)
- Sample tokens for testing authentication flows
- Custom data seeding capabilities
- Database statistics and monitoring

## Usage

### Command Line Interface

The seeder can be run via npm scripts:

```bash
# Seed with default data
npm run seed

# Clear database and seed with default data
npm run seed:clear

# Check if database is seeded
npm run seed:check

# Show database statistics
npm run seed:stats

# Seed with custom example data
npm run seed:custom
```

### Programmatic Usage

You can also use the seeder programmatically in your code:

```typescript
import { seeder } from '@/database/seeder';

// Run default seeder
await seeder.runSeeder();

// Clear and seed
await seeder.runSeeder({ clear: true });

// Seed custom data
await seeder.seedCustomData({
  users: [
    {
      email: 'custom@example.com',
      password: 'password123',
      firstName: 'Custom',
      lastName: 'User',
      role: UserRoles.USER,
      isEmailVerified: true
    }
  ]
});

// Check if seeded
const isSeeded = await seeder.isSeeded();

// Get statistics
const stats = await seeder.getSeedStats();
```

## Default Data

### Users

The seeder creates the following default users:

| Email | Password | Role | Email Verified |
|-------|----------|------|----------------|
| admin@example.com | Admin123!@# | Admin | Yes |
| moderator@example.com | Moderator123!@# | Moderator | Yes |
| user@example.com | User123!@# | User | Yes |
| test@example.com | Test123!@# | User | No |

### Tokens

For each user, the seeder creates:

- **Access Token**: Expires in 15 minutes
- **Refresh Token**: Expires in 7 days
- **Email Verification Token**: Only for unverified users, expires in 24 hours

## API Reference

### DatabaseSeeder Class

#### Methods

- `clearDatabase()`: Remove all data from collections
- `seedUsers()`: Create default users
- `seedTokens(users)`: Create tokens for specified users
- `seedCustomData(data)`: Seed custom user and token data
- `runSeeder(options)`: Run complete seeder with options
- `isSeeded()`: Check if database has been seeded
- `getSeedStats()`: Get detailed seeding statistics

#### Options

```typescript
interface SeederOptions {
  clear?: boolean;    // Clear database before seeding
  customData?: SeedData; // Custom data to seed
}

interface SeedData {
  users?: Partial<UserDocument>[];
  tokens?: Partial<TokenDocument>[];
}
```

## Environment Variables

The seeder uses the same database configuration as your application:

- `MONGODB_URI`: Full MongoDB connection string
- `MONGODB_HOST`: Database host (default: localhost)
- `MONGODB_PORT`: Database port (default: 27017)
- `MONGODB_DATABASE`: Database name (default: auth-system)
- `MONGODB_USERNAME`: Database username (optional)
- `MONGODB_PASSWORD`: Database password (optional)

## Security Notes

⚠️ **Important**: The default passwords are for development only. In production:

1. Change all default passwords
2. Use environment variables for sensitive data
3. Consider using different credentials for production
4. Remove or disable the seeder in production builds

## Examples

### Custom User Seeding

```typescript
const customData = {
  users: [
    {
      email: 'developer@example.com',
      password: 'DevPass123!@#',
      firstName: 'Dev',
      lastName: 'User',
      role: UserRoles.DEVELOPER,
      isEmailVerified: true
    }
  ]
};

await seeder.runSeeder({ clear: true, customData });
```

### Token Management

```typescript
// Create specific tokens for testing
const users = await seeder.seedUsers();
const testTokens = await seeder.seedTokens(users);

// Create custom tokens
await seeder.seedCustomData({
  tokens: [
    {
      userId: users[0]._id,
      token: 'test-access-token',
      type: TokenTypes.ACCESS_TOKEN,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      isRevoked: false
    }
  ]
});
```

## Troubleshooting

### Common Issues

1. **Connection Errors**: Ensure MongoDB is running and accessible
2. **Permission Errors**: Check database user permissions
3. **Duplicate Key Errors**: Use `--clear` option to reset database
4. **Module Not Found**: Ensure all dependencies are installed

### Debug Mode

Set `DEBUG=seeder` environment variable for detailed logging:

```bash
DEBUG=seeder npm run seed
```

## Integration with CI/CD

The seeder can be integrated into your development workflow:

```bash
# In setup scripts
npm run seed:clear && npm run seed

# In test scripts
npm run seed:check || npm run seed
```
