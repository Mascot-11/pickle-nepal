/**
 * Loads `.env` for the test runner so integration tests can reach the same
 * database the app uses. Never overrides variables already present in CI.
 */
import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(process.cwd(), ".env"), quiet: true });
