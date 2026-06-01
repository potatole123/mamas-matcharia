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
