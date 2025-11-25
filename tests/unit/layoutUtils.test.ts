import { describe, expect, it } from 'vitest';
import { calculateBoundingBox, getAlignmentGuides, snapBoxToGrid, snapToGrid, toBoundingBox } from '../../lib/docs/layoutUtils';

describe('layoutUtils', () => {
    describe('snapToGrid', () => {
        it('snaps positive values', () => {
            expect(snapToGrid(13, 8)).toBe(16);
            expect(snapToGrid(11, 4)).toBe(12);
        });

        it('snaps negative values', () => {
            expect(snapToGrid(-11, 8)).toBe(-8);
        });

        it('returns original value when grid is invalid', () => {
            expect(snapToGrid(10, 0)).toBe(10);
        });
    });

    describe('snapBoxToGrid', () => {
        it('snaps box coordinates and size', () => {
            const snapped = snapBoxToGrid({ x: 3, y: 5, width: 23, height: 17 }, 4);
            expect(snapped).toEqual({ x: 4, y: 4, width: 24, height: 16 });
        });
    });

    describe('calculateBoundingBox', () => {
        it('returns null for empty input', () => {
            expect(calculateBoundingBox([])).toBeNull();
        });

        it('calculates minimal bounding rectangle', () => {
            const bounds = calculateBoundingBox([
                { x: 0, y: 0, width: 10, height: 10 },
                { x: 12, y: 8, width: 6, height: 2 },
            ]);

            expect(bounds).toEqual({ x: 0, y: 0, width: 18, height: 10 });
        });
    });

    describe('getAlignmentGuides', () => {
        const target = toBoundingBox(100, 100, 40, 40, 'target');
        const comparators = [
            toBoundingBox(60, 100, 30, 30, 'left-aligned'),
            toBoundingBox(160, 120, 30, 30, 'right-aligned'),
            toBoundingBox(80, 60, 80, 60, 'center-aligned'),
        ];

        it('finds guides within tolerance', () => {
            const guides = getAlignmentGuides(target, comparators, 5);
            const ids = guides.map((guide) => guide.matchId);
            expect(ids).toContain('left-aligned');
            expect(ids).toContain('center-aligned');
        });

        it('sorts guides by closeness', () => {
            const guides = getAlignmentGuides(target, comparators, 10);
            const deltas = guides.map((guide) => guide.delta);
            expect(deltas).toEqual([...deltas].sort((a, b) => a - b));
        });

        it('returns empty array when nothing matches', () => {
            const farTarget = toBoundingBox(0, 0, 10, 10, 'far');
            expect(getAlignmentGuides(farTarget, comparators, 1)).toHaveLength(0);
        });
    });
});
