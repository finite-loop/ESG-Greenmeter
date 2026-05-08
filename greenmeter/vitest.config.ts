import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "tests/integration/**/*.test.ts", "scripts/**/*.test.ts"],
    server: {
      deps: {
        inline: ["next-auth", "@auth/core"],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "next/server": path.resolve(
        __dirname,
        "./node_modules/next/server.js"
      ),
      "next/headers": path.resolve(
        __dirname,
        "./node_modules/next/headers.js"
      ),
    },
  },
});
