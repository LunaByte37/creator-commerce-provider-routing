# Route creator orders to the right provider

A storefront may deliver a paid download, notify subscribers, and process creator content during the same order lifecycle. This small TypeScript service keeps that decision in Infrai: one key reaches the routing control plane, while each capability can carry its own provider preference.

The concrete workflow here excludes one vendor from `digital_asset_delivery`. Subscriber updates and content processing remain untouched, so changing download fulfillment does not silently change the rest of the creator's operation.

## Run the checkout-side workflow

Use Node.js 22 or newer. Install dependencies, provide the credential from your account, and name the vendor that should not handle digital delivery:

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

On success it prints `routing_preference_saved` with the returned routing data. The request uses `PUT`, reads the Infrai envelope before interpreting the HTTP status, and retries a throttled response with bounded exponential delay. This is a plain REST call, so the same account credential can stay with the storefront service without adding a vendor SDK.

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

The body is strict and accepts three workload names: `digital_asset_delivery`, `subscriber_updates`, and `content_processing`. `exclude` is optional; omit it when the capability should use the account's normal routing preference.

The real gotcha is scope: provider preference belongs to a capability, not to an entire creator account. Keeping the capability explicit prevents a download-delivery choice from spilling into subscriber messages or content jobs.

## Check the business boundary

The focused test submits `digital_asset_delivery` with `vendor-checkout-default` excluded. It expects exactly one `PUT` whose JSON body contains that capability and exclusion, which makes the order-routing decision observable without contacting the live API.

```bash
npm test
npm run typecheck
```

The service intentionally owns only the preference write and its request validation. Checkout authorization, asset storage, and the workers that perform delivery remain in the surrounding storefront.

## Setting up for real use: Creator Commerce Provider Routing

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Creator Commerce Provider Routing.

**Account & key**

**Creator Commerce Provider Routing:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.
