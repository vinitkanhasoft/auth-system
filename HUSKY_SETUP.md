# Husky Git Hooks Setup

This project uses Husky to manage Git hooks and ensure code quality throughout the development workflow.

## 🚀 What's Included

### Pre-commit Hook
- **Runs**: `npx lint-staged`
- **Purpose**: Automatically lint and format staged TypeScript files before committing
- **Actions**:
  - Fixes ESLint issues automatically
  - Formats code with Prettier
  - Adds formatted files back to the commit

### Commit-msg Hook
- **Purpose**: Validates commit message format using Conventional Commits
- **Format**: `<type>(<scope>): <description>`
- **Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`, `revert`
- **Rules**:
  - Description max 50 characters
  - Must follow conventional commit format

### Pre-push Hook
- **Purpose**: Runs comprehensive checks before pushing to remote
- **Actions**:
  - TypeScript compilation check (`npm run build`)
  - Run tests (`npm test`) - if tests exist
  - Linting check (`npm run lint`)

## 📝 Available Scripts

```bash
# Lint all TypeScript files
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Format code with Prettier
npm run format

# Check code formatting
npm run format:check

# Run tests
npm test

# Build project
npm run build
```

## 🔧 Configuration Files

- **`.eslintrc.js`**: ESLint configuration for TypeScript
- **`.prettierrc`**: Prettier formatting rules
- **`.prettierignore`**: Files to ignore during formatting
- **`package.json`**: Contains lint-staged configuration and scripts

## 📋 Commit Message Examples

✅ **Valid commit messages:**
```
feat(auth): add password reset functionality
fix: resolve token validation bug
docs: update API documentation
style: format code with prettier
refactor: simplify user service logic
test: add unit tests for auth controller
chore: update dependencies
```

❌ **Invalid commit messages:**
```
added new feature
fix bug
update docs
wip
```

## 🛠️ How It Works

1. **Pre-commit**: When you run `git commit`, Husky triggers the pre-commit hook
2. **Lint-staged**: Only runs on staged files, making it fast
3. **Auto-fix**: ESLint fixes issues automatically when possible
4. **Formatting**: Prettier formats the code consistently
5. **Commit validation**: Ensures commit messages follow standards
6. **Pre-push**: Final quality check before pushing to remote

## 🐛 Troubleshooting

### Pre-commit hook fails
- Run `npm run lint:fix` to fix linting issues manually
- Check if there are any TypeScript errors with `npm run build`

### Commit message rejected
- Follow the conventional commit format: `<type>(<scope>): <description>`
- Keep description under 50 characters
- Use one of the allowed types

### Pre-push hook fails
- Fix TypeScript compilation errors
- Ensure all tests pass
- Run `npm run lint:fix` to fix linting issues

## 🔄 Manual Override

If you need to bypass hooks (not recommended):
```bash
git commit --no-verify -m "your message"
git push --no-verify
```

⚠️ **Warning**: Only use this in emergency situations as it bypasses important quality checks.
