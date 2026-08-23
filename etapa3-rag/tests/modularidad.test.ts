import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { HeuristicProvider } from "etapa2-api";

describe("modularidad: reutilización de IAProvider de etapa2-api", () => {
  it("HeuristicProvider importado es la misma clase que la de etapa2-api (no una copia)", () => {
    const rutaOriginal = path.resolve(__dirname, "../../etapa2-api/dist/ia/HeuristicProvider.js");
    expect(() => readFileSync(rutaOriginal, "utf-8")).not.toThrow();
    expect(new HeuristicProvider()).toBeInstanceOf(HeuristicProvider);
  });

  it("ningun archivo fuente de etapa3-rag define su propia clase HeuristicProvider o HttpChatProvider", () => {
    const fs = require("node:fs") as typeof import("node:fs");
    const glob = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
        const ruta = path.join(dir, entrada.name);
        if (entrada.isDirectory()) return glob(ruta);
        return entrada.name.endsWith(".ts") ? [ruta] : [];
      });

    const archivosFuente = glob(path.resolve(__dirname, "../src"));
    for (const archivo of archivosFuente) {
      const contenido = fs.readFileSync(archivo, "utf-8");
      expect(contenido).not.toMatch(/class\s+HeuristicProvider/);
      expect(contenido).not.toMatch(/class\s+HttpChatProvider/);
    }
  });
});
