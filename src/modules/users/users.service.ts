import bcrypt from "bcrypt";
import { z } from "zod";
import { Prisma, Role } from "../../generated/prisma/client.js";
import { tr } from "../../lib/i18n/index.js";
import prisma from "../../lib/prisma.js";

const SALT_ROUNDS = 10;

export class ValidationError extends Error {
  public params?: Record<string, string>;
  constructor(message: string, params?: Record<string, string>) {
    super(message);
    this.params = params;
    this.name = "ValidationError";
  }
}

export class DuplicateEmailError extends Error {
  constructor() {
    super(tr.DUPLICATE_EMAIL);
    this.name = "DuplicateEmailError";
  }
}

/**
 * ── Zod Schema ──────────────────────────────────────────────────
 *
 * Defines the shape + validation rules for creating a user.
 * `z.enum(Role)` checks that the value is one of the Prisma
 * Role enum members (client, staff, branch_admin, super_admin).
 */
const createUserSchema = z.object({
  name: z.string({ error: tr.NAME_REQUIRED }),
  email: z.email({
    error: (issue) => {
      if (issue.input === undefined) return tr.EMAIL_REQUIRED;
      return tr.EMAIL_INVALID;
    },
  }),
  password: z
    .string({ error: tr.PASSWORD_REQUIRED })
    .min(8, tr.PASSWORD_MIN_LENGTH),
  phone: z
    .string({ error: tr.PHONE_REQUIRED })
    .regex(/^\d{10}$/, tr.PHONE_INVALID),
  role: z.enum(Role, {
    error: tr.ROLE_MUST_BE_ONE_OF,
  }),
});

/**
 * Parses data with a Zod schema; on failure throws `ValidationError`
 * with the first issue's message (which is an i18n key).
 */
function parseWithValidationError<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (result.success) return result.data;

  const firstIssue = result.error.issues[0];

  // If the error is about Role enum, attach dynamic values
  if (firstIssue.message === tr.ROLE_MUST_BE_ONE_OF) {
    throw new ValidationError(firstIssue.message, {
      values: Object.values(Role).join(", "),
    });
  }

  throw new ValidationError(firstIssue.message);
}

export async function createUser(body: unknown) {
  const { name, email, password, phone, role } = parseWithValidationError(createUserSchema, body);

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        role,
      },
    });

    // Omit password from the returned object
    const { password: _password, ...safeUser } = user;
    return safeUser;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new DuplicateEmailError();
    }
    throw error;
  }
}
