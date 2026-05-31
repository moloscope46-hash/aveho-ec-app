// =============================================================
//  Vitest config — Tests unitaires des helpers Aveho
//  Alpha 0.18.0
//  Lancer : npm test
//  Mode watch : npm run test:watch
// =============================================================
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["__tests__/**/*.test.js"],
    environment: "node",
    globals: false,
  },
});
