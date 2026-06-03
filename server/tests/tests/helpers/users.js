import { MongoClient } from "mongodb";
import { api } from "./http.js";
import { firebaseWebApiKey, mongoDatabase, mongoUri } from "./env.js";

const createdUsers = new Map();

export function uniqueUser() {
  const id = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  return {
    email: `test-${id}@example.com`,
    password: "Password1!",
    username: `testuser${id}`.replace(/[^a-zA-Z0-9]/g, "")
  };
}

export async function registerUser(user, options = {}) {
  const body = {
    email: user.email,
    password: user.password
  };

  if (options.includeUsername !== false) {
    body.username = user.username;
  }

  const response = await api("/api/authentication/register", {
    body
  });

  if (response.status === 201) {
    trackUser({
      ...user,
      userId: response.json.user.userId
    });
  }

  return response;
}

export async function registerAndLogin() {
  const user = uniqueUser();
  const register = await registerUser(user);
  if (register.status !== 201) {
    throw new Error(`Registration failed with ${register.status}: ${register.text}`);
  }

  const token = await getFirebaseIdToken(user.email, user.password);
  const tracked = {
    ...user,
    token,
    userId: register.json.user.userId
  };
  trackUser(tracked);

  return tracked;
}

export async function createFirebaseOnlyUser() {
  const user = uniqueUser();
  const response = await postFirebase(firebaseUrl("accounts:signUp"), {
    email: user.email,
    password: user.password,
    returnSecureToken: true
  });

  const tracked = {
    ...user,
    token: response.idToken,
    userId: response.localId
  };
  trackUser(tracked);

  return tracked;
}

export async function getFirebaseIdToken(email, password) {
  const response = await postFirebase(firebaseUrl("accounts:signInWithPassword"), {
    email,
    password,
    returnSecureToken: true
  });

  return response.idToken;
}

export async function cleanupCreatedData() {
  const users = [...createdUsers.values()];
  createdUsers.clear();

  await cleanupMongo(users);
  await cleanupFirebase(users);
}

function trackUser(user) {
  const key = user.userId ?? user.email;
  const existing = createdUsers.get(key);
  createdUsers.set(key, {
    email: existing?.email ?? user.email,
    password: existing?.password ?? user.password,
    token: user.token ?? existing?.token,
    userId: existing?.userId ?? user.userId,
    username: existing?.username ?? user.username
  });
}

async function cleanupFirebase(users) {
  for (const user of users) {
    try {
      let token = user.token;
      if (!token && user.email && user.password) {
        token = await getFirebaseIdToken(user.email, user.password);
      }
      if (token) {
        await postFirebase(firebaseUrl("accounts:delete"), { idToken: token });
      }
    } catch (error) {
      const message = String(error?.message ?? error);
      if (!message.includes("EMAIL_NOT_FOUND") && !message.includes("USER_NOT_FOUND")) {
        console.error(`Firebase cleanup failed for ${user.email}: ${message}`);
      }
    }
  }
}

async function cleanupMongo(users) {
  if (!users.length) {
    return;
  }

  const uri = mongoUri();
  if (!uri) {
    return;
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(mongoDatabase());

    await cleanupUserDocs(db, users);
  } catch (error) {
    console.error(`Mongo cleanup failed: ${error.message}`);
  } finally {
    await client.close();
  }
}

async function cleanupUserDocs(db, users) {
  if (!users.length) {
    return;
  }

  const emails = users.map((user) => user.email).filter(Boolean);
  const usernames = users.map((user) => user.username).filter(Boolean);
  const userIds = users.map((user) => user.userId).filter(Boolean);

  const profileQuery = orQuery([
    userIds.length && { userId: { $in: userIds } },
    usernames.length && { displayName: { $in: usernames } }
  ]);
  if (profileQuery) {
    await db.collection("profiles").deleteMany(profileQuery);
  }

  const userQuery = orQuery([
    userIds.length && { userId: { $in: userIds } },
    emails.length && { email: { $in: emails } },
    usernames.length && { username: { $in: usernames } }
  ]);
  if (userQuery) {
    await db.collection("users").deleteMany(userQuery);
  }
}

function orQuery(clauses) {
  const filtered = clauses.filter(Boolean);
  return filtered.length ? { $or: filtered } : null;
}

async function postFirebase(url, body) {
  const response = await fetch(url, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST"
  });
  const json = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(json));
  }

  return json;
}

function firebaseUrl(action) {
  return `https://identitytoolkit.googleapis.com/v1/${action}?key=${firebaseWebApiKey()}`;
}
