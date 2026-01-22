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

    let match;
    while ((match = tokenRegex.exec(html)) !== null) {
        tokens.push({
            tokenId: match[1],
            label: match[2].trim(),
            position: match.index,
        });
    }

    // Also check for tokens where data-token-id comes before class
    const altRegex = /<span[^>]*data-token-id=["']([^"']+)["'][^>]*class=["'][^"']*fe-token[^"']*["'][^>]*>([^<]*)<\/span>/gi;

    while ((match = altRegex.exec(html)) !== null) {
        // Avoid duplicates
        if (!tokens.some(t => t.tokenId === match[1])) {
            tokens.push({
                tokenId: match[1],
                label: match[2].trim(),
                position: match.index,
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
