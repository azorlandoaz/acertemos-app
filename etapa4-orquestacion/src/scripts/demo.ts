import { ClasificadorService, HeuristicProvider } from "etapa2-api";
import { ejecutarPipeline } from "../pipeline.js";
import { marcarEstado } from "../estadoSync.js";

/** Requiere que etapa4-orquestacion/data/indice_vectorial.json exista
 * (mismo formato que etapa3-rag/data/indice_vectorial.json). responderConsulta()
 * resuelve el índice vía process.cwd(), que al correr `npm run demo` desde
 * etapa4-orquestacion/ NO coincide con etapa3-rag/ - ni `cd etapa4-orquestacion
 * && npm run demo` ni `npm run demo --workspace etapa4-orquestacion` cambian
 * esto (el flag --workspace no altera el cwd real del proceso). Antes de
 * correr esta demo: `cp etapa3-rag/data/indice_vectorial.json
 * etapa4-orquestacion/data/indice_vectorial.json` (o correr la ingesta real
 * de Etapa 3 con ese destino) y asegurar que exista un `etapa4-orquestacion/.env`
 * (aunque sea copiado de `.env.example`, ya que HeuristicProvider no usa
 * esas credenciales pero cargarConfig() las exige igual). */
const CASOS_DEMO = [
  { evento_id: "demo-1", pregunta: "¿Con cuánta anticipación debo pedir mis vacaciones?" },
  { evento_id: "demo-2", pregunta: "¿Cuál es la política de horarios de teletrabajo los viernes?" },
];

async function main(): Promise<void> {
  const clasificador = new ClasificadorService(new HeuristicProvider(), new HeuristicProvider(), 3000, 1);

  for (const caso of CASOS_DEMO) {
    const resultado = await ejecutarPipeline(caso, clasificador, 0.4);
    marcarEstado(caso.evento_id, resultado.accion === "responder" ? "enviado" : "error", "data/estado_sync.json");
    console.log(
      JSON.stringify({
        evento: "demo_pipeline",
        evento_id: resultado.evento_id,
        pregunta: caso.pregunta,
        categoria: resultado.categoria,
        accion: resultado.accion,
        respuesta: resultado.respuesta,
        citas: resultado.citas,
      })
    );
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ evento: "demo_error", mensaje: String(err) }));
  process.exit(1);
});
