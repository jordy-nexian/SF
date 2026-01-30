/**
 * Audit logging tests
 * Tests for audit log type definitions and entry structure.
 * Database operations are mocked.
 */

import { describe, it, expect, vi } from 'vitest';
import type { AuditAction, AuditLogEntry } from '../audit';

// We test the types and structure without actually hitting the database

describe('AuditAction type', () => {
    it('accepts valid action types', () => {
        const validActions: AuditAction[] = [
            'form.created',
            'form.updated',
            'form.deleted',
            'form.published',
            'form.archived',
            'form.duplicated',
            'version.created',
            'version.activated',
            'theme.updated',
            'settings.updated',
            'webhook.tested',
        ];

        // This tests compile-time type safety
        expect(validActions).toHaveLength(11);
    });
});

describe('AuditLogEntry structure', () => {
    it('accepts a complete audit log entry', () => {
        const entry: AuditLogEntry = {
            tenantId: 'tenant-123',
            userId: 'user-456',
            action: 'form.created',
            resourceType: 'form',
            resourceId: 'form-789',
            metadata: { formName: 'Contact Form' },
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
        };

        expect(entry.tenantId).toBe('tenant-123');
        expect(entry.userId).toBe('user-456');
        expect(entry.action).toBe('form.created');
        expect(entry.resourceType).toBe('form');
        expect(entry.resourceId).toBe('form-789');
    });

    it('accepts entry with optional fields omitted', () => {
        const entry: AuditLogEntry = {
            tenantId: 'tenant-123',
            userId: 'user-456',
            action: 'settings.updated',
            resourceType: 'settings',
            resourceId: 'settings-123',
        };

        expect(entry.metadata).toBeUndefined();
        expect(entry.ipAddress).toBeUndefined();
        expect(entry.userAgent).toBeUndefined();
    });

    it('accepts different resource types', () => {
        const formEntry: AuditLogEntry = {
            tenantId: 'tenant-123',
            userId: 'user-456',
            action: 'form.created',
            resourceType: 'form',
            resourceId: 'form-789',
        };

        const versionEntry: AuditLogEntry = {
            tenantId: 'tenant-123',
            userId: 'user-456',
            action: 'version.created',
            resourceType: 'version',
            resourceId: 'version-789',
        };

        const themeEntry: AuditLogEntry = {
            tenantId: 'tenant-123',
            userId: 'user-456',
            action: 'theme.updated',
            resourceType: 'theme',
            resourceId: 'theme-789',
        };

        const settingsEntry: AuditLogEntry = {
            tenantId: 'tenant-123',
            userId: 'user-456',
            action: 'settings.updated',
            resourceType: 'settings',
            resourceId: 'settings-789',
        };

        expect(formEntry.resourceType).toBe('form');
        expect(versionEntry.resourceType).toBe('version');
        expect(themeEntry.resourceType).toBe('theme');
        expect(settingsEntry.resourceType).toBe('settings');
    });

    it('accepts complex metadata objects', () => {
        const entry: AuditLogEntry = {
            tenantId: 'tenant-123',
            userId: 'user-456',
            action: 'form.updated',
            resourceType: 'form',
            resourceId: 'form-789',
            metadata: {
                previousStatus: 'draft',
                newStatus: 'live',
                changedFields: ['name', 'description'],
                versionNumber: 2,
            },
        };

        expect(entry.metadata?.previousStatus).toBe('draft');
        expect(entry.metadata?.changedFields).toEqual(['name', 'description']);
    });
});
