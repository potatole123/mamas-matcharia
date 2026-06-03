import { afterAll } from "vitest";
import { cleanupCreatedData } from "./helpers/users.js";

afterAll(async () => {
  await cleanupCreatedData();
});
