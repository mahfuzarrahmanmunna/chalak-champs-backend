"use strict";
// src/worker.ts
Object.defineProperty(exports, "__esModule", { value: true });
const cloudflare_node_1 = require("cloudflare:node");
const expressApp_1 = require("./expressApp");
const LISTEN_PORT = 3000;
const app = (0, expressApp_1.createExpressApp)();
app.listen(LISTEN_PORT);
exports.default = (0, cloudflare_node_1.httpServerHandler)({ port: LISTEN_PORT });
