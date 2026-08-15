import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({test:{environment:"jsdom"},resolve:{alias:{"@":path.resolve(import.meta.dirname,"src")}}});
