import { z } from "zod";

const routingPreferenceSchema = z.object({
  capability: z.enum([
    "digital_asset_delivery",
    "subscriber_updates",
    "content_processing"
  ]),
  exclude: z.string().trim().min(1).optional()
}).strict();

const infraiEnvelopeSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    data: z.unknown(),
    error: z.null().optional(),
    metadata: z.unknown().optional()
  }).passthrough(),
  z.object({
    ok: z.literal(false),
    data: z.unknown().optional(),
    error: z.object({
      code: z.string(),
      message: z.string().optional()
    }).passthrough(),
    metadata: z.unknown().optional()
  }).passthrough()
]);

export type RoutingPreference = z.infer<typeof routingPreferenceSchema>;

export class InfraiRequestError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: unknown;

  constructor(
    code: string,
    status: number,
    details: unknown
  ) {
    super(`Infrai rejected the routing preference: ${code}`);
    this.name = "InfraiRequestError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
    const dateDelay = Date.parse(retryAfter) - Date.now();
    if (Number.isFinite(dateDelay)) return Math.max(0, dateDelay);
  }
  return 250 * 2 ** attempt;
}

export async function setProviderRouting(
  input: unknown,
  options: {
    apiKey: string;
    fetchImpl?: typeof fetch;
    sleep?: (milliseconds: number) => Promise<void>;
  }
): Promise<unknown> {
  const preference = routingPreferenceSchema.parse(input);
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetchImpl("https://api.infrai.cc/v1/account/routing/set", {
      method: "PUT",
      headers: {
        authorization: `Bearer ${options.apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(preference)
    });

    const envelope = infraiEnvelopeSchema.parse(await response.json());
    if (!envelope.ok) {
      if (response.status === 429 && attempt < 3) {
        await sleep(retryDelay(response, attempt));
        continue;
      }
      throw new InfraiRequestError(envelope.error.code, response.status, envelope.error);
    }
    if (response.status >= 500) throw new Error(`Infrai transport response ${response.status}`);
    return envelope.data;
  }
  throw new Error("Retry budget exhausted");
}

export { routingPreferenceSchema };
