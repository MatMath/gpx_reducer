import { expect } from 'chai';
import { calculateDistance } from '../src/statistics';

// Known distances in nautical miles (from online calculators)
const testCases = [
  {
    name: 'Same point',
    point1: { lat: 40.7128, lon: -74.0060 },  // New York
    point2: { lat: 40.7128, lon: -74.0060 },
    expectedDistance: 0
  },
  {
    name: 'Short distance',
    point1: { lat: 40.7128, lon: -74.0060 },  // New York
    point2: { lat: 40.7580, lon: -73.9855 },  // Times Square
    expectedDistance: 2.87,  // Calculated using Haversine formula
    tolerance: 0.05  // 50 meters tolerance for short distances
  },
  {
    name: 'Medium distance',
    point1: { lat: 40.7128, lon: -74.0060 },  // New York
    point2: { lat: 42.3601, lon: -71.0589 },  // Boston
    expectedDistance: 165.29,  // Calculated using Haversine formula
    tolerance: 1.0  // 1 nautical mile tolerance for medium distances
  },
  {
    name: 'Long distance',
    point1: { lat: 40.7128, lon: -74.0060 },  // New York
    point2: { lat: 51.5074, lon: -0.1278 },   // London
    expectedDistance: 3007.68,  // Calculated using Haversine formula
    tolerance: 5.0  // 5 nautical miles tolerance for long distances
  },
  {
    name: 'Crossing equator',
    point1: { lat: 40.7128, lon: -74.0060 },  // New York
    point2: { lat: -33.8688, lon: 151.2093 }, // Sydney
    expectedDistance: 8633.25,  // Calculated using Haversine formula
    tolerance: 10.0  // 10 nautical miles tolerance for very long distances
  }
];

describe('Distance Calculation Tests', () => {
  testCases.forEach(({ name, point1, point2, expectedDistance, tolerance }) => {
    it(`should calculate distance for ${name}`, () => {
      const distance = calculateDistance(point1, point2);
      
      // Special case for zero distance
      if (expectedDistance === 0) {
        expect(distance).toBe(0);
      } else {
        // Use provided tolerance or default to 1% if not specified
        tolerance = tolerance || expectedDistance * 0.01;
        
        // For Vitest, we need to specify the number of decimal places for the comparison
        const decimalPlaces = Math.max(0, -Math.floor(Math.log10(tolerance)));
        expect(distance).toBeCloseTo(expectedDistance, decimalPlaces);
      }
      
      // Log test details
      console.log(`\n${name}:`);
      console.log(`  Expected: ${expectedDistance.toFixed(2)} nm`);
      console.log(`  Calculated: ${distance.toFixed(2)} nm`);
      console.log(`  Difference: ${Math.abs(distance - expectedDistance).toFixed(2)} nm`);
      console.log(`  Tolerance: ±${(tolerance || 0).toFixed(2)} nm`);
    });
  });

  it('should throw error for invalid points', () => {
    expect(() => calculateDistance(null, { lat: 40, lon: -74 })).toThrow('Invalid points');
    expect(() => calculateDistance({ lat: 40 }, { lat: 40, lon: -74 })).toThrow('Invalid points');
    expect(() => calculateDistance({ lat: 'invalid', lon: -74 }, { lat: 40, lon: -74 })).toThrow('Invalid coordinate values');
  });

  it('should handle points near the international date line', () => {
    const point1 = { lat: 65, lon: 179.9 };  // Just west of the date line
    const point2 = { lat: 65, lon: -179.9 };  // Just east of the date line
    const distance = calculateDistance(point1, point2);
    // Should be a short distance across the date line, not all the way around the world
    expect(distance).toBeLessThan(100);
    console.log('\nDate Line Crossing Test:');
    console.log(`  Calculated distance: ${distance.toFixed(2)} nm`);
  });
});
