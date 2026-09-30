import { createServer } from "node:http";
import { ZodError, z } from "zod";
import { InfraiRequestError, setProviderRouting } from "./provider_routing.ts";

const port = z.coerce.number().int().min(1).max(65_535).parse(process.env.PORT ?? "3000");
const apiKey = z.string().min(1, "INFRAI_API_KEY is required").parse(process.env.INFRAI_API_KEY);

function sendJson(response: import("node:http").ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

createServer(async (request, response) => {
  if (request.method !== "PUT" || request.url !== "/storefront/provider-routing") {
    sendJson(response, 404, { error: "Route not found" });
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const routing = await setProviderRouting(body, { apiKey });
    sendJson(response, 200, { status: "routing_preference_saved", routing });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      sendJson(response, 400, { error: "Invalid routing preference" });
      return;
    }
    if (error instanceof InfraiRequestError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      sendJson(response, status, { error: error.code });
      return;
    }
    sendJson(response, 502, { error: "Provider routing request failed" });
  }
}).listen(port, () => {
  console.log(`Storefront routing service listening on http://localhost:${port}`);
});
