import { existsSync, readFileSync } from "node:fs";

const DOTENV_FILES = [".env.client", ".env.server", ".client-env", ".server-env"];
const values = loadEnvFiles();

export function env(...names) {
  for (const name of names) {
    const value = process.env[name] ?? values[name];
    if (value != null && String(value).trim() !== "") {
      return value;
    }
  }
  return undefined;
}

export function requiredEnv(...names) {
  const value = env(...names);
  if (!value) {
    throw new Error(`Missing required env var: ${names.join(" or ")}`);
  }
  return value;
}

export function apiBaseUrl() {
  const explicit = env("API_BASE_URL");
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const port = env("PORT") ?? "5000";
  return `http://127.0.0.1:${port}`;
}

export function mongoUri() {
  return env("TEST_MONGODB_URI", "MONGODB_URI", "MONGO_URI", "MONGO_CONNECTION");
}

export function mongoDatabase() {
  return env("TEST_MONGODB_DATABASE", "MONGODB_DATABASE", "MONGO_DATABASE", "DB_NAME");
}

export function firebaseWebApiKey() {
  return requiredEnv("FIREBASE_WEB_API_KEY", "VITE_FIREBASE_API_KEY");
}

function loadEnvFiles() {
  const loaded = {};

  for (const file of DOTENV_FILES) {
    if (!existsSync(file)) {
      continue;
    }

    const content = readFileSync(file, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      let line = rawLine.trim();
      if (!line || line.startsWith("#")) {
        continue;
      }
      if (line.startsWith("export ")) {
        line = line.slice("export ".length).trimStart();
      }

      const equals = line.indexOf("=");
      if (equals <= 0) {
        continue;
      }

      const key = line.slice(0, equals).trim();
      const value = stripEnvValue(line.slice(equals + 1).trim());
      if (key) {
        loaded[key] = value;
      }
    }
  }

  return loaded;
}

function stripEnvValue(value) {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === "\"" && last === "\"") || (first === "'" && last === "'")) {
      value = value.slice(1, -1);
    }
  }

  return value
    .replaceAll("\\n", "\n")
    .replaceAll("\\\"", "\"")
    .replaceAll("\\'", "'");
}
