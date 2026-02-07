// lib/config/features.ts
// Feature flags for controlled deprecation

/**
 * Feature Flags
 * 
 * ENABLE_MANUAL_SEARCH: When false, hides all manual job search functionality.
 * Set to false when ready to deprecate manual search in favor of AI Agent.
 * 
 * Usage:
 * - Set NEXT_PUBLIC_ENABLE_MANUAL_SEARCH=false in .env to disable
 * - All manual search routes and nav items will be hidden
 * - AI Agent mode becomes the only option
 */

export const features = {
    /**
     * Manual job search/browse functionality
     * Set to false to hide and prepare for deprecation
     */
    ENABLE_MANUAL_SEARCH: process.env.NEXT_PUBLIC_ENABLE_MANUAL_SEARCH !== 'false',

    /**
     * AI Agent campaigns functionality
     * Always enabled (core product)
     */
    ENABLE_AI_AGENT: true,

    /**
     * Gmail integration for sending applications
     * Requires OAuth setup
     */
    ENABLE_GMAIL_SEND: process.env.NEXT_PUBLIC_ENABLE_GMAIL_SEND === 'true',
} as const;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof features): boolean {
    return features[feature];
}

/**
 * Get current active mode based on features
 * If manual search is disabled, defaults to agent
 */
export function getDefaultMode(): 'agent' | 'search' {
    return features.ENABLE_MANUAL_SEARCH ? 'search' : 'agent';
}
