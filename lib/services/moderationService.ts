import { supabase } from '../supabase';
import { sanitizeInput, scanModelOutput, type SanitizationResult, type PromptValidationResult } from '../security/promptSanitizer';
import { telemetry } from './telemetry';

export interface ModerationContext {
    workspaceId?: string;
    userId?: string;
    docId?: string;
    channel?: string;
    direction: 'input' | 'output';
}

export interface ModerationResult {
    allowed: boolean;
    severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
    categories: string[];
    source: 'edge' | 'fallback' | 'skipped';
    direction?: ModerationContext['direction'];
    details?: Record<string, unknown>;
}

export class ModerationError extends Error {
    constructor(message: string, public result: ModerationResult) {
        super(message);
        this.name = 'ModerationError';
    }
}

const shouldFlagRiskLevel = (risk: SanitizationResult['riskLevel'] | PromptValidationResult['riskLevel']) =>
    risk === 'high' || risk === 'critical';

const FALLBACK_MAX_LENGTH = 8000;

export async function runModeration(text: string | null | undefined, context: ModerationContext): Promise<ModerationResult> {
    const payloadText = (text || '').trim();
    if (!payloadText) {
        return {
            allowed: true,
            severity: 'none',
            categories: [],
            source: 'skipped',
        };
    }

    const safeText = payloadText.slice(0, FALLBACK_MAX_LENGTH);

    try {
        const { data, error } = await supabase.functions.invoke<{ flagged?: boolean; categories?: string[]; severity?: ModerationResult['severity'] }>(
            'moderation-check',
            {
                body: {
                    text: safeText,
                    direction: context.direction,
                    workspaceId: context.workspaceId,
                    channel: context.channel,
                },
            },
        );

        if (error) {
            throw error;
        }

        const flagged = Boolean(data?.flagged);
        const severity = data?.severity ?? (flagged ? 'medium' : 'none');
        const categories = data?.categories ?? [];

        const result: ModerationResult = {
            allowed: !flagged,
            severity,
            categories,
            source: 'edge',
            direction: context.direction,
        };

        if (flagged) {
            telemetry.track('ai_moderation_flagged', {
                workspaceId: context.workspaceId,
                userId: context.userId,
                docId: context.docId,
                metadata: {
                    direction: context.direction,
                    categories,
                    severity,
                    source: 'edge',
                },
            });
        }

        return result;
    } catch (error) {
        console.warn('[ModerationService] Edge moderation failed, using heuristic fallback', error);
        const fallbackResult = context.direction === 'output'
            ? scanModelOutput(safeText)
            : sanitizeInput(safeText, FALLBACK_MAX_LENGTH, 'ai_text');

        const flagged = shouldFlagRiskLevel(fallbackResult.riskLevel);
        const categories = fallbackResult.threats ?? [];
        const severity = flagged ? (fallbackResult.riskLevel as ModerationResult['severity']) : 'none';

        const result: ModerationResult = {
            allowed: !flagged,
            severity,
            categories,
            source: 'fallback',
            direction: context.direction,
            details: { reason: 'sanitizer', threats: fallbackResult.threats },
        };

        if (flagged) {
            telemetry.track('ai_moderation_flagged', {
                workspaceId: context.workspaceId,
                userId: context.userId,
                docId: context.docId,
                metadata: {
                    direction: context.direction,
                    categories,
                    severity,
                    source: 'fallback',
                },
            });
        }

        return result;
    }
}

const SOURCE_LABEL: Record<ModerationResult['source'], string> = {
    edge: 'safety model',
    fallback: 'local scanner',
    skipped: 'safety filter',
};

export const formatModerationErrorMessage = (error: ModerationError): string => {
    const { severity, categories, source, direction } = error.result;
    const action = direction === 'output' ? 'AI response' : 'prompt';
    const severityLabel = severity && severity !== 'none' ? severity.toUpperCase() : 'policy';
    const categoryText = categories?.length ? ` • ${categories.join(', ')}` : '';
    const sourceLabel = SOURCE_LABEL[source] ?? 'safety filter';
    return `The ${action} was blocked by our ${sourceLabel} (${severityLabel}${categoryText}). Please remove sensitive or harmful content and try again.`;
};
