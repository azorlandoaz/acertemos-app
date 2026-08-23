import type { IAProvider, ResultadoClasificacion } from "./IAProvider.js";

interface OpcionesHttpChatProvider {
  baseUrl: string;
  apiKey: string;
  modelo: string;
  timeoutMs: number;
}

/** Adapter HTTP genérico compatible con endpoints estilo
 * "POST {baseUrl}/chat/completions" (OpenAI-compatible: la mayoría de
 * proveedores y servidores locales como Ollama/LM Studio lo soportan).
 * Cambiar de proveedor es cuestión de variables de entorno, no de código. */
export class HttpChatProvider implements IAProvider {
  constructor(private readonly opciones: OpcionesHttpChatProvider) {}

  private async completar(prompt: string): Promise<string> {
    const controlador = new AbortController();
    const timeout = setTimeout(() => controlador.abort(), this.opciones.timeoutMs);
    try {
      const respuesta = await fetch(`${this.opciones.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.opciones.apiKey}`,
        },
        body: JSON.stringify({
          model: this.opciones.modelo,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: controlador.signal,
      });
      if (!respuesta.ok) {
        throw new Error(`Proveedor de IA respondió HTTP ${respuesta.status}`);
      }
      const cuerpo = (await respuesta.json()) as {
        choices: { message: { content: string } }[];
      };
      return cuerpo.choices[0].message.content;
    } finally {
      clearTimeout(timeout);
    }
  }

  async clasificar(texto: string): Promise<ResultadoClasificacion> {
    const { promptClasificacion } = await import("./prompts.js");
    const salida = await this.completar(promptClasificacion(texto));
    const parseado = JSON.parse(salida) as ResultadoClasificacion;
    return parseado;
  }

  async generarRespuesta(prompt: string, contexto: string[]): Promise<string> {
    const promptCompleto = contexto.length > 0 ? `${contexto.join("\n")}\n\n${prompt}` : prompt;
    return this.completar(promptCompleto);
  }

  async embeber(textos: string[]): Promise<number[][]> {
    const respuesta = await fetch(`${this.opciones.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.opciones.apiKey}`,
      },
      body: JSON.stringify({ model: this.opciones.modelo, input: textos }),
    });
    const cuerpo = (await respuesta.json()) as { data: { embedding: number[] }[] };
    return cuerpo.data.map((d) => d.embedding);
  }
}
