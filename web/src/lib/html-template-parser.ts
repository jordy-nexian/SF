/**
 * HTML Template Parser
 * Extracts fe-token spans from HTML templates and provides token replacement utilities
 */

export interface ExtractedToken {
    tokenId: string;    // data-token-id attribute UUID
    label: string;      // Text content of the span
    position: number;   // Character position in HTML
}

/**
 * Extract all fe-token spans from an HTML template
 * Looks for: <span class="fe-token" data-token-id="...">Label</span>
 */
export function extractTokensFromHtml(html: string): ExtractedToken[] {
    const tokens: ExtractedToken[] = [];

    // Regex to match fe-token spans with data-token-id
    // Matches: <span class="fe-token" data-token-id="UUID" ...>Content</span>
    const tokenRegex = /<span[^>]*class=["'][^"']*fe-token[^"']*["'][^>]*data-token-id=["']([^"']+)["'][^>]*>([^<]*)<\/span>/gi;

    let match: RegExpExecArray | null;
    while ((match = tokenRegex.exec(html)) !== null) {
        tokens.push({
            tokenId: match[1],
            label: match[2].trim(),
            position: match.index,
        });
    }

    // Also check for tokens where data-token-id comes before class
    const altRegex = /<span[^>]*data-token-id=["']([^"']+)["'][^>]*class=["'][^"']*fe-token[^"']*["'][^>]*>([^<]*)<\/span>/gi;

    let altMatch: RegExpExecArray | null;
    while ((altMatch = altRegex.exec(html)) !== null) {
        // Avoid duplicates
        if (!tokens.some(t => t.tokenId === altMatch![1])) {
            tokens.push({
                tokenId: altMatch[1],
                label: altMatch[2].trim(),
                position: altMatch.index,
            });
        }
    }

    // Sort by position to maintain document order
    tokens.sort((a, b) => a.position - b.position);

    return tokens;
}

/**
 * Replace fe-token spans with their corresponding values
 * 
 * @param html - The original HTML template
 * @param tokenValues - Map of tokenId -> value to insert
 * @returns HTML with token spans replaced by values (as editable inputs)
 */
export function replaceTokensWithValues(
    html: string,
    tokenValues: Record<string, string>
): string {
    // Replace each fe-token span with the corresponding value
    // Keep the span structure but replace content
    return html.replace(
        /<span([^>]*class=["'][^"']*fe-token[^"']*["'][^>]*data-token-id=["']([^"']+)["'][^>]*)>([^<]*)<\/span>/gi,
        (match, attrs, tokenId, label) => {
            const value = tokenValues[tokenId];
            if (value !== undefined) {
                return `<span${attrs}>${escapeHtml(value)}</span>`;
            }
            return match; // Keep original if no value provided
        }
    );
}

/**
 * Replace fe-token spans with values or input fields based on mode
 * 
 * @param html - The original HTML template
 * @param tokenValues - Map of tokenId -> value to insert (for prefill tokens)
 * @param tokenModes - Map of tokenId -> mode ("prefill", "manual", "signature", or "prefill_signature")
 * @returns HTML with prefill tokens as text and manual tokens as input fields
 */
export function replaceTokensWithModes(
    html: string,
    tokenValues: Record<string, string>,
    tokenModes: Record<string, string>
): string {
    return html.replace(
        /<span([^>]*class=["'][^"']*fe-token[^"']*["'][^>]*data-token-id=["']([^"']+)["'][^>]*)>([^<]*)<\/span>/gi,
        (match, attrs, tokenId, label) => {
            const mode = tokenModes[tokenId] || 'prefill';
            const value = tokenValues[tokenId];

            if (mode === 'prefill_signature') {
                // R12: Display a previously captured signature as a read-only image
                // Value should be a base64 data URL (e.g., "data:image/jpeg;base64,...")
                if (value && value.startsWith('data:image')) {
                    const placeholder = escapeHtml(label);
                    return `<div 
                        class="prefill-signature-display" 
                        data-token-id="${tokenId}" 
                        data-token-label="${placeholder}"
                        data-token-mode="prefill_signature"
                        style="display: inline-block; min-width: 320px; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;"
                    >
                        <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
                            ${placeholder} (Signed)
                        </div>
                        <img 
                            src="${value}" 
                            alt="${placeholder}" 
                            style="max-width: 300px; max-height: 150px; border: 1px solid #e2e8f0; border-radius: 4px; background: white;"
                        />
                    </div>`;
                }
                // If no value, fall back to showing an empty placeholder
                return `<div 
                    class="prefill-signature-display prefill-signature-empty" 
                    data-token-id="${tokenId}"
                    style="display: inline-block; min-width: 320px; min-height: 100px; padding: 10px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; color: #94a3b8; text-align: center; line-height: 80px;"
                >
                    Awaiting signature
                </div>`;
            } else if (mode === 'signature') {
                // Render a placeholder div that React will hydrate with SignaturePad
                const placeholder = escapeHtml(label);
                return `<div 
                    class="signature-token-placeholder" 
                    data-token-id="${tokenId}" 
                    data-token-label="${placeholder}"
                    data-token-mode="signature"
                    style="display: inline-block; min-width: 320px; min-height: 200px;"
                ></div>`;
            } else if (mode === 'manual') {
                // Render as an input field for user entry
                const fieldType = inferFieldType(label);
                const inputType = fieldType === 'email' ? 'email' :
                    fieldType === 'number' ? 'number' : 'text';
                const placeholder = escapeHtml(label);
                const existingValue = value ? escapeHtml(value) : '';

                // Mark with special class and data attributes for form submission
                // The name attribute uses tokenId so FormData can collect it
                return `<input type="${inputType}" 
                    name="${tokenId}"
                    class="manual-token-input" 
                    data-token-id="${tokenId}" 
                    data-token-label="${placeholder}"
                    placeholder="${placeholder}"
                    value="${existingValue}"
                    required
                    style="border: 1px solid #d1d5db; border-radius: 4px; padding: 6px 10px; min-width: 150px; font-size: inherit; font-family: inherit;"
                />`;
            } else if (mode === 'prefill_readonly') {
                // Locked prefill: display as text, not editable by user
                if (value !== undefined) {
                    return `<span${attrs} class="prefill-token-value prefill-token-readonly" style="color: black; background: rgba(14,165,233,0.07); border: 1px solid rgba(14,165,233,0.25); padding: 2px 6px; border-radius: 4px;">${escapeHtml(value)}</span>`;
                }
                return match;
            } else {
                // Prefill mode: editable input, pre-populated with the value so the user can adjust before submitting
                const fieldType = inferFieldType(label);
                const inputType = fieldType === 'email' ? 'email' :
                    fieldType === 'number' ? 'number' : 'text';
                const placeholder = escapeHtml(label);
                const existingValue = value !== undefined ? escapeHtml(value) : '';
                return `<input type="${inputType}"
                    name="${tokenId}"
                    class="prefill-token-input"
                    data-token-id="${tokenId}"
                    data-token-label="${placeholder}"
                    placeholder="${placeholder}"
                    value="${existingValue}"
                    style="border: 1px solid #d1d5db; border-radius: 4px; padding: 6px 10px; min-width: 150px; font-size: inherit; font-family: inherit; background: #ffffff;"
                />`;
            }
        }
    );
}

/**
 * Generate a form schema from extracted tokens
 * Converts tokens into form fields for the stateless forms renderer
 */
export function tokensToFormSchema(
    tokens: ExtractedToken[],
    mappings: Record<string, string> = {}
): { key: string; type: string; label: string; required: boolean }[] {
    return tokens.map(token => ({
        key: mappings[token.tokenId] || token.tokenId,
        type: inferFieldType(token.label),
        label: token.label,
        required: false,
    }));
}

/**
 * Infer field type from label text
 */
function inferFieldType(label: string): string {
    const lowerLabel = label.toLowerCase();

    if (lowerLabel.includes('email')) return 'email';
    if (lowerLabel.includes('phone') || lowerLabel.includes('tel')) return 'text';
    if (lowerLabel.includes('date')) return 'date';
    if (lowerLabel.includes('amount') || lowerLabel.includes('turnover') ||
        lowerLabel.includes('employees') || lowerLabel.includes('jobs')) return 'number';
    if (lowerLabel.includes('address') || lowerLabel.includes('description') ||
        lowerLabel.includes('activity') || lowerLabel.includes('purpose')) return 'textarea';
    if (lowerLabel.includes('signature')) return 'signature';

    return 'text';
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, char => map[char] || char);
}

/**
 * Apply payload data to tokens using mappings
 * 
 * @param payload - Incoming data from Quickbase/N8N
 * @param mappings - Map of tokenId -> payloadKey
 * @returns Map of tokenId -> value
 */
export function applyMappingsToPayload(
    payload: Record<string, unknown>,
    mappings: { tokenId: string; payloadKey: string }[]
): Record<string, string> {
    const result: Record<string, string> = {};

    for (const mapping of mappings) {
        const value = payload[mapping.payloadKey];
        if (value !== undefined && value !== null) {
            result[mapping.tokenId] = String(value);
        }
    }

    return result;
}
