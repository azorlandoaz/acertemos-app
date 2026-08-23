export interface DatosSolicitud {
  asunto: string;
  descripcion: string;
  area: string;
  solicitante: string;
}

export interface OpcionesCliente {
  baseUrl: string;
  token: string;
  maxReintentos: number;
}

/** Envía una solicitud a servicio_mock con Idempotency-Key y reintentos
 * con backoff ante 429/500 (mismo patrón exponencial que
 * etapa2-api/src/ia/ClasificadorService.ts, adaptado a la cabecera
 * Retry-After real que el mock entrega en 429). El mock falla a propósito
 * ~17% de las veces (12% 500 + 5% 429) - los reintentos son el mecanismo
 * real que hace confiable la integración, no un caso de borde teórico. */
export async function enviarSolicitud(
  datos: DatosSolicitud,
  claveIdempotencia: string,
  opciones: OpcionesCliente
): Promise<{ id: string; estado: string }> {
  for (let intento = 1; intento <= opciones.maxReintentos; intento++) {
    const respuesta = await fetch(`${opciones.baseUrl}/solicitudes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opciones.token}`,
        "Idempotency-Key": claveIdempotencia,
      },
      body: JSON.stringify(datos),
    });

    if (respuesta.status === 201) {
      return respuesta.json();
    }

    if (respuesta.status === 429 || respuesta.status === 500) {
      if (intento === opciones.maxReintentos) {
        throw new Error(`servicio_mock respondió ${respuesta.status} tras ${opciones.maxReintentos} intentos`);
      }
      const retryAfterHeader = respuesta.headers.get("Retry-After");
      const esperaMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : 2 ** intento * 200;
      await new Promise((resolve) => setTimeout(resolve, esperaMs));
      continue;
    }

    throw new Error(`servicio_mock respondió HTTP inesperado ${respuesta.status}`);
  }
  throw new Error("No se pudo enviar la solicitud tras agotar los reintentos");
}
