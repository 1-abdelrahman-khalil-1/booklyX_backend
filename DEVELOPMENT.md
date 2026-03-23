# BooklyX Backend - Development Workflow Guide

This guide covers best practices and workflows for developing features in BooklyX Backend.

## Table of Contents

1. [Creating Features](#creating-features)
2. [API Development Workflow](#api-development-workflow)
3. [Database Migrations](#database-migrations)
4. [Testing](#testing)
5. [Documentation](#documentation)
6. [Code Quality](#code-quality)
7. [Common Patterns](#common-patterns)

---

## Creating Features

### Feature Module Structure

Each feature lives in `src/modules/[feature]/`:

```
src/modules/feature/
├── feature.controller.js      # HTTP request handlers
├── feature.service.js         # Business logic
├── feature.routes.js          # Express routes
├── feature.validation.js      # Zod schemas
├── feature.permissions.js     # (optional) Role checks
├── __tests__/
│   ├── feature.service.test.js
│   └── feature.controller.test.js
└── __mocks__/                 # Test mocks
```

### Step 1: Define Database Schema

Edit `prisma/schema.prisma`:

```prisma
model MyEntity {
  id        Int     @id @default(autoincrement())
  name      String
  createdAt DateTime @default(now())
}
```

### Step 2: Create Migration

```bash
npx prisma migrate dev --name add_my_entity
```

This generates migration SQL in `prisma/migrations/` and updates the database.

### Step 3: Create Validation Schema

`src/modules/feature/feature.validation.js`:

```javascript
import { z } from "zod";
import { AppError } from "../../utils/AppError.js";

export const createFeatureSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
});

export const validateCreateFeature = (data) => {
  const result = createFeatureSchema.safeParse(data);
  if (!result.success) {
    throw new AppError(result.error.errors[0].message, 400, "VALIDATION_ERROR");
  }
  return result.data;
};
```

### Step 4: Create Service (Business Logic)

`src/modules/feature/feature.service.js`:

```javascript
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";

export class FeatureError extends AppError {
  constructor(message, status = 400) {
    super(message, status, "FEATURE_ERROR");
  }
}

export const createFeature = async (data) => {
  // Business logic here
  const feature = await prisma.myEntity.create({
    data,
  });
  return feature;
};

export const getFeatures = async () => {
  return await prisma.myEntity.findMany();
};
```

### Step 5: Create Controller

`src/modules/feature/feature.controller.js`:

```javascript
import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/response.js";
import { getLanguage, t, tr } from "../../lib/i18n/index.js";
import { validateCreateFeature } from "./feature.validation.js";
import { createFeature, getFeatures } from "./feature.service.js";

export const createFeatureHandler = asyncHandler(async (req, res) => {
  const data = validateCreateFeature(req.body);
  const feature = await createFeature(data);
  const lang = getLanguage(req);

  successResponse(res, 201, t(tr.FEATURE_CREATED, lang), feature);
});

export const getFeaturesHandler = asyncHandler(async (req, res) => {
  const features = await getFeatures();
  const lang = getLanguage(req);

  successResponse(res, 200, t(tr.SUCCESS, lang), features);
});
```

### Step 6: Create Routes

`src/modules/feature/feature.routes.js`:

```javascript
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import {
  createFeatureHandler,
  getFeaturesHandler,
} from "./feature.controller.js";

const router = Router();

router.post("/", authenticate, createFeatureHandler);
router.get("/", authenticate, getFeaturesHandler);

export default router;
```

### Step 7: Register Routes

Edit `src/routes/index.js`:

```javascript
import featureRouter from "../modules/feature/feature.routes.js";

export const setupRoutes = (app) => {
  app.use("/api/feature", featureRouter);
  // ... other routes
};
```

### Step 8: Write Tests

`src/modules/feature/__tests__/feature.service.test.js`:

```javascript
import { createFeature } from "../feature.service.js";
import { prisma } from "../../../lib/prisma.js";

jest.mock("../../../lib/prisma.js");

describe("Feature Service", () => {
  it("should create a feature", async () => {
    const mockFeature = { id: 1, name: "Test Feature" };

    prisma.myEntity.create.mockResolvedValue(mockFeature);

    const result = await createFeature({ name: "Test Feature" });

    expect(result).toEqual(mockFeature);
  });
});
```

### Step 9: Update Postman Documentation

```bash
npm run postman:sync
```

This syncs your Postman collection and environment to your workspace.

---

## API Development Workflow

### Creating an Endpoint

1. **Define in Postman** (optional but recommended)
   - Add request/response examples
   - Document parameters and headers

2. **Write Validation Schema**

   ```javascript
   // src/modules/auth/auth.validation.js
   export const loginSchema = z.object({
     email: z.string().email(),
     password: z.string().min(8),
   });
   ```

3. **Implement Service Logic**

   ```javascript
   // src/modules/auth/auth.service.js
   export const login = async (email, password) => {
     // Authentication logic
   };
   ```

4. **Create Controller with asyncHandler**

   ```javascript
   // asyncHandler catches errors and passes to error middleware
   export const loginHandler = asyncHandler(async (req, res) => {
     const data = validateInput(req.body);
     const result = await login(data.email, data.password);
     successResponse(res, 200, "Login successful", result);
   });
   ```

5. **Register Route**
   - Add to routes file
   - Register in `src/routes/index.js`

6. **Test & Document**
   - Write unit tests

- Run `npm run postman:sync`

---

## Database Migrations

### Creating a Migration

```bash
npx prisma migrate dev --name descriptive_name
```

This:

1. Compares schema.prisma with current database
2. Generates SQL migration
3. Applies to database
4. Updates Prisma Client

### Viewing Migrations

```bash
npx prisma migrate status
```

### Reverting Changes (Development Only)

```bash
# Reset entire database (⚠️ destructive)
npx prisma migrate reset

# Then re-seed
npx prisma db seed
```

### Production Migrations

```bash
# Preview migrations without applying
npx prisma migrate deploy --preview

# Apply migrations
npx prisma migrate deploy
```

---

## Testing

### Unit Tests

```bash
npm run test
```

### Writing Tests

**Service Test Example:**

```javascript
// src/modules/auth/__tests__/auth.service.test.js
import { login } from "../auth.service.js";
import { prisma } from "../../../lib/prisma.js";

jest.mock("../../../lib/prisma.js");

describe("Auth Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw error for invalid credentials", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(login("test@example.com", "password")).rejects.toThrow(
      "Invalid credentials",
    );
  });
});
```

**Controller Test Example:**

```javascript
import request from "supertest";
import app from "../../../server.js";

describe("Auth Controller", () => {
  it("POST /auth/login should return 401 for invalid credentials", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "test@example.com",
      password: "wrong",
    });

    expect(response.status).toBe(401);
  });
});
```

### Mocking Prisma

```javascript
import { prisma } from "../../../lib/prisma.js";

jest.mock("../../../lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));
```

---

## Documentation

### Postman Integration

When adding new endpoints:

```bash
# Sync to Postman
npm run postman:sync
```

### README Updates

- Document new endpoints in `README.md`
- Add setup steps to `SETUP.md`
- Update `.github/copilot-instructions.md` for AI guidelines

### Inline Code Documentation

```javascript
/**
 * Authenticates a user and returns JWT tokens
 *
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{accessToken, refreshToken}>}
 * @throws {AppError} If credentials are invalid
 */
export const login = async (email, password) => {
  // Implementation
};
```

---

## Code Quality

### ESLint Checking

```bash
npx eslint src/
```

### Formatting

Code should follow project style (configured in `eslint.config.js`).

### Error Handling

✅ **Good:**

```javascript
export const getUser = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
  });

  if (!user) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  successResponse(res, 200, "User found", user);
});
```

❌ **Avoid:**

```javascript
// Don't use try-catch in controllers
try {
  // asyncHandler handles this
} catch (error) {
  // This is redundant
}
```

### Response Formatting

Always use `successResponse` helper:

```javascript
import { successResponse } from "../../utils/response.js";

successResponse(
  res,
  200, // HTTP status
  t(tr.SUCCESS, lang), // Localized message
  data, // Response payload
);
```

---

## Common Patterns

### Checking User Permissions

```javascript
// src/modules/feature/feature.permissions.js
export const canEdit = (user, resource) => {
  return user.id === resource.userId || user.role === "super_admin";
};
```

Usage in controller:

```javascript
import { canEdit } from "./feature.permissions.js";

export const updateFeatureHandler = asyncHandler(async (req, res) => {
  const feature = await getFeature(req.params.id);

  if (!canEdit(req.user, feature)) {
    throw new AppError("Forbidden", 403, "UNAUTHORIZED");
  }

  // Update logic
});
```

### Rate Limiting

```javascript
// src/routes/index.js
import { router } from "express";
import { limiter } from "../middleware/rateLimiter.js";

const app = express();
app.use("/api/auth/login", limiter);
```

### Pagination

```javascript
export const getPaginatedFeatures = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.feature.findMany({ skip, take: limit }),
    prisma.feature.count(),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};
```

### Search & Filter

```javascript
export const searchFeatures = async (query, filters = {}) => {
  return await prisma.feature.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ],
      ...filters,
    },
  });
};
```

---

## Workflow Checklist

For each feature:

- [ ] Update `prisma/schema.prisma`
- [ ] Run `npx prisma migrate dev --name feature_name`
- [ ] Create validation schema in `feature.validation.js`
- [ ] Implement business logic in `feature.service.js`
- [ ] Create handlers in `feature.controller.js`
- [ ] Define routes in `feature.routes.js`
- [ ] Register routes in `src/routes/index.js`
- [ ] Write unit tests
- [ ] Run `npm run postman:sync`
- [ ] Update `README.md` or `SETUP.md` if needed
- [ ] Verify with `npm run test`
- [ ] Commit and push

---

## Getting Unstuck

1. **Check error messages** - They're usually descriptive
2. **Review similar modules** - Copy patterns from existing features
3. **Check copilot instructions** - `.github/copilot-instructions.md`
4. **Ask Copilot** - Use module-specific help

---

**Happy coding! 🚀**
