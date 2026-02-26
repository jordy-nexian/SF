/**
 * HTML sanitization wrapper using DOMPurify.
 * Strips XSS vectors from user-controlled/admin-authored HTML
 * before it reaches dangerouslySetInnerHTML sinks.
 *
 * Uses isomorphic-dompurify which works in both SSR and client contexts.
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML for safe rendering via dangerouslySetInnerHTML.
 * Allows standard HTML elements and styles but strips scripts,
 * event handlers, and other XSS vectors.
 */
export function sanitizeHtml(dirty: string): string {
    return DOMPurify.sanitize(dirty, {
        // Allow common form-related elements
        ADD_TAGS: ['input', 'select', 'option', 'textarea', 'label', 'button', 'form'],
        // Allow form attributes and styles
        ADD_ATTR: [
            'type', 'name', 'value', 'placeholder', 'required', 'disabled',
            'checked', 'for', 'id', 'class', 'style', 'data-token-id',
            'data-token-label', 'data-mode', 'data-prefill-key',
            'data-options', 'data-field-type', 'readonly',
            'min', 'max', 'step', 'pattern', 'maxlength', 'multiple',
            'rows', 'cols', 'selected',
        ],
        // Allow data URIs for images only (no javascript: URIs)
        ALLOW_DATA_ATTR: true,
    });
}
