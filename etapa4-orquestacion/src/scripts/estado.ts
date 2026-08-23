import { listarEstados } from "../estadoSync.js";

const estados = listarEstados("data/estado_sync.json");
console.table(estados);
