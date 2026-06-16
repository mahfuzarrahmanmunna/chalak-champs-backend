// src/worker.ts

import { httpServerHandler } from "cloudflare:node";
import { createExpressApp } from "./expressApp";

const LISTEN_PORT = 3000;
const app = createExpressApp();
app.listen(LISTEN_PORT);

export default httpServerHandler({ port: LISTEN_PORT });
