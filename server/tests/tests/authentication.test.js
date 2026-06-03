import { beforeAll, describe, expect, test } from "vitest";
import { api, expectErrorPayload, expectProfilePayload, expectUserProfilePayload } from "./helpers/http.js";
import {
  createFirebaseOnlyUser,
  getFirebaseIdToken,
  registerAndLogin,
  registerUser,
  uniqueUser
} from "./helpers/users.js";

const protectedAuthEndpoints = [
  ["POST", "/api/authentication/login"],
  ["POST", "/api/authentication/signout"],
  ["GET", "/api/authentication/session"]
];

describe("Authentication API", () => {
  let registeredUser;
  let firebaseOnlyUserForLogin;
  let firebaseOnlyUserWithoutLocalRecords;

  beforeAll(async () => {
    registeredUser = await registerAndLogin();
    firebaseOnlyUserForLogin = await createFirebaseOnlyUser();
    firebaseOnlyUserWithoutLocalRecords = await createFirebaseOnlyUser();
  });

  describe("POST /api/authentication/register", () => {
    test("creates a user and profile", async () => {
      const user = uniqueUser();
      const response = await registerUser(user);

      expect(response.status).toBe(201);
      expectUserProfilePayload(response.json, user);
    });

    test("lowercases returned email", async () => {
      const user = uniqueUser();
      const response = await registerUser({
        ...user,
        email: user.email.toUpperCase()
      });

      expect(response.status).toBe(201);
      expect(response.json.user.email).toBe(user.email);
    });

    test("uses the same userId in user and profile", async () => {
      const user = uniqueUser();
      const response = await registerUser(user);

      expect(response.status).toBe(201);
      expect(response.json.profile.userId).toBe(response.json.user.userId);
    });

    test("creates a user and profile without a username", async () => {
      const user = uniqueUser();
      const response = await registerUser(user, { includeUsername: false });

      expect(response.status).toBe(201);
      expect(response.json.user.email).toBe(user.email);
      expect(response.json.user.username).toEqual(expect.any(String));
      expect(response.json.profile.displayName).toBe(user.email.split("@")[0]);
    });

    test("profile defaults to coinBalance 0, highestDayUnlocked 1, and tutorialCompleted false", async () => {
      const user = uniqueUser();
      const response = await registerUser(user);

      expect(response.status).toBe(201);
      expect(response.json.profile).toEqual(
        expect.objectContaining({
          coinBalance: 0,
          highestDayUnlocked: 1,
          tutorialCompleted: false
        })
      );
    });

    test.each([
      ["email", ({ username, password }) => ({ username, password })],
      ["password", ({ email, username }) => ({ email, username })]
    ])("returns 400 when %s is missing", async (_field, makeBody) => {
      const user = uniqueUser();
      const response = await api("/api/authentication/register", {
        body: makeBody(user)
      });

      expect(response.status).toBe(400);
      expectErrorPayload(response.json);
    });

    test.each([
      ["email", { email: "" }],
      ["email whitespace", { email: "   " }],
      ["password", { password: "" }],
      ["password whitespace", { password: "   " }]
    ])("returns 400 when %s is blank", async (_caseName, override) => {
      const user = uniqueUser();
      const response = await api("/api/authentication/register", {
        body: { ...user, ...override }
      });

      expect(response.status).toBe(400);
      expectErrorPayload(response.json);
    });

    test.each([
      ["empty body", {}],
      ["invalid email", { ...uniqueUser(), email: "not-an-email" }],
      ["short password", { ...uniqueUser(), password: "123" }]
    ])("returns 400 for %s", async (_caseName, body) => {
      const response = await api("/api/authentication/register", { body });

      expect(response.status).toBe(400);
      expectErrorPayload(response.json);
    });

    test("returns 409 for exact duplicate registration", async () => {
      const user = uniqueUser();
      expect((await registerUser(user)).status).toBe(201);

      const response = await api("/api/authentication/register", {
        body: user
      });

      expect(response.status).toBe(409);
      expectErrorPayload(response.json);
    });

    test("returns 409 for duplicate email", async () => {
      const first = uniqueUser();
      const second = uniqueUser();
      expect((await registerUser(first)).status).toBe(201);

      const response = await api("/api/authentication/register", {
        body: { ...second, email: first.email }
      });

      expect(response.status).toBe(409);
      expectErrorPayload(response.json);
    });

    test("returns 409 for duplicate username", async () => {
      const first = uniqueUser();
      const second = uniqueUser();
      expect((await registerUser(first)).status).toBe(201);

      const response = await api("/api/authentication/register", {
        body: { ...second, username: first.username }
      });

      expect(response.status).toBe(409);
      expectErrorPayload(response.json);
    });
  });

  describe("protected auth endpoints", () => {
    test.each(protectedAuthEndpoints)("%s %s returns 401 without token", async (method, path) => {
      const response = await api(path, { method });

      expect(response.status).toBe(401);
      expectErrorPayload(response.json);
    });

    test.each(protectedAuthEndpoints)("%s %s returns 401 with invalid token", async (method, path) => {
      const response = await api(path, {
        method,
        token: "not-a-real-firebase-token"
      });

      expect(response.status).toBe(401);
      expectErrorPayload(response.json);
    });
  });

  describe("POST /api/authentication/login", () => {
    test("returns user/profile for registered user", async () => {
      const response = await api("/api/authentication/login", {
        method: "POST",
        token: registeredUser.token
      });

      expect(response.status).toBe(200);
      expectUserProfilePayload(response.json, registeredUser);
    });

    test("creates local records for Firebase-only user", async () => {
      const response = await api("/api/authentication/login", {
        method: "POST",
        token: firebaseOnlyUserForLogin.token
      });

      expect(response.status).toBe(200);
      expect(response.json.user).toEqual(
        expect.objectContaining({
          email: firebaseOnlyUserForLogin.email.toLowerCase(),
          userId: firebaseOnlyUserForLogin.userId,
          username: expect.any(String)
        })
      );
      expectProfilePayload(response.json.profile, {
        coinBalance: 0,
        highestDayUnlocked: 1,
        tutorialCompleted: false,
        userId: firebaseOnlyUserForLogin.userId
      });
    });
  });

  describe("GET /api/authentication/session", () => {
    test("returns user/profile for registered user", async () => {
      const response = await api("/api/authentication/session", {
        token: registeredUser.token
      });

      expect(response.status).toBe(200);
      expectUserProfilePayload(response.json, registeredUser);
    });

    test("returns same payload as login", async () => {
      const login = await api("/api/authentication/login", {
        method: "POST",
        token: registeredUser.token
      });
      const session = await api("/api/authentication/session", {
        token: registeredUser.token
      });

      expect(login.status).toBe(200);
      expect(session.status).toBe(200);
      expect(session.json).toEqual(login.json);
    });

    test("returns 404 for Firebase-only user", async () => {
      const response = await api("/api/authentication/session", {
        token: firebaseOnlyUserWithoutLocalRecords.token
      });

      expect(response.status).toBe(404);
      expectErrorPayload(response.json);
    });
  });

  describe("POST /api/authentication/signout", () => {
    test("returns 204 with no body", async () => {
      const user = await registerAndLogin();
      const response = await api("/api/authentication/signout", {
        method: "POST",
        token: user.token
      });

      expect(response.status).toBe(204);
      expect(response.text).toBe("");
    });
  });

  test("register -> login -> session -> signout succeeds", async () => {
    const user = uniqueUser();
    const register = await registerUser(user);
    expect(register.status).toBe(201);
    expectUserProfilePayload(register.json, user);

    const token = await getFirebaseIdToken(user.email, user.password);
    const login = await api("/api/authentication/login", {
      method: "POST",
      token
    });
    const session = await api("/api/authentication/session", { token });
    const signout = await api("/api/authentication/signout", {
      method: "POST",
      token
    });

    expect(login.status).toBe(200);
    expectUserProfilePayload(login.json, user);
    expect(session.status).toBe(200);
    expectUserProfilePayload(session.json, user);
    expect(signout.status).toBe(204);
    expect(signout.text).toBe("");
  });
});
