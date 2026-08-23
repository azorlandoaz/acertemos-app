import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    clearMocks: true,
    env: {
      AI_PROVIDER_BASE_URL: "http://localhost:11434/v1",
      AI_PROVIDER_API_KEY: "clave-de-test",
      SERVICIO_MOCK_URL: "http://localhost:8080",
      SERVICIO_MOCK_TOKEN: "token-de-test",
    },
  },
});
