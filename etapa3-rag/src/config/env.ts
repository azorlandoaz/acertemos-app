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

export function cargarConfig(): Config {
  return {
    puerto: Number(process.env.PORT ?? 3100),
    aiProviderBaseUrl: requerida("AI_PROVIDER_BASE_URL"),
    aiProviderApiKey: requerida("AI_PROVIDER_API_KEY"),
    aiProviderModel: process.env.AI_PROVIDER_MODEL ?? "llama3",
    aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 5000),
    aiMaxReintentos: Number(process.env.AI_MAX_REINTENTOS ?? 2),
    umbralAbstencion: Number(process.env.UMBRAL_ABSTENCION ?? 0.75),
  };
}
