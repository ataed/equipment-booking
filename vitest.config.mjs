import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
    // Rules test files all talk to one emulator and each clears Firestore in
    // beforeEach, so running them in parallel means one file wipes another's data
    // mid-test. Sequential is slower and correct.
    fileParallelism: false,
    setupFiles: ["./tests/setup-admin-env.js"],
  },
});
