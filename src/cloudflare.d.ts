declare module "cloudflare:node" {
  /** Bridges a Node HTTP server registered with listen(port) to the Workers fetch runtime. */
  export function httpServerHandler(options: { port: number }): {
    fetch: (request: Request) => Response | Promise<Response>;
  };
}
