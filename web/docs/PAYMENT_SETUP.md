# Payment Setup Guide

This guide walks you through setting up Stripe and PayPal for subscription billing.

## Overview

The billing system supports:
- **Monthly billing** at full price
- **Annual billing** with 17% discount
- **Stripe** for card payments
- **PayPal** for PayPal subscriptions

## Plan Pricing

| Plan | Monthly | Annual (per month) | Annual Total |
|------|---------|-------------------|--------------|
| Free | $0 | $0 | $0 |
| Pro | $29/mo | $24/mo | $288/year |
| Enterprise | $99/mo | $82/mo | $984/year |

---

## Stripe Setup

### 1. Create a Stripe Account

1. Go to [stripe.com](https://stripe.com) and create an account
2. Complete identity verification
3. Enable test mode for development

### 2. Create Products and Prices

In the Stripe Dashboard:

1. Go to **Products** → **Add Product**

2. **Create Pro Plan Product:**
   - Name: `Stateless Forms Pro`
   - Description: `Professional plan with 25 forms, 5000 submissions/month`
   
3. **Add Pro Monthly Price:**
   - Price: `$29.00`
   - Billing period: `Monthly`
   - Copy the Price ID (starts with `price_`)

4. **Add Pro Annual Price:**
   - Price: `$288.00`
   - Billing period: `Yearly`
   - Copy the Price ID

5. **Create Enterprise Plan Product:**
   - Name: `Stateless Forms Enterprise`
   - Description: `Enterprise plan with unlimited forms and submissions`

6. **Add Enterprise Monthly Price:**
   - Price: `$99.00`
   - Billing period: `Monthly`
   - Copy the Price ID

7. **Add Enterprise Annual Price:**
   - Price: `$984.00`
   - Billing period: `Yearly`
   - Copy the Price ID

### 3. Get API Keys

1. Go to **Developers** → **API Keys**
2. Copy your **Secret key** (starts with `sk_test_` or `sk_live_`)

### 4. Set Up Webhooks

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://your-domain.com/api/webhooks/stripe`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copy the **Signing secret** (starts with `whsec_`)

### 5. Configure Environment Variables

Add to your `.env` or Vercel environment:

```bash
# Stripe API
STRIPE_SECRET_KEY=sk_live_xxxxx

# Stripe Webhook
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Stripe Price IDs
STRIPE_PRO_MONTHLY_PRICE_ID=price_xxxxx
STRIPE_PRO_ANNUAL_PRICE_ID=price_xxxxx
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_xxxxx
STRIPE_ENTERPRISE_ANNUAL_PRICE_ID=price_xxxxx
```

### 6. Set Up Customer Portal

1. Go to **Settings** → **Customer portal**
2. Enable the portal
3. Configure allowed actions:
   - Cancel subscription ✓
   - Switch plans ✓
   - Update payment methods ✓

---

## PayPal Setup

### 1. Create a PayPal Business Account

1. Go to [paypal.com/business](https://www.paypal.com/business)
2. Create a business account
3. Complete verification

### 2. Create a PayPal App

1. Go to [developer.paypal.com](https://developer.paypal.com)
2. Click **My Apps & Credentials**
3. Create a new app (or use sandbox for testing)
4. Copy **Client ID** and **Secret**

### 3. Create Subscription Plans via API

PayPal requires creating products and plans via API. Here's how:

#### Create Product

```bash
curl -X POST https://api-m.paypal.com/v1/catalogs/products \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Stateless Forms Pro",
    "type": "SERVICE",
    "description": "Professional plan for Stateless Forms"
  }'
```

Save the `id` from the response.

#### Create Pro Monthly Plan

```bash
curl -X POST https://api-m.paypal.com/v1/billing/plans \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "PRODUCT_ID_FROM_ABOVE",
    "name": "Pro Monthly",
    "billing_cycles": [{
      "frequency": {"interval_unit": "MONTH", "interval_count": 1},
      "tenure_type": "REGULAR",
      "sequence": 1,
      "total_cycles": 0,
      "pricing_scheme": {
        "fixed_price": {"value": "29", "currency_code": "USD"}
      }
    }],
    "payment_preferences": {
      "auto_bill_outstanding": true,
      "payment_failure_threshold": 3
    }
  }'
```

#### Create Pro Annual Plan

```bash
curl -X POST https://api-m.paypal.com/v1/billing/plans \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "product_id": "PRODUCT_ID_FROM_ABOVE",
    "name": "Pro Annual",
    "billing_cycles": [{
      "frequency": {"interval_unit": "YEAR", "interval_count": 1},
      "tenure_type": "REGULAR",
      "sequence": 1,
      "total_cycles": 0,
      "pricing_scheme": {
        "fixed_price": {"value": "288", "currency_code": "USD"}
      }
    }],
    "payment_preferences": {
      "auto_bill_outstanding": true,
      "payment_failure_threshold": 3
    }
  }'
```

Repeat for Enterprise plans with $99/month and $984/year.

### 4. Set Up Webhooks

1. Go to **My Apps & Credentials** → Your App
2. Scroll to **Webhooks**
3. Add webhook URL: `https://your-domain.com/api/webhooks/paypal`
4. Select events:
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
   - `PAYMENT.SALE.COMPLETED`
5. Copy the **Webhook ID**

### 5. Configure Environment Variables

```bash
# PayPal API
PAYPAL_CLIENT_ID=xxxxx
PAYPAL_SECRET=xxxxx

# PayPal Webhook
PAYPAL_WEBHOOK_ID=xxxxx

# PayPal Plan IDs
PAYPAL_PRO_MONTHLY_PLAN_ID=P-xxxxx
PAYPAL_PRO_ANNUAL_PLAN_ID=P-xxxxx
PAYPAL_ENTERPRISE_MONTHLY_PLAN_ID=P-xxxxx
PAYPAL_ENTERPRISE_ANNUAL_PLAN_ID=P-xxxxx
```

---

## Database Migration

Run the billing migration to add subscription fields:

```sql
-- Run in Supabase SQL Editor
-- See: prisma/billing_migration.sql
```

Or via Prisma:

```bash
npx prisma db push
```

---

## Testing

### Test Stripe

1. Use Stripe test mode (`sk_test_` key)
2. Test card: `4242 4242 4242 4242`
3. Any future expiry, any CVC, any ZIP

### Test PayPal

1. Use PayPal sandbox mode
2. Create sandbox buyer account at developer.paypal.com
3. Use sandbox credentials for testing

---

## Vercel Environment Variables

Add all environment variables in Vercel:

1. Go to your project → Settings → Environment Variables
2. Add each variable for Production (and Preview/Development if needed)

Required variables:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRO_MONTHLY_PRICE_ID`
- `STRIPE_PRO_ANNUAL_PRICE_ID`
- `STRIPE_ENTERPRISE_MONTHLY_PRICE_ID`
- `STRIPE_ENTERPRISE_ANNUAL_PRICE_ID`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_SECRET`
- `PAYPAL_WEBHOOK_ID`
- `PAYPAL_PRO_MONTHLY_PLAN_ID`
- `PAYPAL_PRO_ANNUAL_PLAN_ID`
- `PAYPAL_ENTERPRISE_MONTHLY_PLAN_ID`
- `PAYPAL_ENTERPRISE_ANNUAL_PLAN_ID`

---

## Troubleshooting

### Stripe Webhook Failures

1. Check webhook signing secret is correct
2. Verify webhook URL is publicly accessible
3. Check Stripe Dashboard → Developers → Webhooks → Event deliveries

### PayPal Subscription Issues

1. Ensure plans are in "ACTIVE" status
2. Check webhook delivery in PayPal Developer Dashboard
3. Verify access token is valid

### Plan Limits Not Enforced

1. Verify tenant's `plan` field is updated correctly
2. Check `subscriptionStatus` is "active"
3. Review usage tracking in `/admin/usage`

---

## Support

For issues with:
- **Stripe**: [Stripe Support](https://support.stripe.com)
- **PayPal**: [PayPal Developer Support](https://developer.paypal.com/support)





