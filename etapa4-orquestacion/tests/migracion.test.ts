import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mysql from "mysql2/promise";

let conexion: mysql.Connection;

beforeAll(async () => {
  conexion = await mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    // Nota: el default local no es "root" — ver etapa2-api/docker/.env.example
    // (MARIADB_ROOT_PASSWORD=cambia-esta-clave-root), confirmado contra el
    // contenedor mesa_ayuda_db real vía `docker inspect`.
    password: process.env.DB_ROOT_PASSWORD ?? "cambia-esta-clave-root",
    database: process.env.DB_NAME ?? "mesa_ayuda",
    multipleStatements: true,
  });
  const migracion = readFileSync(
    path.resolve(__dirname, "../../materiales/datos/migraciones/002_interacciones_ia.sql"),
    "utf-8"
  );
  await conexion.query(migracion);
});

afterAll(async () => {
  // Limpieza para que la suite sea repetible contra la DB real persistente
  // (sin este DELETE, una segunda corrida detecta 2 filas con el mismo evento_id).
  await conexion.query("DELETE FROM interacciones_ia WHERE evento_id = ?", ["evt-test-1"]);
  await conexion.end();
});

describe("migracion 002_interacciones_ia", () => {
  it("crea la tabla con las columnas esperadas", async () => {
    const [columnas] = await conexion.query<mysql.RowDataPacket[]>(
      "SHOW COLUMNS FROM interacciones_ia"
    );
    const nombres = columnas.map((c) => c.Field);
    expect(nombres).toEqual(
      expect.arrayContaining(["id_interaccion", "id_ticket", "evento_id", "paso_pipeline", "decision", "confianza", "fecha"])
    );
  });

  it("acepta insertar una interaccion referenciando un ticket real", async () => {
    await conexion.query(
      "INSERT INTO interacciones_ia (id_ticket, evento_id, paso_pipeline, decision, confianza) VALUES (?, ?, ?, ?, ?)",
      [1, "evt-test-1", "rag", "responder", 0.9]
    );
    const [filas] = await conexion.query<mysql.RowDataPacket[]>(
      "SELECT * FROM interacciones_ia WHERE evento_id = ?",
      ["evt-test-1"]
    );
    expect(filas).toHaveLength(1);
    expect(filas[0].id_ticket).toBe(1);
  });
});
