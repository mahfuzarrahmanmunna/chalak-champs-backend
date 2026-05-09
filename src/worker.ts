import { httpServerHandler } from "cloudflare:node";
import dotenv from "dotenv";
import { createExpressApp } from "./expressApp";

dotenv.config();

const LISTEN_PORT = 3000;
const app = createExpressApp();
app.listen(LISTEN_PORT);

export default httpServerHandler({ port: LISTEN_PORT });
