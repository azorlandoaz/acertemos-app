const CATEGORIAS = [
  "Vacaciones",
  "Hardware",
  "Software",
  "Gestión de accesos",
  "Viáticos",
  "Conectividad",
  "Compras",
  "Incidentes",
  "Sin clasificar",
] as const;

const EJEMPLOS = [
  { texto: "Necesito solicitar mis vacaciones de diciembre", categoria: "Vacaciones" },
  { texto: "El portátil no enciende desde ayer", categoria: "Hardware" },
  { texto: "Se bloqueó mi usuario tras varios intentos", categoria: "Gestión de accesos" },
  { texto: "Cuál es el monto autorizado para hospedaje", categoria: "Viáticos" },
];

/** Prompt versionado (v1) de clasificación. Few-shot con ejemplos reales
 * del histórico de tickets; exige salida JSON estricta para que
 * HttpChatProvider.clasificar pueda parsearla sin post-procesamiento. */
export function promptClasificacion(texto: string): string {
  const ejemplos = EJEMPLOS.map((e) => `Texto: "${e.texto}"\nCategoría: ${e.categoria}`).join("\n\n");
  return [
    `Clasifica la siguiente solicitud interna en una de estas categorías: ${CATEGORIAS.join(", ")}.`,
    `Responde ÚNICAMENTE con JSON válido de la forma {"categoria": "...", "confianza": 0.0-1.0}, sin texto adicional.`,
    ``,
    `Ejemplos:`,
    ejemplos,
    ``,
    `Texto a clasificar: "${texto}"`,
  ].join("\n");
}
