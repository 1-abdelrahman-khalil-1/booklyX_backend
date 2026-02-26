# BooklyX Backend - Developer & AI Instructions

## 1. Project Architecture (Feature-Based)

- **Modular Structure**: The application is divided into `src/modules/*` (e.g., `auth`, `admin`, `users`, `branch_admin`). Each module must contain its own:
  - `[module].controller.ts`: Handles Express HTTP requests/responses logic.
  - `[module].service.ts`: Contains the core business logic and database interactions.
  - `[module].routes.ts`: Defines the Express router for the module.
  - `[module].validation.ts` (if applicable): Defines Zod validation schemas and helper parse functions.

## 2. Validation & Zod Schemas

- Do **not** write raw Zod schemas inside controllers or services. Find or create a `[module].validation.ts` file.
- When validating input, use a custom helper function (e.g., `validateAuthInput<T>(schema, data)`) inside the validation file that parses the data using `schema.safeParse()`, and throws a custom AppError (defined in the service) if validation fails.
- Map Zod validation error messages to localization keys (e.g., `error: tr.EMAIL_INVALID`).

## 3. Global Error Handling

- Never use `try...catch` blocks in Controllers. Rely on the `asyncHandler` wrapper (`src/utils/asyncHandler.ts`) to catch unhandled promise rejections.
- If a business rule fails in a Service, throw a custom error class that extends `AppError` (imported from `src/utils/AppError.ts`). This allows the global `errorHandler` middleware to correctly format HTTP responses.
- Define custom AppErrors inside the corresponding `[module].service.ts` or in a generic error file, specifying the proper HTTP status code and translation key message.

## 4. Localization (i18n)

- Return strings using the translation file logic. Instead of hardcoded english strings, return `tr.SOME_KEY`. The global Error Handler and controllers will translate them dynamically based on the request's platform/language.

## 5. Typical Controller Flow

```typescript
import { Request, Response } from "express";
import { getLanguage, t, tr } from "../../lib/i18n/index.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/response.js";
import { someServiceFunction } from "./example.service.js";

export const exampleHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const lang = getLanguage(req);
    const result = await someServiceFunction(req.body);
    successResponse(res, 200, t(tr.SUCCESS_KEY, lang), result);
  },
);
```

## 6. Routing

- When you add a new module or set of endpoints, always export its router and plug it into `src/routes/index.ts`. Do not clutter `src/server.ts` with individual module routes.
