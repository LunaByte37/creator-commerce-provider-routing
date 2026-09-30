import assert from "node:assert/strict";
import test from "node:test";
import { setProviderRouting } from "../src/provider_routing.ts";

test("excludes the selected vendor only for digital asset delivery", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const fakeFetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    requests.push({ url: String(url), init });
    return new Response(JSON.stringify({
      ok: true,
      data: { capability: "digital_asset_delivery", exclude: "vendor-checkout-default" },
      metadata: {}
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  await setProviderRouting(
    { capability: "digital_asset_delivery", exclude: "vendor-checkout-default" },
    { apiKey: "test-key", fetchImpl: fakeFetch }
  );

  assert.equal(requests.length, 1);
  assert.equal(requests[0].init?.method, "PUT");
  assert.deepEqual(JSON.parse(String(requests[0].init?.body)), {
    capability: "digital_asset_delivery",
    exclude: "vendor-checkout-default"
  });
});
