# Shopify Billing Fix Documentation

## Problem
- Token is valid (shop.json returns 200)
- Can READ existing charges (GET returns 200)
- Cannot CREATE charges (POST returns 403)
- Error body is `null` - Shopify gives no explanation

## Root Cause
Shopify has deprecated the REST Billing API (`/admin/api/2024-01/recurring_application_charges.json`) for newer apps. Apps must use the **GraphQL Billing API** instead.

## Solution
Replace REST billing calls with GraphQL `appSubscriptionCreate` mutation.

### Files to Update (All Apps)

1. `/app/api/billing/create/route.ts` - Use GraphQL instead of REST
2. `/app/api/auth/shopify/callback/route.ts` - Use GraphQL for initial charge creation

### GraphQL Mutation for Creating Subscription

```graphql
mutation AppSubscriptionCreate($name: String!, $returnUrl: URL!, $trialDays: Int, $test: Boolean, $lineItems: [AppSubscriptionLineItemInput!]!) {
  appSubscriptionCreate(
    name: $name
    returnUrl: $returnUrl
    trialDays: $trialDays
    test: $test
    lineItems: $lineItems
  ) {
    appSubscription {
      id
      status
    }
    confirmationUrl
    userErrors {
      field
      message
    }
  }
}
```

### Variables

```json
{
  "name": "App Name Pro",
  "returnUrl": "https://your-app.com/api/billing/callback?shop=xxx&store_id=xxx",
  "trialDays": 7,
  "test": true,  // Only for dev/test stores
  "lineItems": [
    {
      "plan": {
        "appRecurringPricingDetails": {
          "price": { "amount": 29.99, "currencyCode": "USD" },
          "interval": "EVERY_30_DAYS"
        }
      }
    }
  ]
}
```

### Example Implementation

```typescript
async function createBillingCharge(shop: string, accessToken: string, returnUrl: string, isTestStore: boolean) {
  const response = await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `
        mutation AppSubscriptionCreate($name: String!, $returnUrl: URL!, $trialDays: Int, $test: Boolean, $lineItems: [AppSubscriptionLineItemInput!]!) {
          appSubscriptionCreate(
            name: $name
            returnUrl: $returnUrl
            trialDays: $trialDays
            test: $test
            lineItems: $lineItems
          ) {
            appSubscription {
              id
              status
            }
            confirmationUrl
            userErrors {
              field
              message
            }
          }
        }
      `,
      variables: {
        name: 'ProfitPulse Pro',
        returnUrl: returnUrl,
        trialDays: 7,
        test: isTestStore,
        lineItems: [
          {
            plan: {
              appRecurringPricingDetails: {
                price: { amount: 29.99, currencyCode: 'USD' },
                interval: 'EVERY_30_DAYS',
              },
            },
          },
        ],
      },
    }),
  });

  const data = await response.json();

  if (data.data?.appSubscriptionCreate?.userErrors?.length > 0) {
    throw new Error(data.data.appSubscriptionCreate.userErrors[0].message);
  }

  return data.data?.appSubscriptionCreate?.confirmationUrl;
}
```

### GraphQL Query for Checking Existing Subscriptions

```graphql
query {
  currentAppInstallation {
    activeSubscriptions {
      id
      name
      status
      currentPeriodEnd
      trialDays
    }
  }
}
```

## Apps to Update

- [ ] ProfitPulse (`/Users/adam/profitpulse`)
- [ ] BundleManager (`/Users/adam/bundlemanager`)
- [ ] MetafieldPro (`/Users/adam/metafieldpro`)
- [ ] Adwyse (`/Users/adam/adwyse`)
- [ ] ChannelSync (`/Users/adam/channelsync`)
- [ ] Argora (`/Users/adam/Documents/GitHub/Argora-cart-recovery`)

## Additional Notes

- The GraphQL endpoint is `/admin/api/2024-01/graphql.json`
- Same access token works for both REST and GraphQL
- The `test: true` flag still works the same way for dev stores
- Confirmation URL flow is the same - redirect user to it for approval
