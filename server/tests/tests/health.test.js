import { describe, expect, test } from "vitest";
import { api } from "./helpers/http.js";

describe("GET /", () => {
  test("returns API running message", async () => {
    const response = await api("/");

    expect(response.status).toBe(200);
    expect(response.json).toEqual({ message: "API is running" });
  });
});
