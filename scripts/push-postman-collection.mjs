import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const apiKey = process.env.POSTMAN_API_KEY;
const collectionUid = process.env.POSTMAN_COLLECTION_UID;

if (!apiKey) {
  console.error("Missing POSTMAN_API_KEY");
  process.exit(1);
}

const collectionFilePath = path.resolve(
  process.cwd(),
  "docs/postman/booklyx-backend.postman_collection.json",
);
const docsFilePath = path.resolve(process.cwd(), "docs/postman-routes.md");

const file = await fs.readFile(collectionFilePath, "utf8");
const collection = JSON.parse(file);

try {
  const docsMarkdown = await fs.readFile(docsFilePath, "utf8");
  if (!collection.info) collection.info = {};
  collection.info.description = docsMarkdown;
} catch (error) {
  console.warn(
    "Could not load docs/postman-routes.md. Syncing without doc injection.",
  );
}

const requestOptions = {
  headers: {
    "X-Api-Key": apiKey,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ collection }),
};

let endpoint = "https://api.getpostman.com/collections";
let method = "POST";

if (collectionUid) {
  endpoint = `https://api.getpostman.com/collections/${collectionUid}`;
  method = "PUT";
}

const response = await fetch(endpoint, {
  method,
  ...requestOptions,
});

const body = await response.json();

if (!response.ok) {
  console.error("Failed to sync Postman collection:", body);
  process.exit(1);
}

if (method === "POST") {
  console.log("Postman collection created successfully.");
  console.log("Set this in your env for next updates:");
  console.log(
    `POSTMAN_COLLECTION_UID=${body?.collection?.uid ?? "<missing-uid>"}`,
  );
} else {
  console.log("Postman collection updated successfully.");
}

if (body?.collection?.uid) {
  console.log(`Collection UID: ${body.collection.uid}`);
}
