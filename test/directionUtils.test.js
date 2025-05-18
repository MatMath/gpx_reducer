import test from 'node:test';
import assert from 'node:assert/strict';
import { DirectionUtils } from '../src/directionUtils.js';

const { describe, it } = test;

describe('DirectionUtils', () => {
  describe('getDirection', () => {
    it('should return 1 when current > previous', () => {
      assert.strictEqual(DirectionUtils.getDirection(5, 3), 1);
      assert.strictEqual(DirectionUtils.getDirection(0, -1), 1);
      assert.strictEqual(DirectionUtils.getDirection(0.1, 0.099), 1);
    });

    it('should return -1 when current < previous', () => {
      assert.strictEqual(DirectionUtils.getDirection(3, 5), -1);
      assert.strictEqual(DirectionUtils.getDirection(-1, 0), -1);
      assert.strictEqual(DirectionUtils.getDirection(0.099, 0.1), -1);
    });

    it('should return 0 when current equals previous', () => {
      assert.strictEqual(DirectionUtils.getDirection(5, 5), 0);
      assert.strictEqual(DirectionUtils.getDirection(0, 0), 0);
      assert.strictEqual(DirectionUtils.getDirection(-1, -1), 0);
    });
  });

  describe('hasDirectionChanged', () => {
    // Test cases for direction changes
    const testCases = [
      {
        name: 'should detect lat increase',
        current: { lat: '2.0', lon: '1.0' },
        previous: { lat: '1.0', lon: '1.0' },
        directions: { lat: 0, lon: 0 },
        expected: true
      },
      {
        name: 'should detect lat decrease',
        current: { lat: '1.0', lon: '1.0' },
        previous: { lat: '2.0', lon: '1.0' },
        directions: { lat: 0, lon: 0 },
        expected: true
      },
      {
        name: 'should detect lon increase',
        current: { lat: '1.0', lon: '2.0' },
        previous: { lat: '1.0', lon: '1.0' },
        directions: { lat: 0, lon: 0 },
        expected: true
      },
      {
        name: 'should detect lon decrease',
        current: { lat: '1.0', lon: '1.0' },
        previous: { lat: '1.0', lon: '2.0' },
        directions: { lat: 0, lon: 0 },
        expected: true
      },
      {
        name: 'should detect no change',
        current: { lat: '1.0', lon: '1.0' },
        previous: { lat: '1.0', lon: '1.0' },
        directions: { lat: 0, lon: 0 },
        expected: false
      },
      {
        name: 'should handle first point',
        current: { lat: '1.0', lon: '1.0' },
        previous: null,
        directions: { lat: 0, lon: 0 },
        expected: true
      },
      {
        name: 'should handle floating point precision',
        current: { lat: '1.000001', lon: '2.000001' },
        previous: { lat: '1.0', lon: '2.0' },
        directions: { lat: 0, lon: 0 },
        expected: true
      },
      {
        name: 'should handle decreasing direction pre-defined',
        current: { lat: '1.000001', lon: '2.000001' },
        previous: { lat: '1.0002', lon: '2.0002' },
        directions: { lat: -1, lon: -1 },
        expected: false
      },
      {
        name: 'should handle increasing direction pre-defined',
        current: { lat: '1.2', lon: '1.2' },
        previous: { lat: '1.1', lon: '1.1' },
        directions: { lat: 1, lon: 1 },
        expected: false
      }
    ];

    testCases.forEach(({ name, current, previous, directions, expected }) => {
      it(name, () => {
        assert.strictEqual(
          DirectionUtils.hasDirectionChanged(current, previous, directions),
          expected
        );
      });
    });
  });

  describe('getCurrentDirections', () => {
    it('should calculate correct directions', () => {
      const current = { lat: '2.0', lon: '1.0' };
      const previous = { lat: '1.0', lon: '2.0' };
      
      const result = DirectionUtils.getCurrentDirections(current, previous);
      
      assert.deepStrictEqual(result, {
        lat: 1,   // 2.0 > 1.0 → increasing
        lon: -1   // 1.0 < 2.0 → decreasing
      });
    });

    it('should handle equal values', () => {
      const current = { lat: '1.0', lon: '1.0' };
      const previous = { lat: '1.0', lon: '1.0' };
      
      const result = DirectionUtils.getCurrentDirections(current, previous);
      
      assert.deepStrictEqual(result, {
        lat: 0,   // 1.0 == 1.0 → no change
        lon: 0    // 1.0 == 1.0 → no change
      });
    });

    it('should handle missing points', () => {
      const result1 = DirectionUtils.getCurrentDirections(null, { lat: '1.0', lon: '1.0' });
      const result2 = DirectionUtils.getCurrentDirections({ lat: '1.0', lon: '1.0' }, null);
      
      assert.deepStrictEqual(result1, { lat: 0, lon: 0 });
      assert.deepStrictEqual(result2, { lat: 0, lon: 0 });
    });
  });
});
