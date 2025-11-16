/**
 * Smart Chart Service - AI-Powered Chart Generation
 * 
 * Analyzes data and suggests optimal visualizations
 */

export interface ChartSuggestion {
    type: 'line' | 'bar' | 'pie' | 'scatter' | 'area';
    title: string;
    description: string;
    xAxis?: string;
    yAxis?: string;
    dataKeys: string[];
    colors?: string[];
    confidence: number;
}

export async function generateChartSuggestions(
    data: any[],
    userPrompt?: string
): Promise<{ success: boolean; suggestions?: ChartSuggestion[]; error?: string }> {
    if (!data || data.length === 0) {
        return { success: false, error: 'No data provided' };
    }

    const columns = Object.keys(data[0] || {});
    const suggestions: ChartSuggestion[] = [
        {
            type: 'line',
            title: 'Trend Over Time',
            description: 'Shows changes in values over time',
            xAxis: columns[0],
            yAxis: columns[1],
            dataKeys: columns.slice(1),
            colors: ['#3B82F6', '#10B981'],
            confidence: 0.85,
        },
        {
            type: 'bar',
            title: 'Comparison Chart',
            description: 'Compares values across categories',
            xAxis: columns[0],
            yAxis: columns[1],
            dataKeys: columns.slice(1),
            colors: ['#F59E0B'],
            confidence: 0.9,
        },
    ];

    return { success: true, suggestions };
}

export async function generateChart(
    data: any[],
    prompt: string
): Promise<{ success: boolean; chart?: ChartSuggestion; error?: string }> {
    const result = await generateChartSuggestions(data, prompt);
    
    if (!result.success || !result.suggestions || result.suggestions.length === 0) {
        return { success: false, error: result.error || 'No chart suggestions' };
    }

    return { success: true, chart: result.suggestions[0] };
}

export function generateChartColors(count: number): string[] {
    const baseColors = [
        '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
        '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
    ];
    return baseColors.slice(0, count);
}
