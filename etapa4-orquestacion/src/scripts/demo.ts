import { ClasificadorService, HeuristicProvider } from "etapa2-api";
import { ejecutarPipeline } from "../pipeline.js";
import { marcarEstado } from "../estadoSync.js";

/** responderConsulta() (etapa3-rag) resuelve el índice vectorial de forma
 * relativa a su propio módulo (ver etapa3-rag/src/servicioConsultas.ts),
 * no por cwd - así que esta demo funciona sin ningún paso manual de copia,
 * siempre que `npm run ingestar --workspace etapa3-rag` se haya corrido
 * al menos una vez para generar etapa3-rag/data/indice_vectorial.json.
 * Requiere además un etapa4-orquestacion/.env presente (aunque sea copiado
 * de .env.example) porque cargarConfig() exige esas variables al
 * arrancar, aunque HeuristicProvider no las use en la práctica. */
const CASOS_DEMO = [
  { evento_id: "demo-1", pregunta: "¿Con cuánta anticipación debo pedir mis vacaciones?" },
  { evento_id: "demo-2", pregunta: "¿Cuál es la política de horarios de teletrabajo los viernes?" },
];

async function main(): Promise<void> {
  const clasificador = new ClasificadorService(new HeuristicProvider(), new HeuristicProvider(), 3000, 1);

  for (const caso of CASOS_DEMO) {
    const resultado = await ejecutarPipeline(caso, clasificador, 0.4);
    marcarEstado(caso.evento_id, "enviado", "data/estado_sync.json");
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
