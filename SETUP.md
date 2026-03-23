# BooklyX Backend - Setup Guide

Complete setup instructions for running BooklyX Backend locally.

## Prerequisites

- **Node.js** >= 18.x
- **npm** >= 10.x
- **PostgreSQL** database (local or remote)
- **Git** (for version control)

## Initial Setup

### 1. Clone & Install

```bash
git clone <repo-url>
cd booklyX_backend
npm install
```

This automatically generates Prisma Client via the `postinstall` script.

### 2. Environment Configuration

Copy the example file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# Database Connection
DATABASE_URL="postgresql://username:password@localhost:5432/booklyx"

# JWT Token (generate a random string)
JWT_SECRET="your-secret-key-here-min-32-chars"

# Email Service (optional development setup)
EMAIL_HOST="smtp.ethereal.email"
EMAIL_USER="your-email"
EMAIL_PASS="your-password"

# Node Environment
NODE_ENV="development"
VERIFICATION_CODE_EXPIRES_MINUTES="10"

# Optional: Postman Integration (see Postman Setup section)
POSTMAN_API_KEY=""
POSTMAN_WORKSPACE_ID=""
```

### 3. Database Setup

**First time only:**

```bash
npx prisma migrate deploy
npx prisma db seed
```

This creates the database schema and seeds the default admin account.

**Default Admin Credentials:**

- Email: `admin@booklyx.com`
- Password: `12345678`
- Role: `super_admin`
- Platform: `WEB`

### 4. Start Development Server

```bash
npm run dev
```

The server runs on `http://localhost:3000`

---

## Postman Integration (Optional)

### Quick Start (Local Testing)

No setup needed for local API testing with Postman. Just use:

- **Base URL**: `http://localhost:3000`
- **Collection**: `docs/postman/booklyx-backend.postman_collection.json`
- **Environment**: `docs/postman/booklyx-backend.postman_environment.json`

### Cloud Sync Setup (Team Collaboration)

To sync your API collection to Postman Cloud for team collaboration:

#### Step 1: Get Postman API Credentials

