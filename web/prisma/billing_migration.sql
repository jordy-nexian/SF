-- Billing/Subscription Migration
-- Run this in Supabase SQL Editor to add subscription tracking fields

-- Add new enum types
DO $$ BEGIN
    CREATE TYPE "BillingCycle" AS ENUM ('monthly', 'annual');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "SubscriptionStatus" AS ENUM ('none', 'active', 'past_due', 'canceled', 'trialing');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add subscription columns to Tenant table
ALTER TABLE "Tenant" 
ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT,
ADD COLUMN IF NOT EXISTS "paypalSubscriptionId" TEXT,
ADD COLUMN IF NOT EXISTS "billingCycle" "BillingCycle" DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS "subscriptionStatus" "SubscriptionStatus" DEFAULT 'none',
ADD COLUMN IF NOT EXISTS "currentPeriodStart" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "cancelAtPeriodEnd" BOOLEAN DEFAULT false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "Tenant_stripeCustomerId_idx" ON "Tenant"("stripeCustomerId");
CREATE INDEX IF NOT EXISTS "Tenant_stripeSubscriptionId_idx" ON "Tenant"("stripeSubscriptionId");
CREATE INDEX IF NOT EXISTS "Tenant_paypalSubscriptionId_idx" ON "Tenant"("paypalSubscriptionId");






