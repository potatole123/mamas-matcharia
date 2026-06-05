import { describe, expect, test } from "vitest";
import {
  api,
  expectErrorPayload,
  expectGameplaySessionPayload,
  expectGameSessionPayload,
  expectMultiplayerGamePayload,
  expectProfilePayload,
  expectSinglePlayerGamePayload
} from "./helpers/http.js";
import { createFirebaseOnlyUser, registerAndLogin } from "./helpers/users.js";

const gameEndpoints = [
  ["POST", "/api/game/singleplayer"],
  ["DELETE", "/api/game/singleplayer/current"],
  ["POST", "/api/game/multiplayer"],
  ["POST", "/api/game/multiplayer/join"],
  ["DELETE", "/api/game/multiplayer/current"],
  ["POST", "/api/game/day/start"],
  ["POST", "/api/game/results"]
];

const invalidNpcSeeds = [
  ["negative npcSeed", { npcSeed: -1 }],
  ["decimal npcSeed", { npcSeed: 1.5 }],
  ["string npcSeed", { npcSeed: "42" }],
  ["null npcSeed", { npcSeed: null }],
  ["negative seed alias", { seed: -1 }],
  ["decimal seed alias", { seed: 1.5 }],
  ["string seed alias", { seed: "42" }],
  ["null seed alias", { seed: null }]
];

const invalidGroupCodes = [
  ["short", "12345"],
  ["long", "1234567"],
  ["letters", "abc123"],
  ["embedded space", "12 456"],
  ["blank", ""],
  ["whitespace", "      "],
  ["number", 123456],
  ["null", null]
];

const invalidJoinBodies = [
  ["missing groupCode", {}],
  ["short groupCode", { groupCode: "12345" }],
  ["long joinCode", { joinCode: "1234567" }],
  ["letters", { groupCode: "abc123" }],
  ["embedded space", { groupCode: "12 456" }],
  ["blank", { groupCode: "" }],
  ["number", { groupCode: 123456 }],
  ["null", { groupCode: null }]
];

const invalidDayResults = [
  ["empty body", {}],
  ["unknown-only body", { ignored: true }],
  ["missing waitingScore", { dayScore: withoutField(validDayScore(), "waitingScore") }],
  ["negative waitingScore", { dayScore: { ...validDayScore(), waitingScore: -1 } }],
  ["decimal accuracyScore", { dayScore: { ...validDayScore(), accuracyScore: 1.5 } }],
  ["string measurementScore", { dayScore: { ...validDayScore(), measurementScore: "1" } }],
  ["null toppingScore", { dayScore: { ...validDayScore(), toppingScore: null } }],
  ["negative totalScore", { dayScore: { ...validDayScore(), totalScore: -1 } }],
  ["negative tipsEarned", { dayScore: { ...validDayScore(), tipsEarned: -1 } }],
  ["string tipsEarned", { dayScore: { ...validDayScore(), tipsEarned: "5" } }]
];

