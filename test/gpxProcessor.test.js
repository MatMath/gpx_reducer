import { expect } from 'chai';
import { reducePointsByDirection } from '../src/gpxProcessor';

describe('GpxProcessor', () => {
  describe('reducePointsByDirection', () => {
    it('should keep points where direction changes', () => {
      const points = [
        { lat: '43.307228', lon: '16.457782' },
        { lat: '43.306211', lon: '16.454683' },
        { lat: '43.305673', lon: '16.453812' },
        { lat: '43.302485', lon: '16.447676' },
        { lat: '43.302471', lon: '16.447443' },
        { lat: '43.305502', lon: '16.433061' }, // Direction changes here (lat starts increasing)
        { lat: '43.315637', lon: '16.408790' }
      ];

      const reducedPoints = reducePointsByDirection(points);
      
      // Should keep first point, last point, and points where direction changes
      expect(reducedPoints).toHaveLength(4);
      expect(reducedPoints[0]).toEqual(points[0]); // First point
      expect(reducedPoints[1]).toEqual(points[1]); // Second point (needed to establish initial direction)
      expect(reducedPoints[2]).toEqual(points[5]); // Point where direction changes
      expect(reducedPoints[3]).toEqual(points[6]); // Last point
    });
  });
});
