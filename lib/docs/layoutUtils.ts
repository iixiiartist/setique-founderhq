export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
    id?: string;
}

export interface AlignmentGuide {
    type: 'vertical' | 'horizontal';
    position: number;
    matchId: string | null;
    variant: 'edge' | 'center';
    delta: number;
}

export const DEFAULT_GRID_SIZE = 16;

/**
 * Snap a numeric value to the nearest grid increment.
 */
export const snapToGrid = (value: number, gridSize: number = DEFAULT_GRID_SIZE): number => {
    if (!Number.isFinite(value) || gridSize <= 0) {
        return value;
    }
    return Math.round(value / gridSize) * gridSize;
};

/**
 * Snap an entire bounding box to the configured grid.
 */
export const snapBoxToGrid = (box: BoundingBox, gridSize: number = DEFAULT_GRID_SIZE): BoundingBox => ({
    ...box,
    x: snapToGrid(box.x, gridSize),
    y: snapToGrid(box.y, gridSize),
    width: snapToGrid(box.width, gridSize),
    height: snapToGrid(box.height, gridSize),
});

/**
 * Calculate the minimal rectangle that contains all provided boxes.
 */
export const calculateBoundingBox = (boxes: ReadonlyArray<Readonly<BoundingBox>>): BoundingBox | null => {
    if (!boxes.length) {
        return null;
    }

    const xs = boxes.map((box) => box.x);
    const ys = boxes.map((box) => box.y);
    const maxX = boxes.map((box) => box.x + box.width);
    const maxY = boxes.map((box) => box.y + box.height);

    const minX = Math.min(...xs);
    const minY = Math.min(...ys);

    return {
        x: minX,
        y: minY,
        width: Math.max(...maxX) - minX,
        height: Math.max(...maxY) - minY,
    };
};

/**
 * Compute alignment guides for the target against comparison boxes.
 * Returns guides for matching edges/centers within a tolerance.
 */
export const getAlignmentGuides = (
    target: BoundingBox,
    comparators: ReadonlyArray<Readonly<BoundingBox>>,
    tolerance: number = 4,
): AlignmentGuide[] => {
    if (!comparators.length) {
        return [];
    }

    const guides: AlignmentGuide[] = [];
    const targetCenterX = target.x + target.width / 2;
    const targetCenterY = target.y + target.height / 2;

    comparators.forEach((box) => {
        const edges = {
            left: box.x,
            right: box.x + box.width,
            top: box.y,
            bottom: box.y + box.height,
            centerX: box.x + box.width / 2,
            centerY: box.y + box.height / 2,
        };

        const checks: Array<AlignmentGuide> = [
            { type: 'vertical', position: edges.left, matchId: box.id ?? null, variant: 'edge', delta: Math.abs(edges.left - target.x) },
            { type: 'vertical', position: edges.right, matchId: box.id ?? null, variant: 'edge', delta: Math.abs(edges.right - (target.x + target.width)) },
            { type: 'horizontal', position: edges.top, matchId: box.id ?? null, variant: 'edge', delta: Math.abs(edges.top - target.y) },
            { type: 'horizontal', position: edges.bottom, matchId: box.id ?? null, variant: 'edge', delta: Math.abs(edges.bottom - (target.y + target.height)) },
            { type: 'vertical', position: edges.centerX, matchId: box.id ?? null, variant: 'center', delta: Math.abs(edges.centerX - targetCenterX) },
            { type: 'horizontal', position: edges.centerY, matchId: box.id ?? null, variant: 'center', delta: Math.abs(edges.centerY - targetCenterY) },
        ];

        checks.forEach((guide) => {
            if (guide.delta <= tolerance) {
                guides.push(guide);
            }
        });
    });

    return guides.sort((a, b) => a.delta - b.delta);
};

export const toBoundingBox = (x: number, y: number, width: number, height: number, id?: string): BoundingBox => ({
    x,
    y,
    width,
    height,
    id,
});
