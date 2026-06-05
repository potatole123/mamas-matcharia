import { describe, expect, test } from "vitest";
import { api, expectErrorPayload, expectGameplaySessionPayload } from "./helpers/http.js";
import { createFirebaseOnlyUser, registerAndLogin } from "./helpers/users.js";

const endpoints = [
  ["GET", "/api/session"],
  ["DELETE", "/api/session"]
];

describe("Gameplay session API", () => {
  test.each(endpoints)("%s %s returns 401 without token", async (method, path) => {
    const response = await api(path, { method });

    expect(response.status).toBe(401);
    expectErrorPayload(response.json);
  });

  test.each(endpoints)("%s %s returns 401 with invalid token", async (method, path) => {
    const response = await api(path, {
      method,
      token: "not-a-real-firebase-token"
    });

    expect(response.status).toBe(401);
    expectErrorPayload(response.json);
  });

  test.each(endpoints)("%s %s returns 404 when local profile is missing", async (method, path) => {
    const user = await createFirebaseOnlyUser();
    const response = await api(path, {
      method,
      token: user.token
    });

    expect(response.status).toBe(404);
    expectErrorPayload(response.json);
  });

  test("GET /api/session returns null when no gameplay session exists", async () => {
    const user = await registerAndLogin();
    const response = await api("/api/session", {
      token: user.token
    });

    expect(response.status).toBe(200);
    expect(response.json).toEqual({ session: null });
  });

  test("GET /api/session returns active single-player session", async () => {
    const user = await registerAndLogin();
    const created = await api("/api/game/singleplayer", {
      body: { npcSeed: 42 },
      token: user.token
    });
    expect(created.status).toBe(201);

    const response = await api("/api/session", {
      token: user.token
    });

    expect(response.status).toBe(200);
    expectGameplaySessionPayload(response.json.session, {
      activeGame: expect.objectContaining({ _id: created.json.game.gameId }),
      activeGameModel: "SinglePlayerGameState"
    });
    expect(response.json.session.profile).toEqual(
      expect.objectContaining({
        coinBalance: 0,
        displayName: user.username,
        highestDayUnlocked: 1,
        tutorialCompleted: false,
        userId: user.userId
      })
    );
  });

  test("GET /api/session returns active multiplayer session", async () => {
    const user = await registerAndLogin();
    const created = await api("/api/game/multiplayer", {
      body: { groupCode: uniqueGroupCode(), npcSeed: 42 },
      token: user.token
    });
    expect(created.status).toBe(201);

    const response = await api("/api/session", {
      token: user.token
    });

    expect(response.status).toBe(200);
    expectGameplaySessionPayload(response.json.session, {
      activeGame: expect.objectContaining({ _id: created.json.game.gameId }),
      activeGameModel: "MultiplayerGameState"
    });
  });

  test("DELETE /api/session returns 204 when no gameplay session exists", async () => {
    const user = await registerAndLogin();
    const response = await api("/api/session", {
      method: "DELETE",
      token: user.token
    });
    const after = await api("/api/session", {
      token: user.token
    });

    expect(response.status).toBe(204);
    expect(response.text).toBe("");
    expect(after.status).toBe(200);
    expect(after.json).toEqual({ session: null });
  });

  test("DELETE /api/session removes active gameplay session", async () => {
    const user = await registerAndLogin();
    const created = await api("/api/game/singleplayer", {
      body: { npcSeed: 42 },
      token: user.token
    });
    expect(created.status).toBe(201);

    const deleted = await api("/api/session", {
      method: "DELETE",
      token: user.token
    });
    const after = await api("/api/session", {
      token: user.token
    });

    expect(deleted.status).toBe(204);
    expect(deleted.text).toBe("");
    expect(after.status).toBe(200);
    expect(after.json).toEqual({ session: null });
  });

  test("DELETE /api/session removes active multiplayer gameplay session", async () => {
    const user = await registerAndLogin();
    const created = await api("/api/game/multiplayer", {
      body: { groupCode: uniqueGroupCode(), npcSeed: 42 },
      token: user.token
    });
    expect(created.status).toBe(201);

    const deleted = await api("/api/session", {
      method: "DELETE",
      token: user.token
    });
    const after = await api("/api/session", {
      token: user.token
    });

    expect(deleted.status).toBe(204);
    expect(deleted.text).toBe("");
    expect(after.status).toBe(200);
    expect(after.json).toEqual({ session: null });
  });
});

function uniqueGroupCode() {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
}
