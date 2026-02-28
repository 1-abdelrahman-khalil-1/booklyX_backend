# BooklyX Backend - Developer & AI Instructions

## 1. Project Architecture (Feature-Based)

- **Modular Structure**: The application is divided into `src/modules/*` (e.g., `auth`, `admin`, `users`, `branch_admin`). Each module must contain its own:
  - `[module].controller.js`: Handles Express HTTP requests/responses logic.
  - `[module].service.js`: Contains the core business logic and database interactions.
  - `[module].routes.js`: Defines the Express router for the module.
  - `[module].validation.js` (if applicable): Defines Zod validation schemas and helper parse functions.

## 2. Validation & Zod Schemas

- Do **not** write raw Zod schemas inside controllers or services. Find or create a `[module].validation.js` file.
- When validating input, use a custom helper function (e.g., `validateAuthInput(schema, data)`) inside the validation file that parses the data using `schema.safeParse()`, and throws a custom AppError (defined in the service) if validation fails.
- Map Zod validation error messages to localization keys (e.g., `error: tr.EMAIL_INVALID`).

## 3. Global Error Handling

- Never use `try...catch` blocks in Controllers. Rely on the `asyncHandler` wrapper (`src/utils/asyncHandler.js`) to catch unhandled promise rejections.
- If a business rule fails in a Service, throw a custom error class that extends `AppError` (imported from `src/utils/AppError.js`). This allows the global `errorHandler` middleware to correctly format HTTP responses.
- Define custom AppErrors inside the corresponding `[module].service.js` or in a generic error file, specifying the proper HTTP status code and translation key message.

## 4. Localization (i18n)

- Return strings using the translation file logic. Instead of hardcoded english strings, return `tr.SOME_KEY`. The global Error Handler and controllers will translate them dynamically based on the request's platform/language.

## 5. Typical Controller Flow

```javascript
import { getLanguage, t, tr } from "../../lib/i18n/index.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/response.js";
import { someServiceFunction } from "./example.service.js";

export const exampleHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await someServiceFunction(req.body);
  successResponse(res, 200, t(tr.SUCCESS_KEY, lang), result);
});
```

## 6. Routing

- When you add a new module or set of endpoints, always export its router and plug it into `src/routes/index.js`. Do not clutter `src/server.js` with individual module routes.

## 7. Testing

- Write unit tests for core logical functions and services using `Jest`.
- Store tests inside the module directory in a `__tests__` folder (e.g., `src/modules/auth/__tests__/auth.service.test.js`).
- Mock database interactions (Prisma) and third-party dependencies when writing unit tests. Use `npm test` to run them.
