import { expect } from "@jest/globals";

export async function expectValidationError(action, ErrorClass, expected = {}) {
  const promise = Promise.resolve().then(() => (
    typeof action === "function" ? action() : action
  ));

  await expect(promise).rejects.toMatchObject({
    name: ErrorClass.name,
    ...expected,
  });
}