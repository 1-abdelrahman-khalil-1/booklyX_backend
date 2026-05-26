export function validateSeedData(schema, data, label) {
  const result = schema.safeParse(data);
  if (result.success) return result.data;

  const issue = result.error.issues[0];
  const message = issue?.message ?? "Invalid seed data";
  const path = issue?.path?.length ? ` (${issue.path.join(".")})` : "";

  throw new Error(`[Seed Validation] ${label}${path}: ${message}`);
}
