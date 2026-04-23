# BooklyX Backend Setup Guide

This guide covers the actual local setup flow for the current repository.

## Prerequisites

- Node.js 18+
- npm
- MySQL

## 1. Install dependencies

```bash
npm install
```

`npm install` also runs `prisma generate` through `postinstall`.

## 2. Create `.env`

You can start from `.env.example`:

```bash
copy .env.example .env
```

Recommended variables:

```bash
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/DB_NAME"
JWT_SECRET="replace-with-a-long-random-secret"
NODE_ENV="development"
PORT="3000"
VERIFICATION_CODE_EXPIRES_MINUTES="10"

EMAIL_HOST="smtp.ethereal.email"
EMAIL_PORT="587"
EMAIL_USER=""
EMAIL_PASS=""
EMAIL_FROM="BooklyX <noreply@booklyx.com>"

API_BASE_URL="http://localhost:3000"
API_LANG="en"

APIDOG_ACCESS_TOKEN=""
APIDOG_PROJECT_ID=""
APIDOG_LOCALE="en-US"
APIDOG_API_VERSION="2024-03-28"
OPENAPI_SPEC_FILE="openapi.yaml"
```

## 3. Run database migrations

For first-time setup:

```bash
npx prisma migrate deploy
```

During normal local development after schema changes:

```bash
npx prisma migrate dev
```

## 4. Seed demo data

```bash
npx prisma db seed
```

Default super admin:

- Email: `admin@booklyx.com`
- Password: `12345678`
- Phone: `01000000000`
- Role: `super_admin`
- Platform: `WEB`

## 5. Start the server

```bash
npm run dev
```

Server URL:

- `http://localhost:3000`

## OTP behavior

- In development, OTP is `333333`.
- In production, hardcoded OTP is rejected.

## Useful commands

```bash
# App
npm run dev
npm start
npm run test

# Prisma
npx prisma generate
npx prisma migrate dev
npx prisma migrate deploy
npx prisma db seed
npx prisma studio

# OpenAPI and Apidog
npm run openapi:validate
npm run apidog:sync

# Local API session helpers
npm run api:login -- --role client --email abdo.khalil@booklyx.com --password 12345678 --platform APP
npm run api:refresh -- --role client --platform APP
npm run api:session
npm run api:logout -- --role client
npm run api:export:apidog
```

## Project docs

- `README.md` for the project overview
- `openapi.yaml` for the API contract
- `docs/apidog-guide.md` for the Apidog workflow
- `DEVELOPMENT.md` for contributor workflow notes

## Troubleshooting

### Database connection issues

Check:

- MySQL is running
- `DATABASE_URL` is correct
- the target database exists

### Prisma issues

```bash
npx prisma generate
```

If you need a clean local reset:

```bash
npx prisma migrate reset
```

### JWT issues

- Make sure `JWT_SECRET` is set.
- Use a long random value in real environments.

### Apidog sync issues

Make sure these exist in `.env` before running sync:

- `APIDOG_ACCESS_TOKEN`
- `APIDOG_PROJECT_ID`

Then run:

```bash
npm run apidog:sync
```
