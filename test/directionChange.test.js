import { DirectionUtils } from '../src/directionUtils.js';
import { expect } from 'chai';

describe('DirectionUtils', () => {
  describe('hasDirectionChanged', () => {
    it('should detect direction change when latitude changes direction', () => {
      // Test case based on the example
      const points = [
        { lat: '43.307228', lon: '16.457782' },
        { lat: '43.306211', lon: '16.454683' },
        { lat: '43.305673', lon: '16.453812' },
        { lat: '43.302485', lon: '16.447676' },
        { lat: '43.302471', lon: '16.447443' },
        { lat: '43.305502', lon: '16.433061' }, // This should be detected as a direction change
        { lat: '43.315637', lon: '16.408790' }
      ];

      // Initialize directions (0 = no change, 1 = increasing, -1 = decreasing)
      let directions = { lat: 0, lon: 0 };
      
      // First point to second point (decreasing lat)
      directions = DirectionUtils.getCurrentDirections(points[1], points[0]);
      expect(directions.lat).to.equal(-1);
      
      // Second point to third point (still decreasing lat)
      directions = DirectionUtils.getCurrentDirections(points[2], points[1]);
      expect(directions.lat).to.equal(-1);
      
      // Third point to fourth point (still decreasing lat)
      directions = DirectionUtils.getCurrentDirections(points[3], points[2]);
      expect(directions.lat).to.equal(-1);
      
      // Fourth point to fifth point (still decreasing lat, but very small change)
      directions = DirectionUtils.getCurrentDirections(points[4], points[3]);
      expect(directions.lat).to.equal(-1);
      
      // Fifth point to sixth point (now increasing lat - direction change!)
      const changed = DirectionUtils.hasDirectionChanged(points[5], points[4], directions);
      expect(changed).to.be.true;
    });
  });
});
