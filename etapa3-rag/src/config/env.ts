import "dotenv/config";

export interface Config {
  puerto: number;
  aiProviderBaseUrl: string;
  aiProviderApiKey: string;
  aiProviderModel: string;
  aiTimeoutMs: number;
  aiMaxReintentos: number;
  umbralAbstencion: number;
}

function requerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor || valor.trim() === "") {
    throw new Error(`Falta la variable de entorno requerida: ${nombre}`);
  }
  return valor;
}

function numerica(nombre: string, porDefecto: number): number {
  const valor = process.env[nombre];
  if (valor === undefined || valor.trim() === "") return porDefecto;
  const parseado = Number(valor);
  if (Number.isNaN(parseado)) {
    throw new Error(`La variable de entorno ${nombre} debe ser numérica, recibido: "${valor}"`);
  }
  return parseado;
}

export function cargarConfig(): Config {
  return {
    puerto: numerica("PORT", 3100),
    aiProviderBaseUrl: requerida("AI_PROVIDER_BASE_URL"),
    aiProviderApiKey: requerida("AI_PROVIDER_API_KEY"),
    aiProviderModel: process.env.AI_PROVIDER_MODEL ?? "llama3",
    aiTimeoutMs: numerica("AI_TIMEOUT_MS", 5000),
    aiMaxReintentos: numerica("AI_MAX_REINTENTOS", 2),
    umbralAbstencion: numerica("UMBRAL_ABSTENCION", 0.75),
  };
}
