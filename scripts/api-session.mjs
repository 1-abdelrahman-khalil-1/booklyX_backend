import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const SESSION_PATH = path.resolve(process.cwd(), ".api/session.json");
const DEFAULT_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";
const DEFAULT_LANG = process.env.API_LANG || "en";

const ROLE_MAP = {
  client: "client",
  branch_admin: "branch_admin",
  staff: "staff",
  super_admin: "super_admin",
};

function normalizeRole(value) {
  if (!value) return null;
  const role = String(value).trim().toLowerCase();
  return ROLE_MAP[role] || null;
}

function defaultPlatformForRole(role) {
  if (role === "branch_admin" || role === "super_admin") return "WEB";
  return "APP";
}

function parseArgs(argv) {
  const result = {};

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;

    const withoutPrefix = token.slice(2);
    const eqIndex = withoutPrefix.indexOf("=");

    if (eqIndex >= 0) {
      const key = withoutPrefix.slice(0, eqIndex);
      const value = withoutPrefix.slice(eqIndex + 1);
      result[key] = value;
      continue;
    }

    const key = withoutPrefix;
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      result[key] = true;
      continue;
    }

    result[key] = next;
    i += 1;
  }

  return result;
}

async function readSession() {
  try {
    const raw = await fs.readFile(SESSION_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return {
      baseUrl: parsed.baseUrl || DEFAULT_BASE_URL,
      lang: parsed.lang || DEFAULT_LANG,
      tokens: parsed.tokens || {},
    };
  } catch {
    return {
      baseUrl: DEFAULT_BASE_URL,
      lang: DEFAULT_LANG,
      tokens: {},
    };
  }
}

async function writeSession(session) {
  await fs.mkdir(path.dirname(SESSION_PATH), { recursive: true });
  await fs.writeFile(
    SESSION_PATH,
    `${JSON.stringify(
      {
        ...session,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

function requireField(value, message) {
  if (!value) {
    throw new Error(message);
  }
  return value;
}

function shortToken(token) {
  if (!token || token.length < 16) return token || "";
  return `${token.slice(0, 8)}...${token.slice(-6)}`;
}

async function requestJson({ method, url, body, headers }) {
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const msg = payload?.message || `Request failed with status ${response.status}`;
    throw new Error(msg);
  }

  return payload;
}

function printUsage() {
  console.log("BooklyX API session helper");
  console.log("");
  console.log("Commands:");
  console.log("  login");
  console.log("    --role client|branch_admin|staff|super_admin");
  console.log("    --email <email>");
  console.log("    --password <password>");
  console.log("    [--platform APP|WEB]");
  console.log("    [--baseUrl http://localhost:3000]");
  console.log("    [--lang en|ar]");
  console.log("");
  console.log("  refresh");
  console.log("    --role client|branch_admin|staff|super_admin");
  console.log("    [--refreshToken <token>]");
  console.log("    [--platform APP|WEB]");
  console.log("    [--baseUrl http://localhost:3000]");
  console.log("    [--lang en|ar]");
  console.log("");
  console.log("  show");
  console.log("  clear [--role client|branch_admin|staff|super_admin]");
  console.log("  export-apidog [--out .api/apidog-variables.json] [--platform APP|WEB]");
}

async function loginCommand(flags) {
  const role = normalizeRole(requireField(flags.role, "Missing --role"));
  const email = requireField(flags.email, "Missing --email");
  const password = requireField(flags.password, "Missing --password");

  const session = await readSession();
  const baseUrl = flags.baseUrl || session.baseUrl || DEFAULT_BASE_URL;
  const lang = flags.lang || session.lang || DEFAULT_LANG;
  const platform = String(flags.platform || defaultPlatformForRole(role)).toUpperCase();

  const payload = await requestJson({
    method: "POST",
    url: `${baseUrl}/auth/login`,
    headers: {
      "Content-Type": "application/json",
      "Accept-Language": lang,
      platform,
    },
    body: {
      email,
      password,
      role,
    },
  });

  const data = payload?.data || {};
  const responseRole = normalizeRole(data?.user?.role) || role;
  const entry = {
    token: data.token || "",
    refreshToken: data.refreshToken || "",
    platform,
    user: data.user || null,
    updatedAt: new Date().toISOString(),
  };

  session.baseUrl = baseUrl;
  session.lang = lang;
  session.tokens[responseRole] = {
    ...(session.tokens[responseRole] || {}),
    ...entry,
  };

  await writeSession(session);

  console.log(`Logged in as ${responseRole}`);
  console.log(`Access token: ${shortToken(entry.token)}`);
  if (entry.refreshToken) {
    console.log(`Refresh token: ${shortToken(entry.refreshToken)}`);
  } else {
    console.log("Refresh token not returned (expected on WEB cookie flow).");
  }
  console.log(`Session saved at ${SESSION_PATH}`);
}

async function refreshCommand(flags) {
  const role = normalizeRole(requireField(flags.role, "Missing --role"));
  const session = await readSession();

  const baseUrl = flags.baseUrl || session.baseUrl || DEFAULT_BASE_URL;
  const lang = flags.lang || session.lang || DEFAULT_LANG;

  const existing = session.tokens[role] || {};
  const platform = String(
    flags.platform || existing.platform || defaultPlatformForRole(role),
  ).toUpperCase();

  const refreshToken = flags.refreshToken || existing.refreshToken;
  requireField(refreshToken, `No refresh token found for role ${role}. Run login first.`);

  const payload = await requestJson({
    method: "POST",
    url: `${baseUrl}/auth/refresh`,
    headers: {
      "Content-Type": "application/json",
      "Accept-Language": lang,
      platform,
    },
    body: {
      refreshToken,
    },
  });

  const data = payload?.data || {};
  const nextToken = data.token || existing.token || "";
  const nextRefresh = data.refreshToken || refreshToken;

  session.baseUrl = baseUrl;
  session.lang = lang;
  session.tokens[role] = {
    ...existing,
    token: nextToken,
    refreshToken: nextRefresh,
    platform,
    updatedAt: new Date().toISOString(),
  };

  await writeSession(session);

  console.log(`Token refreshed for ${role}`);
  console.log(`Access token: ${shortToken(nextToken)}`);
  console.log(`Refresh token: ${shortToken(nextRefresh)}`);
  console.log(`Session saved at ${SESSION_PATH}`);
}

async function showCommand() {
  const session = await readSession();
  const compact = {
    baseUrl: session.baseUrl,
    lang: session.lang,
    tokens: {},
  };

  Object.entries(session.tokens).forEach(([role, entry]) => {
    compact.tokens[role] = {
      platform: entry.platform,
      token: shortToken(entry.token),
      refreshToken: shortToken(entry.refreshToken),
      updatedAt: entry.updatedAt,
    };
  });

  console.log(JSON.stringify(compact, null, 2));
}

async function clearCommand(flags) {
  const role = normalizeRole(flags.role);

  if (!role) {
    await fs.rm(path.dirname(SESSION_PATH), { recursive: true, force: true });
    console.log("Cleared all local API session data.");
    return;
  }

  const session = await readSession();
  delete session.tokens[role];
  await writeSession(session);
  console.log(`Cleared session for role ${role}.`);
}

async function exportApidogCommand(flags) {
  const session = await readSession();
  const outPath = path.resolve(
    process.cwd(),
    flags.out || ".api/apidog-variables.json",
  );

  const varsMap = {
    baseUrl: session.baseUrl || DEFAULT_BASE_URL,
    platform: String(flags.platform || "APP").toUpperCase(),
    lang: session.lang || DEFAULT_LANG,
    clientToken: session.tokens.client?.token || "",
    branchAdminToken: session.tokens.branch_admin?.token || "",
    staffToken: session.tokens.staff?.token || "",
    adminToken: session.tokens.super_admin?.token || "",
    refreshClientToken: session.tokens.client?.refreshToken || "",
    refreshBranchAdminToken: session.tokens.branch_admin?.refreshToken || "",
    refreshStaffToken: session.tokens.staff?.refreshToken || "",
    refreshAdminToken: session.tokens.super_admin?.refreshToken || "",
    resetToken: "",
  };

  const vars = {
    variables: Object.entries(varsMap).map(([name, value]) => ({
      name,
      value,
    })),
  };

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, `${JSON.stringify(vars, null, 2)}\n`, "utf8");

  console.log(`Apidog variables exported to ${outPath}`);
}

async function exportEnvConfigCommand(flags) {
  const session = await readSession();
  const env = normalizeField(flags.env || "local", "environment name");
  const baseUrl = requireField(flags.baseUrl, `Missing --baseUrl for ${env} environment`);

  const varsMap = {
    baseUrl,
    platform: String(flags.platform || "APP").toUpperCase(),
    lang: session.lang || DEFAULT_LANG,
    clientToken: session.tokens.client?.token || "",
    branchAdminToken: session.tokens.branch_admin?.token || "",
    staffToken: session.tokens.staff?.token || "",
    adminToken: session.tokens.super_admin?.token || "",
    refreshClientToken: session.tokens.client?.refreshToken || "",
    refreshBranchAdminToken: session.tokens.branch_admin?.refreshToken || "",
    refreshStaffToken: session.tokens.staff?.refreshToken || "",
    refreshAdminToken: session.tokens.super_admin?.refreshToken || "",
    resetToken: "",
  };

  const vars = {
    variables: Object.entries(varsMap).map(([name, value]) => ({
      name,
      value,
    })),
  };

  const filename = `apidog-variables-${env}.json`;
  const outPath = path.resolve(process.cwd(), ".api", filename);

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, `${JSON.stringify(vars, null, 2)}\n`, "utf8");

  console.log(`${env.charAt(0).toUpperCase() + env.slice(1)} environment variables exported to ${outPath}`);
}

function normalizeField(value, name) {
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return String(value).trim().toLowerCase();
}

async function main() {
  const command = process.argv[2];
  const flags = parseArgs(process.argv.slice(3));

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printUsage();
    return;
  }

  if (command === "login") {
    await loginCommand(flags);
    return;
  }

  if (command === "refresh") {
    await refreshCommand(flags);
    return;
  }

  if (command === "show") {
    await showCommand();
    return;
  }

  if (command === "clear") {
    await clearCommand(flags);
    return;
  }

  if (command === "export-apidog") {
    await exportApidogCommand(flags);
    return;
  }

  if (command === "export-env") {
    await exportEnvConfigCommand(flags);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(`api-session error: ${error.message}`);
  process.exit(1);
});
