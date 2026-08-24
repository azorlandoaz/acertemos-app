import request from "supertest";
import { describe, expect, it } from "vitest";
import { crearApp } from "../src/app.js";

describe("GET /docs", () => {
  it("sirve la interfaz de Swagger UI (HTML), no el YAML crudo", async () => {
    const res = await request(crearApp()).get("/docs/");
    expect(res.status).toBe(200);
    expect(res.type).toContain("html");
    expect(res.text).toContain("swagger-ui");
  });
});
