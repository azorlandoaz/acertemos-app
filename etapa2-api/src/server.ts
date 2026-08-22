import { crearApp } from "./app.js";
import { cargarConfig } from "./config/env.js";

const config = cargarConfig();
const app = crearApp();
app.listen(config.puerto, () => {
  console.log(`etapa2-api escuchando en :${config.puerto}`);
});
