import { expect, test } from '@playwright/test';
import {
  snapToGrid,
  snapBoxToGrid,
  calculateBoundingBox,
  getAlignmentGuides,
  toBoundingBox,
} from '../../lib/docs/layoutUtils';

const describeBox = (x: number, y: number, width: number, height: number, id?: string) =>
  toBoundingBox(x, y, width, height, id);

test.describe('Canvas layout utilities', () => {
  test('snaps arbitrary values to the grid to keep nodes aligned', () => {
    const raw = describeBox(19, 33, 157, 98);
    const snapped = snapBoxToGrid(raw, 16);

    expect(snapped).toEqual({ x: 16, y: 32, width: 160, height: 96 });
  });

  test('calculates bounding boxes for multiple nodes', () => {
    const boxes = [
      describeBox(0, 0, 200, 100),
      describeBox(240, 120, 120, 80),
      describeBox(-40, 100, 60, 60),
    ];

    expect(calculateBoundingBox(boxes)).toEqual({ x: -40, y: 0, width: 400, height: 200 });
  });

  test('surfaces alignment guides when nodes nearly align', () => {
    const target = describeBox(100, 100, 120, 80, 'target');
    const comparators = [
      describeBox(60, 100, 120, 80, 'left-peer'),
      describeBox(230, 100, 120, 80, 'right-peer'),
    ];

    const guides = getAlignmentGuides(target, comparators, 6);

    expect(
      guides.some((guide) => guide.type === 'horizontal' && guide.matchId === 'left-peer' && guide.variant === 'edge'),
    ).toBe(true);
    expect(guides.some((guide) => guide.type === 'horizontal' && guide.matchId === 'right-peer')).toBe(true);
    expect(guides.some((guide) => guide.variant === 'center')).toBe(true);
    expect(guides.length).toBeGreaterThan(2);
  });

  test('snapToGrid preserves invalid input for safety', () => {
    expect(Number.isNaN(snapToGrid(NaN))).toBe(true);
    expect(snapToGrid(42, -1)).toBe(42);
  });
});
