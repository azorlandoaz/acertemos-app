import "dotenv/config";

export interface Config {
  puerto: number;
  servicioMockUrl: string;
  servicioMockToken: string;
  aiProviderBaseUrl: string;
  aiProviderApiKey: string;
  aiProviderModel: string;
  aiTimeoutMs: number;
  aiMaxReintentos: number;
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
    puerto: Number(process.env.PORT ?? 3000),
    servicioMockUrl: requerida("SERVICIO_MOCK_URL"),
    servicioMockToken: requerida("SERVICIO_MOCK_TOKEN"),
    aiProviderBaseUrl: requerida("AI_PROVIDER_BASE_URL"),
    aiProviderApiKey: requerida("AI_PROVIDER_API_KEY"),
    aiProviderModel: process.env.AI_PROVIDER_MODEL ?? "llama3",
    aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 5000),
    aiMaxReintentos: Number(process.env.AI_MAX_REINTENTOS ?? 2),
  };
}
