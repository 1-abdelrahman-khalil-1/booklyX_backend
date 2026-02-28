import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const apiKey = process.env.POSTMAN_API_KEY;
const collectionUid = process.env.POSTMAN_COLLECTION_UID;
const environmentUid = process.env.POSTMAN_ENVIRONMENT_UID;
const workspaceId = process.env.POSTMAN_WORKSPACE_ID;

if (!apiKey) {
  console.error("Missing POSTMAN_API_KEY");
  process.exit(1);
}

if (!workspaceId) {
  console.error("Missing POSTMAN_WORKSPACE_ID");
  process.exit(1);
}

const collectionFilePath = path.resolve(
  process.cwd(),
  "docs/postman/booklyx-backend.postman_collection.json",
);
const environmentFilePath = path.resolve(
  process.cwd(),
  "docs/postman/booklyx-backend.postman_environment.json",
);
const docsFilePath = path.resolve(process.cwd(), "docs/postman-routes.md");
const dotEnvPath = path.resolve(process.cwd(), ".env");

const collectionFile = await fs.readFile(collectionFilePath, "utf8");
const collection = JSON.parse(collectionFile);
const environmentFile = await fs.readFile(environmentFilePath, "utf8");
const environment = JSON.parse(environmentFile);

const DEFAULT_ENV_VALUES = {
  baseUrl: "http://localhost:3000",
  platform: "APP",
  lang: "en",
  token: "",
  refreshToken: "",
  resetToken: "",
};

function sanitizeCollectionPayload(source) {
  const sanitized = structuredClone(source);

  if (!sanitized.info) sanitized.info = {};
  delete sanitized.info._postman_id;

  return sanitized;
}

function sanitizeEnvironmentPayload(source) {
  const sanitized = structuredClone(source);

  delete sanitized.id;
  delete sanitized.uid;
  delete sanitized.owner;
  delete sanitized._postman_exported_at;
  delete sanitized._postman_exported_using;

  return sanitized;
}

function ensureEnvironmentDefaults(source) {
  const normalized = structuredClone(source);

  if (!Array.isArray(normalized.values)) {
    normalized.values = [];
  }

  const valuesByKey = new Map(
    normalized.values
      .filter((entry) => entry && typeof entry.key === "string")
      .map((entry) => [entry.key, entry]),
  );

  Object.entries(DEFAULT_ENV_VALUES).forEach(([key, value]) => {
    const existing = valuesByKey.get(key);

    if (!existing) {
      normalized.values.push({
        key,
        value,
        type: "default",
        enabled: true,
      });
      return;
    }

    existing.value = existing.value ?? value;
    existing.type = existing.type ?? "default";
    existing.enabled = existing.enabled ?? true;
  });

  return normalized;
}

async function writeEnvironmentFile(targetPath, payload) {
  await fs.writeFile(
    targetPath,
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
}

async function upsertDotEnvVar(key, value) {
  if (!value) return;

  // eslint-disable-next-line no-useless-assignment
  let current = "";
  try {
    current = await fs.readFile(dotEnvPath, "utf8");
  } catch {
    current = "";
  }

  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");

  let next;
  if (pattern.test(current)) {
    next = current.replace(pattern, line);
  } else {
    const needsNewline = current.length > 0 && !current.endsWith("\n");
    next = `${current}${needsNewline ? "\n" : ""}${line}\n`;
  }

  if (next !== current) {
    await fs.writeFile(dotEnvPath, next, "utf8");
    console.log(`Updated .env: ${key}`);
  }
}

try {
  const docsMarkdown = await fs.readFile(docsFilePath, "utf8");
  if (!collection.info) collection.info = {};
  collection.info.description = docsMarkdown;
// eslint-disable-next-line no-unused-vars
} catch (error) {
  console.warn(
    "Could not load docs/postman-routes.md. Syncing without doc injection.",
  );
}

async function upsertResource({ type, uid, payload, payloadKey, name }) {
  async function request(targetUid) {
    const method = targetUid ? "PUT" : "POST";
    const endpoint = targetUid
      ? `https://api.getpostman.com/${type}/${targetUid}?workspace=${workspaceId}`
      : `https://api.getpostman.com/${type}?workspace=${workspaceId}`;

    const response = await fetch(endpoint, {
      method,
      headers: {
        "X-Api-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ [payloadKey]: payload }),
    });

    const body = await response.json();
    return { response, body, method };
  }

  let result = await request(uid);

  const missingInstance =
    !result.response.ok && result.body?.error?.name === "instanceNotFoundError";

  if (uid && missingInstance) {
    console.warn(
      `Provided ${name} UID not found on Postman. Creating a new ${name} instead...`,
    );
    result = await request(undefined);
  }

  if (!result.response.ok) {
    console.error(`Failed to sync Postman ${name}:`, result.body);
    process.exit(1);
  }

  const resultingUid = result.body?.[payloadKey]?.uid;

  if (result.method === "POST") {
    console.log(`Postman ${name} created successfully.`);
  } else {
    console.log(`Postman ${name} updated successfully.`);
  }

  if (resultingUid) {
    console.log(
      `${name} UID: ${resultingUid} (${name === "collection" ? "POSTMAN_COLLECTION_UID" : "POSTMAN_ENVIRONMENT_UID"})`,
    );
  }

  return resultingUid;
}

const collectionPayload = sanitizeCollectionPayload(collection);
const normalizedEnvironment = ensureEnvironmentDefaults(environment);
await writeEnvironmentFile(environmentFilePath, normalizedEnvironment);
const environmentPayload = sanitizeEnvironmentPayload(normalizedEnvironment);

const syncedCollectionUid = await upsertResource({
  type: "collections",
  uid: collectionUid,
  payload: collectionPayload,
  payloadKey: "collection",
  name: "collection",
});

const syncedEnvironmentUid = await upsertResource({
  type: "environments",
  uid: environmentUid,
  payload: environmentPayload,
  payloadKey: "environment",
  name: "environment",
});

if (!collectionUid && syncedCollectionUid) {
  console.log("Set this in your .env for next updates:");
  console.log(`POSTMAN_COLLECTION_UID=${syncedCollectionUid}`);
}

if (!environmentUid && syncedEnvironmentUid) {
  console.log("Set this in your .env for next updates:");
  console.log(`POSTMAN_ENVIRONMENT_UID=${syncedEnvironmentUid}`);
}

await upsertDotEnvVar("POSTMAN_COLLECTION_UID", syncedCollectionUid);
await upsertDotEnvVar("POSTMAN_ENVIRONMENT_UID", syncedEnvironmentUid);
