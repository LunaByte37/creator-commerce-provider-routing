import { z } from "zod";
import { setProviderRouting } from "./provider_routing.ts";

const environment = z.object({
  INFRAI_API_KEY: z.string().min(1),
  EXCLUDED_PROVIDER: z.string().min(1)
}).parse(process.env);

const result = await setProviderRouting(
  {
    capability: "digital_asset_delivery",
    exclude: environment.EXCLUDED_PROVIDER
  },
  { apiKey: environment.INFRAI_API_KEY }
);

console.log(JSON.stringify({ status: "routing_preference_saved", routing: result }, null, 2));
