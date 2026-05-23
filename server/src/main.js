import { loadConfig } from "./config.js";
import { createHttpServer } from "./framework/http.js";
import { AppKernel } from "./application/kernel.js";
import { buildRouter } from "./application/controllers.js";

const config = loadConfig();
const kernel = await AppKernel.boot(config);
const router = buildRouter(kernel);
const server = createHttpServer({ router, kernel, config });

server.listen(config.port, config.host, () => {
  console.log(`EduMind Agent running at http://${config.host}:${config.port}`);
});
