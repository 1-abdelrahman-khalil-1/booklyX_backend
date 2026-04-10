import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const token = process.env.APIDOG_ACCESS_TOKEN;
const projectId = process.env.APIDOG_PROJECT_ID;
const locale = process.env.APIDOG_LOCALE || "en-US";
const apiVersion = process.env.APIDOG_API_VERSION || "2024-03-28";
const specFile = process.env.OPENAPI_SPEC_FILE || "openapi.yaml";

if (!token) {
  console.error("Missing APIDOG_ACCESS_TOKEN");
  process.exit(1);
}

if (!projectId) {
  console.error("Missing APIDOG_PROJECT_ID");
  process.exit(1);
}

const specPath = path.resolve(process.cwd(), specFile);
const specContent = await fs.readFile(specPath, "utf8");

const endpoint = `https://api.apidog.com/v1/projects/${projectId}/import-openapi?locale=${encodeURIComponent(locale)}`;

const payload = {
  input: specContent,
  options: {
    targetEndpointFolderId: 0,
    targetSchemaFolderId: 0,
    endpointOverwriteBehavior: "OVERWRITE_EXISTING",
    schemaOverwriteBehavior: "OVERWRITE_EXISTING",
    updateFolderOfChangedEndpoint: false,
    prependBasePath: false,
  },
};

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
if (counters) {
  console.log(JSON.stringify(counters, null, 2));
} else {
  console.log(JSON.stringify(result, null, 2));
}
