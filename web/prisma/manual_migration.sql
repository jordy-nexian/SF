-- Manual migration to add missing columns to the Form table
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)

-- Add backupWebhookUrl column
ALTER TABLE "Form" ADD COLUMN IF NOT EXISTS "backupWebhookUrl" TEXT;

-- Add webhookRouting column (JSON)
ALTER TABLE "Form" ADD COLUMN IF NOT EXISTS "webhookRouting" JSONB;

-- Add payloadTransform column (JSON)
ALTER TABLE "Form" ADD COLUMN IF NOT EXISTS "payloadTransform" JSONB;

-- Add thankYouUrl column
ALTER TABLE "Form" ADD COLUMN IF NOT EXISTS "thankYouUrl" TEXT;

-- Add thankYouMessage column
ALTER TABLE "Form" ADD COLUMN IF NOT EXISTS "thankYouMessage" TEXT;

-- Add settings column (JSON)
ALTER TABLE "Form" ADD COLUMN IF NOT EXISTS "settings" JSONB;

-- Add trafficWeight to FormVersion for A/B testing
ALTER TABLE "FormVersion" ADD COLUMN IF NOT EXISTS "trafficWeight" INTEGER DEFAULT 0;

-- Add stepReached to SubmissionEvent for drop-off analysis
ALTER TABLE "SubmissionEvent" ADD COLUMN IF NOT EXISTS "stepReached" INTEGER;

-- Add custom domain columns to Tenant
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "customDomain" TEXT UNIQUE;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "customDomainVerified" BOOLEAN DEFAULT false;

-- Create AuditLog table if it doesn't exist
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- Create indexes for AuditLog
CREATE INDEX IF NOT EXISTS "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_resourceType_resourceId_idx" ON "AuditLog"("resourceType", "resourceId");