1. Go to [Postman Settings](https://www.postman.com/settings/me/api-keys)
2. Generate an API key
3. Copy it to your `.env` file as `POSTMAN_API_KEY`

#### Step 2: Create/Find Workspace ID

1. Open [Postman](https://www.postman.com/)
2. Select your workspace (create one if needed)
3. Get the workspace ID from the URL: `https://www.postman.com/workspace/{workspace-id}/...`
4. Add to `.env` as `POSTMAN_WORKSPACE_ID`

#### Step 3: Complete `.env` Configuration

```bash
POSTMAN_API_KEY="your_api_key_here"
POSTMAN_WORKSPACE_ID="your_workspace_id_here"
# These are auto-generated on first sync:
POSTMAN_COLLECTION_UID=""
POSTMAN_ENVIRONMENT_UID=""
```

#### Step 4: Run Initial Sync

```bash
npm run postman:sync
```

**Note:** After the first sync, copy the generated `POSTMAN_COLLECTION_UID` and `POSTMAN_ENVIRONMENT_UID` from the terminal output and add them to `.env` for future syncs.

### Update Documentation When Adding APIs

After adding new routes/endpoints, update the Postman documentation:

```bash
npm run postman:sync
```

This pushes the collection and environment to Postman Cloud (if credentials are configured).

---

## Development Commands

### Core Commands

```bash
# Start development server (auto-reloads on changes)
npm run dev

# Run all tests
npm run test
```

### Database

```bash
# Generate Prisma Client (after schema changes)
npx prisma generate

# Create and apply a new migration
npx prisma migrate dev --name migration_name

# Reset database (⚠️ destructive - deletes all data)
npx prisma migrate reset

# Open visual database editor
npx prisma studio
```

### Postman Documentation

```bash
# Sync collection and environment to Postman (if configured)
npm run postman:sync
```

---

## Project Structure

```
src/
├── server.js                 # Express app entry point
├── middleware/               # Global middlewares
│   ├── authenticate.js      # JWT verification
│   ├── errorHandler.js      # Centralized error handling
│   └── rateLimiter.js       # Rate limiting
├── modules/                  # Feature modules
│   ├── auth/                # Authentication module
│   ├── admin/               # Admin management
│   ├── branch_admin/        # Branch admin operations
│   └── ...
├── routes/
│   └── index.js             # Main route aggregator
├── lib/
│   ├── prisma.js            # Prisma client
│   ├── email.js             # Email service
│   └── i18n/                # Internationalization (en/ar)
└── utils/
    ├── AppError.js          # Custom error class
    ├── asyncHandler.js      # Async/await wrapper
    └── response.js          # Response formatting

prisma/
├── schema.prisma            # Database schema
├── migrations/              # Database migrations
└── seed.js                  # Database seeding

docs/
├── postman/                 # Postman files
│   ├── booklyx-backend.postman_collection.json
│   └── booklyx-backend.postman_environment.json
└── postman-routes.md        # API documentation
```

---

## Testing

### Run Tests

```bash
npm run test
```

Tests are located in `src/modules/__tests__/` following Jest patterns.

### Writing Tests

1. Create test files: `src/modules/[module]/__tests__/[module].service.test.js`
2. Use Jest patterns and mocked Prisma client
3. Example:

```javascript
import { prismaMock } from "../../__mocks__/prisma.js";
import { someService } from "../[module].service.js";

describe("[Module] Service", () => {
  it("should do something", async () => {
    prismaMock.model.findUnique.mockResolvedValue({ id: 1 });
    const result = await someService();
    expect(result.id).toBe(1);
  });
});
```

---

## Troubleshooting

### Port Already in Use

If port 3000 is busy:

```bash
# You can specify a different port (requires code change)
# Edit src/server.js and change the PORT
```

### Database Connection Error

Check your `DATABASE_URL`:

- PostgreSQL is running
- Connection string is correct: `postgresql://user:pass@host:port/database`
- Database exists

### Prisma Issues

```bash
# Regenerate Prisma Client after schema changes
npx prisma generate

# Reset everything (⚠️ deletes data)
npx prisma migrate reset
```

### JWT Token Issues

- Ensure `JWT_SECRET` is at least 32 characters
- Use a strong random string: `openssl rand -base64 32`

### Email Not Sending

Email setup is optional for development:

- Set `NODE_ENV=development` to mock emails
- For production, configure real SMTP credentials

---

## Deployment

See [README.md](README.md#railway-deployment-checklist) for Railway deployment instructions.

Key environment variables for production:

- `DATABASE_URL` - Production database connection string
- `JWT_SECRET` - Secure random token key
- `NODE_ENV` - Set to `production`
- Email credentials (if real email needed)
- Optional: Postman integration credentials

---

## Common Tasks

### Add a New Module

1. Create module folder: `src/modules/mymodule/`
2. Create files:
   - `mymodule.controller.js`
   - `mymodule.service.js`
   - `mymodule.routes.js`
   - `mymodule.validation.js` (if needed)
3. Export router in `src/routes/index.js`
4. Push to Postman: `npm run postman:sync`

### Fix Database Schema

1. Edit `prisma/schema.prisma`
2. Create migration: `npx prisma migrate dev --name describe_change`
3. Review the generated SQL in `prisma/migrations/`
4. Commit and push

### Update API Documentation

1. Modify routes/validation
2. Run: `npm run postman:sync`
3. Review changes in Postman
4. Commit the updated collection

---

## Getting Help

- Check `.github/copilot-instructions.md` for AI assistant guidelines
- Review existing modules for examples
- Check `docs/postman-routes.md` for API documentation
- Read error messages in the console carefully

---

## Next Steps

1. ✅ Complete [Initial Setup](#initial-setup)
2. ✅ Start `npm run dev` and verify server runs
3. ⚙️ (Optional) Set up [Postman Integration](#postman-integration-optional)
4. 📚 Review [API Endpoints](#postman-documentation-optional)
5. 🧪 Write tests for your features
6. 🚀 Deploy to production when ready

---

**Happy coding! 🚀**
