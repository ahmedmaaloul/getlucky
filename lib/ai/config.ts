// lib/ai/config.ts
// Model Cascade Configuration for GetLucky.Jobs

export const MODEL_TIERS = {
    TIER_1: 'gemini-3-flash-preview',
    TIER_2: 'gemini-2.5-flash',
    TIER_3: 'gemini-2.5-flash-lite',
} as const;

export const TASK_MODEL_DEFAULTS: Record<string, string[]> = {
    // High-intelligence tasks → Start at Tier 1
    CV_PARSE: [MODEL_TIERS.TIER_1, MODEL_TIERS.TIER_2, MODEL_TIERS.TIER_3],
    CV_TAILOR: [MODEL_TIERS.TIER_1, MODEL_TIERS.TIER_2, MODEL_TIERS.TIER_3],

    // Standard tasks → Start at Tier 2
    EMAIL_GENERATE: [MODEL_TIERS.TIER_2, MODEL_TIERS.TIER_3],
    EMAIL_SUBJECT: [MODEL_TIERS.TIER_2, MODEL_TIERS.TIER_3],

    // Bulk/simple tasks → Tier 3 only
    DATA_EXTRACT: [MODEL_TIERS.TIER_3],
    SKILL_NORMALIZE: [MODEL_TIERS.TIER_3],
};

export const MODEL_CREDIT_WEIGHTS: Record<string, number> = {
    [MODEL_TIERS.TIER_1]: 1.0,
    [MODEL_TIERS.TIER_2]: 0.5,
    [MODEL_TIERS.TIER_3]: 0.2,
};

export const QUOTA_CONFIG = {
    // Per-user limits
    FREE_APPS_PER_DAY: 5,
    FREE_CAMPAIGNS_MAX: 3,

    // Global safety caps
    GLOBAL_MONTHLY_CREDIT_LIMIT: 950_000,
    GLOBAL_MONTHLY_SPEND_CAP_USD: 5.0,
} as const;

export type TaskType = keyof typeof TASK_MODEL_DEFAULTS;
