import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const token = process.env.APIDOG_ACCESS_TOKEN;
const projectId = process.env.APIDOG_PROJECT_ID;
const locale = process.env.APIDOG_LOCALE || "en-US";
const apiVersion = process.env.APIDOG_API_VERSION || "2024-03-28";
const specFile = process.env.OPENAPI_SPEC_FILE || "openapi.yaml";
const allowedOverwriteBehaviors = new Set([
  "AUTO_MERGE",
  "OVERWRITE_EXISTING",
  "KEEP_EXISTING",
  "CREATE_NEW",
]);

const endpointOverwriteBehavior = allowedOverwriteBehaviors.has(
  process.env.APIDOG_ENDPOINT_OVERWRITE_BEHAVIOR,
)
  ? process.env.APIDOG_ENDPOINT_OVERWRITE_BEHAVIOR
  : "AUTO_MERGE";

const schemaOverwriteBehavior = allowedOverwriteBehaviors.has(
  process.env.APIDOG_SCHEMA_OVERWRITE_BEHAVIOR,
)
  ? process.env.APIDOG_SCHEMA_OVERWRITE_BEHAVIOR
  : "AUTO_MERGE";

const debugSync = process.env.APIDOG_SYNC_DEBUG === "1";

if (!token) {
  console.error("Missing APIDOG_ACCESS_TOKEN");
  process.exit(1);
}

if (!projectId) {
  console.error("Missing APIDOG_PROJECT_ID");
  process.exit(1);
}

if (
  process.env.APIDOG_ENDPOINT_OVERWRITE_BEHAVIOR &&
  !allowedOverwriteBehaviors.has(process.env.APIDOG_ENDPOINT_OVERWRITE_BEHAVIOR)
) {
  console.warn(
    `Unsupported APIDOG_ENDPOINT_OVERWRITE_BEHAVIOR='${process.env.APIDOG_ENDPOINT_OVERWRITE_BEHAVIOR}', falling back to OVERWRITE_EXISTING`,
  );
}

if (
  process.env.APIDOG_SCHEMA_OVERWRITE_BEHAVIOR &&
  !allowedOverwriteBehaviors.has(process.env.APIDOG_SCHEMA_OVERWRITE_BEHAVIOR)
) {
  console.warn(
    `Unsupported APIDOG_SCHEMA_OVERWRITE_BEHAVIOR='${process.env.APIDOG_SCHEMA_OVERWRITE_BEHAVIOR}', falling back to OVERWRITE_EXISTING`,
  );
}

const specPath = path.resolve(process.cwd(), specFile);
const specStat = await fs.stat(specPath);
const specContent = await fs.readFile(specPath, "utf8");

if (debugSync) {
  console.log("Apidog sync debug:");
  console.log(`- specPath: ${specPath}`);
  console.log(`- specSizeBytes: ${specStat.size}`);
  console.log(`- specContentLength: ${specContent.length}`);
  console.log("- specPreview(500):");
  console.log(specContent.slice(0, 500));
}

const endpoint = `https://api.apidog.com/v1/projects/${projectId}/import-openapi?locale=${encodeURIComponent(locale)}`;

const payload = {
  input: specContent,
  options: {
    targetEndpointFolderId: 0,
    targetSchemaFolderId: 0,
    endpointOverwriteBehavior,
    schemaOverwriteBehavior,
    updateFolderOfChangedEndpoint: false,
    prependBasePath: false,
  },
};

if (debugSync) {
  console.log(`- payloadLength: ${JSON.stringify(payload).length}`);
  console.log(`- inputType: ${typeof payload.input}`);
}

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    "X-Apidog-Api-Version": apiVersion,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

const result = await response.json().catch(() => ({}));

if (!response.ok) {
  console.error("Failed to sync OpenAPI to Apidog:");
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

const counters = result?.data?.counters;
console.log("Apidog OpenAPI sync completed.");
console.log(
  `Import behavior: endpoint=${endpointOverwriteBehavior}, schema=${schemaOverwriteBehavior}`,
);
if (counters) {
  console.log(JSON.stringify(counters, null, 2));
} else {
  console.log(JSON.stringify(result, null, 2));
}
