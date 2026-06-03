import { expect } from "vitest";
import { apiBaseUrl } from "./env.js";

export async function api(path, options = {}) {
  const {
    body,
    headers = {},
    method = body === undefined ? "GET" : "POST",
    token
  } = options;

  const requestHeaders = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...headers
  };

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${apiBaseUrl()}${path}`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: requestHeaders,
    method
  });

  const text = await response.text();
  const json = text ? JSON.parse(text) : null;

  return {
    headers: response.headers,
    json,
    ok: response.ok,
    status: response.status,
    text
  };
}

export function expectErrorPayload(json) {
  expect(json).toEqual(
    expect.objectContaining({
      error: expect.any(String)
    })
  );
  expect(json.error.length).toBeGreaterThan(0);
}

export function expectUserProfilePayload(json, user) {
  expectUserPayload(json.user, user);
  expectProfilePayload(json.profile, {
    coinBalance: 0,
    displayName: user.username,
    highestDayUnlocked: 1,
    tutorialCompleted: false,
    userId: json.user.userId
  });
}

export function expectUserPayload(json, user) {
  expect(json).toEqual(
    expect.objectContaining({
      email: user.email.toLowerCase(),
      userId: expect.any(String),
      username: user.username
    })
  );
}

export function expectProfilePayload(json, expected = {}) {
  expect(json).toEqual(
    expect.objectContaining({
      coinBalance: expect.any(Number),
      displayName: expect.any(String),
      highestDayUnlocked: expect.any(Number),
      tutorialCompleted: expect.any(Boolean),
      userId: expect.any(String),
      ...expected
    })
  );

  if (json.createdAt !== undefined) {
    expectIsoTimestamp(json.createdAt);
  }
  if (json.updatedAt !== undefined) {
    expectIsoTimestamp(json.updatedAt);
  }
}

export function expectIsoTimestamp(value) {
  expect(value).toEqual(expect.any(String));
  expect(Number.isNaN(Date.parse(value))).toBe(false);
}