describe("Game API", () => {
  test.each(gameEndpoints)("%s %s returns 401 without token", async (method, path) => {
    const response = await api(path, { method });

    expect(response.status).toBe(401);
    expectErrorPayload(response.json);
  });

  test.each(gameEndpoints)("%s %s returns 401 with invalid token", async (method, path) => {
    const response = await api(path, {
      method,
      token: "not-a-real-firebase-token"
    });

    expect(response.status).toBe(401);
    expectErrorPayload(response.json);
  });

  describe("POST /api/game/singleplayer", () => {
    test("creates a single-player game and gameplay session", async () => {
      const user = await registerAndLogin();
      const response = await api("/api/game/singleplayer", {
        body: { npcSeed: 42 },
        token: user.token
      });

      expect(response.status).toBe(201);
      expectSinglePlayerGamePayload(response.json.game, {
        npcSeed: 42,
        playerId: user.userId
      });
      expectGameSessionPayload(response.json.session, {
        activeGame: response.json.game.gameId,
        activeGameModel: "SinglePlayerGameState",
        sessionId: response.json.game.session
      });
    });

    test("accepts seed as an alias for npcSeed", async () => {
      const user = await registerAndLogin();
      const response = await api("/api/game/singleplayer", {
        body: { seed: 7 },
        token: user.token
      });

      expect(response.status).toBe(201);
      expectSinglePlayerGamePayload(response.json.game, {
        npcSeed: 7,
        playerId: user.userId
      });
    });

    test("allows npcSeed to be omitted", async () => {
      const user = await registerAndLogin();
      const response = await api("/api/game/singleplayer", {
        body: {},
        token: user.token
      });

      expect(response.status).toBe(201);
      expectSinglePlayerGamePayload(response.json.game, {
        playerId: user.userId
      });
    });

    test.each(invalidNpcSeeds)("returns 400 for %s", async (_caseName, body) => {
      const user = await registerAndLogin();
      const response = await api("/api/game/singleplayer", {
        body,
        token: user.token
      });

      expect(response.status).toBe(400);
      expectErrorPayload(response.json);
    });

    test("returns 404 when the local profile is missing", async () => {
      const user = await createFirebaseOnlyUser();
      const response = await api("/api/game/singleplayer", {
        body: { npcSeed: 42 },
        token: user.token
      });

      expect(response.status).toBe(404);
      expectErrorPayload(response.json);
    });

    test("returns 409 when an active game session already exists", async () => {
      const user = await registerAndLogin();
      const created = await api("/api/game/singleplayer", {
        body: { npcSeed: 1 },
        token: user.token
      });
      expect(created.status).toBe(201);

      const response = await api("/api/game/singleplayer", {
        body: { npcSeed: 2 },
        token: user.token
      });

      expect(response.status).toBe(409);
      expectErrorPayload(response.json);
    });
  });

  describe("DELETE /api/game/singleplayer/current", () => {
    test("deletes the current single-player game", async () => {
      const user = await registerAndLogin();
      const created = await api("/api/game/singleplayer", {
        body: { npcSeed: 5 },
        token: user.token
      });
      expect(created.status).toBe(201);

      const response = await api("/api/game/singleplayer/current", {
        method: "DELETE",
        token: user.token
      });
      const session = await api("/api/session", {
        token: user.token
      });

      expect(response.status).toBe(204);
      expect(response.text).toBe("");
      expect(session.status).toBe(200);
      expect(session.json).toEqual({ session: null });
    });

    test("returns 204 when no current single-player game exists", async () => {
      const user = await registerAndLogin();
      const response = await api("/api/game/singleplayer/current", {
        method: "DELETE",
        token: user.token
      });

      expect(response.status).toBe(204);
      expect(response.text).toBe("");
    });

    test("returns 204 when the current game is multiplayer", async () => {
      const user = await registerAndLogin();
      const created = await api("/api/game/multiplayer", {
        body: { groupCode: uniqueGroupCode() },
        token: user.token
      });
      expect(created.status).toBe(201);

      const response = await api("/api/game/singleplayer/current", {
        method: "DELETE",
        token: user.token
      });

      expect(response.status).toBe(204);
      expect(response.text).toBe("");
    });
  });

  describe("POST /api/game/multiplayer", () => {
    test("creates a multiplayer game with a supplied groupCode", async () => {
      const user = await registerAndLogin();
      const code = uniqueGroupCode();
      const response = await api("/api/game/multiplayer", {
        body: { groupCode: code, npcSeed: 42 },
        token: user.token
      });

      expect(response.status).toBe(201);
      expectMultiplayerGamePayload(response.json.game, {
        creatorId: user.userId,
        groupCode: code,
        npcSeed: 42,
        playerIds: [user.userId]
      });
      expectGameSessionPayload(response.json.session, {
        activeGame: response.json.game.gameId,
        activeGameModel: "MultiplayerGameState",
        sessionId: response.json.game.session
      });
    });

    test("generates a six-digit groupCode when omitted", async () => {
      const user = await registerAndLogin();
      const response = await api("/api/game/multiplayer", {
        body: { npcSeed: 9 },
        token: user.token
      });

      expect(response.status).toBe(201);
      expectMultiplayerGamePayload(response.json.game, {
        creatorId: user.userId,
        npcSeed: 9,
        playerIds: [user.userId]
      });
      expect(response.json.game.groupCode).toMatch(/^\d{6}$/);
    });

    test("accepts joinCode and seed aliases", async () => {
      const user = await registerAndLogin();
      const code = uniqueGroupCode();
      const response = await api("/api/game/multiplayer", {
        body: { joinCode: code, seed: 12 },
        token: user.token
      });

      expect(response.status).toBe(201);
      expectMultiplayerGamePayload(response.json.game, {
        groupCode: code,
        npcSeed: 12
      });
    });

    test.each(invalidGroupCodes)("returns 400 for %s groupCode", async (_caseName, groupCode) => {
      const user = await registerAndLogin();
      const response = await api("/api/game/multiplayer", {
        body: { groupCode },
        token: user.token
      });

      expect(response.status).toBe(400);
      expectErrorPayload(response.json);
    });

    test.each(invalidGroupCodes)("returns 400 for %s joinCode alias", async (_caseName, joinCode) => {
      const user = await registerAndLogin();
      const response = await api("/api/game/multiplayer", {
        body: { joinCode },
        token: user.token
      });

      expect(response.status).toBe(400);
      expectErrorPayload(response.json);
    });

    test.each(invalidNpcSeeds)("returns 400 for %s", async (_caseName, body) => {
      const user = await registerAndLogin();
      const response = await api("/api/game/multiplayer", {
        body,
        token: user.token
      });

      expect(response.status).toBe(400);
      expectErrorPayload(response.json);
    });

    test("returns 404 when the local profile is missing", async () => {
      const user = await createFirebaseOnlyUser();
      const response = await api("/api/game/multiplayer", {
        body: { groupCode: uniqueGroupCode() },
        token: user.token
      });

      expect(response.status).toBe(404);
      expectErrorPayload(response.json);
    });

    test("returns 409 for an already-used groupCode", async () => {
      const first = await registerAndLogin();
      const second = await registerAndLogin();
      const code = uniqueGroupCode();
      const created = await api("/api/game/multiplayer", {
        body: { groupCode: code },
        token: first.token
      });
      expect(created.status).toBe(201);

      const response = await api("/api/game/multiplayer", {
        body: { groupCode: code },
        token: second.token
      });

      expect(response.status).toBe(409);
      expectErrorPayload(response.json);
    });

    test("replaces an active single-player session", async () => {
      const user = await registerAndLogin();
      const created = await api("/api/game/singleplayer", {
        body: { npcSeed: 3 },
        token: user.token
      });
      expect(created.status).toBe(201);
      const code = uniqueGroupCode();

      const response = await api("/api/game/multiplayer", {
        body: { groupCode: code },
        token: user.token
      });
      const session = await api("/api/session", {
        token: user.token
      });

      expect(response.status).toBe(201);
      expectMultiplayerGamePayload(response.json.game, {
        creatorId: user.userId,
        groupCode: code,
        playerIds: [user.userId]
      });
      expect(session.status).toBe(200);
      expectGameplaySessionPayload(session.json.session, {
        activeGameModel: "MultiplayerGameState"
      });
    });
  });

  describe("POST /api/game/multiplayer/join", () => {
    test("joins a multiplayer game by groupCode", async () => {
      const creator = await registerAndLogin();
      const joiner = await registerAndLogin();
      const code = uniqueGroupCode();
      const created = await api("/api/game/multiplayer", {
        body: { groupCode: code, npcSeed: 42 },
        token: creator.token
      });
      expect(created.status).toBe(201);

      const response = await api("/api/game/multiplayer/join", {
        body: { groupCode: code },
        token: joiner.token
      });

      expect(response.status).toBe(200);
      expectMultiplayerGamePayload(response.json.game, {
        creatorId: creator.userId,
        groupCode: code,
        npcSeed: 42
      });
      expect(response.json.game.playerIds).toEqual(expect.arrayContaining([creator.userId, joiner.userId]));
      expect(response.json.game.playerIds).toHaveLength(2);
      expectGameSessionPayload(response.json.session, {
        activeGame: response.json.game.gameId,
        activeGameModel: "MultiplayerGameState"
      });
    });

    test("accepts joinCode as an alias for groupCode", async () => {
      const creator = await registerAndLogin();
      const joiner = await registerAndLogin();
      const code = uniqueGroupCode();
      const created = await api("/api/game/multiplayer", {
        body: { groupCode: code },
        token: creator.token
      });
      expect(created.status).toBe(201);

      const response = await api("/api/game/multiplayer/join", {
        body: { joinCode: code },
        token: joiner.token
      });

      expect(response.status).toBe(200);
      expect(response.json.game.groupCode).toBe(code);
      expect(response.json.game.playerIds).toEqual(expect.arrayContaining([creator.userId, joiner.userId]));
    });

    test.each(invalidJoinBodies)("returns 400 for %s", async (_caseName, body) => {
      const user = await registerAndLogin();
      const response = await api("/api/game/multiplayer/join", {
        body,
        token: user.token
      });

      expect(response.status).toBe(400);
      expectErrorPayload(response.json);
    });

    test("returns 404 when groupCode does not exist", async () => {
      const user = await registerAndLogin();
      const response = await api("/api/game/multiplayer/join", {
        body: { groupCode: uniqueGroupCode() },
        token: user.token
      });

      expect(response.status).toBe(404);
      expectErrorPayload(response.json);
    });

    test("returns 404 when the local profile is missing", async () => {
      const creator = await registerAndLogin();
      const firebaseOnly = await createFirebaseOnlyUser();
      const code = uniqueGroupCode();
      const created = await api("/api/game/multiplayer", {
        body: { groupCode: code },
        token: creator.token
      });
      expect(created.status).toBe(201);

      const response = await api("/api/game/multiplayer/join", {
        body: { groupCode: code },
        token: firebaseOnly.token
      });

      expect(response.status).toBe(404);
      expectErrorPayload(response.json);
    });

    test("replaces joining user's active single-player game", async () => {
      const creator = await registerAndLogin();
      const joiner = await registerAndLogin();
      const code = uniqueGroupCode();
      const multiplayer = await api("/api/game/multiplayer", {
        body: { groupCode: code },
        token: creator.token
      });
      expect(multiplayer.status).toBe(201);
      const singlePlayer = await api("/api/game/singleplayer", {
        body: { npcSeed: 3 },
        token: joiner.token
      });
      expect(singlePlayer.status).toBe(201);

      const response = await api("/api/game/multiplayer/join", {
        body: { groupCode: code },
        token: joiner.token
      });

      expect(response.status).toBe(200);
      expect(response.json.game.playerIds).toEqual(expect.arrayContaining([creator.userId, joiner.userId]));
      expectGameSessionPayload(response.json.session, {
        activeGame: response.json.game.gameId,
        activeGameModel: "MultiplayerGameState"
      });
    });
  });

  describe("DELETE /api/game/multiplayer/current", () => {
    test("creator can delete the current multiplayer game", async () => {
      const creator = await registerAndLogin();
      const joiner = await registerAndLogin();
      const code = uniqueGroupCode();
      const created = await api("/api/game/multiplayer", {
        body: { groupCode: code },
        token: creator.token
      });
      expect(created.status).toBe(201);
      const joined = await api("/api/game/multiplayer/join", {
        body: { groupCode: code },
        token: joiner.token
      });
      expect(joined.status).toBe(200);

      const response = await api("/api/game/multiplayer/current", {
        body: { groupCode: code },
        method: "DELETE",
        token: creator.token
      });
      const joinDeletedGame = await api("/api/game/multiplayer/join", {
        body: { groupCode: code },
        token: joiner.token
      });

      expect(response.status).toBe(204);
      expect(response.text).toBe("");
      expect(joinDeletedGame.status).toBe(404);
      expectErrorPayload(joinDeletedGame.json);
    });

    test("accepts joinCode as an alias for groupCode", async () => {
      const creator = await registerAndLogin();
      const code = uniqueGroupCode();
      const created = await api("/api/game/multiplayer", {
        body: { groupCode: code },
        token: creator.token
      });
      expect(created.status).toBe(201);

      const response = await api("/api/game/multiplayer/current", {
        body: { joinCode: code },
        method: "DELETE",
        token: creator.token
      });

      expect(response.status).toBe(204);
      expect(response.text).toBe("");
    });

    test("allows groupCode to be omitted for the creator's current multiplayer game", async () => {
      const creator = await registerAndLogin();
      const created = await api("/api/game/multiplayer", {
        body: { groupCode: uniqueGroupCode() },
        token: creator.token
      });
      expect(created.status).toBe(201);

      const response = await api("/api/game/multiplayer/current", {
        method: "DELETE",
        token: creator.token
      });

      expect(response.status).toBe(204);
      expect(response.text).toBe("");
    });

    test.each(invalidGroupCodes)("returns 400 for %s groupCode", async (_caseName, groupCode) => {
      const user = await registerAndLogin();
      const response = await api("/api/game/multiplayer/current", {
        body: { groupCode },
        method: "DELETE",
        token: user.token
      });

      expect(response.status).toBe(400);
      expectErrorPayload(response.json);
    });

    test.each(invalidGroupCodes)("returns 400 for %s joinCode alias", async (_caseName, joinCode) => {
      const user = await registerAndLogin();
      const response = await api("/api/game/multiplayer/current", {
        body: { joinCode },
        method: "DELETE",
        token: user.token
      });

      expect(response.status).toBe(400);
      expectErrorPayload(response.json);
    });

    test("returns 204 when no creator-owned multiplayer game exists", async () => {
      const user = await registerAndLogin();
      const response = await api("/api/game/multiplayer/current", {
        body: { groupCode: uniqueGroupCode() },
        method: "DELETE",
        token: user.token
      });

      expect(response.status).toBe(204);
      expect(response.text).toBe("");
    });

    test("returns 204 when the current game is single-player", async () => {
      const user = await registerAndLogin();
      const created = await api("/api/game/singleplayer", {
        body: { npcSeed: 42 },
        token: user.token
      });
      expect(created.status).toBe(201);

      const response = await api("/api/game/multiplayer/current", {
        method: "DELETE",
        token: user.token
      });

      expect(response.status).toBe(204);
      expect(response.text).toBe("");
    });

    test("returns 204 when a non-creator tries to delete", async () => {
      const creator = await registerAndLogin();
      const joiner = await registerAndLogin();
      const code = uniqueGroupCode();
      const created = await api("/api/game/multiplayer", {
        body: { groupCode: code },
        token: creator.token
      });
      expect(created.status).toBe(201);

      const response = await api("/api/game/multiplayer/current", {
        body: { groupCode: code },
        method: "DELETE",
        token: joiner.token
      });

      expect(response.status).toBe(204);
      expect(response.text).toBe("");
    });
  });

  describe("POST /api/game/results", () => {
    test("submits a passing day score and updates profile progression", async () => {
      const user = await registerAndLogin();
      const created = await api("/api/game/singleplayer", {
        body: { npcSeed: 42 },
        token: user.token
      });
      expect(created.status).toBe(201);
      const started = await api("/api/game/day/start", {
        body: { level: 1 },
        token: user.token
      });
      expect(started.status).toBe(200);

      const dayScore = {
        ...validDayScore(),
        tipsEarned: 20,
        totalScore: started.json.day.targetScore
      };
      const response = await api("/api/game/results", {
        body: { dayScore },
        token: user.token
      });

      expect(response.status).toBe(200);
      expect(response.json).toEqual(
        expect.objectContaining({
          dayScore,
          level: 1,
          passed: true,
          targetScore: started.json.day.targetScore,
          unlockedNextLevel: true
        })
      );
      expectProfilePayload(response.json.profile, {
        coinBalance: 20,
        highestDayUnlocked: 2,
        userId: user.userId
      });
    });

    test("accepts day score fields at the top level", async () => {
      const user = await registerAndLogin();
      const created = await api("/api/game/singleplayer", {
        body: { npcSeed: 42 },
        token: user.token
      });
      expect(created.status).toBe(201);
      const started = await api("/api/game/day/start", {
        body: { level: 1 },
        token: user.token
      });
      expect(started.status).toBe(200);

      const dayScore = {
        ...validDayScore(),
        totalScore: Math.max(0, started.json.day.targetScore - 1)
      };
      const response = await api("/api/game/results", {
        body: dayScore,
        token: user.token
      });

      expect(response.status).toBe(200);
      expect(response.json).toEqual(
        expect.objectContaining({
          dayScore,
          level: 1,
          passed: false,
          unlockedNextLevel: false
        })
      );
      expectProfilePayload(response.json.profile, {
        coinBalance: dayScore.tipsEarned,
        highestDayUnlocked: 1,
        userId: user.userId
      });
    });

    test("returns 404 when the local profile is missing", async () => {
      const user = await createFirebaseOnlyUser();
      const response = await api("/api/game/results", {
        body: { dayScore: validDayScore() },
        token: user.token
      });

      expect(response.status).toBe(404);
      expectErrorPayload(response.json);
    });

    test("returns 409 when the user has no active game", async () => {
      const user = await registerAndLogin();
      const response = await api("/api/game/results", {
        body: { dayScore: validDayScore() },
        token: user.token
      });

      expect(response.status).toBe(409);
      expectErrorPayload(response.json);
    });

    test("returns 409 when the user has no active level", async () => {
      const user = await registerAndLogin();
      const created = await api("/api/game/singleplayer", {
        body: { npcSeed: 42 },
        token: user.token
      });
      expect(created.status).toBe(201);

      const response = await api("/api/game/results", {
        body: { dayScore: validDayScore() },
        token: user.token
      });

      expect(response.status).toBe(409);
      expectErrorPayload(response.json);
    });

    test.each(invalidDayResults)("returns 400 for %s", async (_caseName, body) => {
      const user = await registerAndLogin();
      const response = await api("/api/game/results", {
        body,
        token: user.token
      });

      expect(response.status).toBe(400);
      expectErrorPayload(response.json);
    });
  });
});

function uniqueGroupCode() {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
}

function validDayScore() {
  return {
    accuracyScore: 10,
    measurementScore: 10,
    tipsEarned: 5,
    toppingScore: 10,
    totalScore: 40,
    waitingScore: 10
  };
}

function withoutField(object, fieldName) {
  const copy = { ...object };
  delete copy[fieldName];
  return copy;
}
