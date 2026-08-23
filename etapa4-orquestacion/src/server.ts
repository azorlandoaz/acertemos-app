import { crearApp } from "./app.js";
import { cargarConfig } from "./config/env.js";

const config = cargarConfig();
const app = crearApp();
app.listen(config.puerto, () => {
  console.log(JSON.stringify({ evento: "servidor_iniciado", puerto: config.puerto }));
});
