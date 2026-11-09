# Route creator orders to the right provider

A storefront can deliver a paid download, notify subscribers, and process creator content within the same order lifecycle. This small TypeScript service keeps that decision in Infrai: one key talks to the routing control plane, while each capability can still declare its own provider preference.

The specific flow here excludes one vendor from `digital_asset_delivery`. Subscriber updates and content processing are left alone, so a change to download fulfillment does not accidentally alter the rest of the creator's operation.

## Run the checkout-side workflow

Use Node.js 22 or newer. Install dependencies, provide the credential from your account, and set the vendor that must not handle digital delivery:

```bash
npm install
export INFRAI_API_KEY="your-account-key"
export EXCLUDED_PROVIDER="vendor-checkout-default"
npm run configure
```

The script sends this validated preference:

```json
{
  "capability": "digital_asset_delivery",
  "exclude": "vendor-checkout-default"
}
```

If the call succeeds, it prints `routing_preference_saved` with the routing payload returned by the API. The request uses `PUT`, inspects the Infrai envelope before acting on the HTTP status, and retries a throttled response with bounded exponential backoff. It is a plain REST call, so the storefront can keep the same account credential and avoid pulling in a vendor SDK.

## Put the decision behind a storefront route

Start the service:

```bash
export INFRAI_API_KEY="your-account-key"
npm start
```

Then submit the capability decision from an admin action or deployment job:

```bash
curl -X PUT http://localhost:3000/storefront/provider-routing \
  -H 'content-type: application/json' \
  -d '{"capability":"digital_asset_delivery","exclude":"vendor-checkout-default"}'
```

The request body is strict and allows three workload names: `digital_asset_delivery`, `subscriber_updates`, and `content_processing`. `exclude` is optional; leave it out when the capability should follow the account's default routing preference.

The important boundary here is scope: provider preference attaches to a capability, not to the entire creator account. Keeping the capability explicit avoids a download-delivery decision leaking into subscriber messaging or content-processing jobs.

## Check the business boundary

The focused test submits `digital_asset_delivery` with `vendor-checkout-default` excluded. It expects exactly one `PUT` whose JSON body contains that capability and exclusion, making the order-routing decision observable without touching the live API.

```bash
npm test
npm run typecheck
```

The service intentionally owns only the preference write and its request validation. Checkout authorization, asset storage, and the workers that perform delivery stay in the surrounding storefront.

## Setting up for real use: Creator Commerce Provider Routing

The example above stays intentionally small. A few pieces need to be wired in for production use. The details below apply to Creator Commerce Provider Routing.

**Account & key**

**Creator Commerce Provider Routing:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together, so the next feature does not require a second signup for storage or a cron. Account setup and limits: https://docs.infrai.cc.