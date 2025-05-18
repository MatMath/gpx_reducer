/**
 * Utility functions for calculating GPX statistics
 */

/**
 * Calculate the distance between two points in nautical miles using the Haversine formula
 * @param {Object} point1 - First point with lat and lon properties
 * @param {Object} point2 - Second point with lat and lon properties
 * @returns {number} Distance in nautical miles
 * @throws {Error} If input is invalid
 */
function calculateDistance(point1, point2) {
  if (!point1 || !point2 || 
      typeof point1.lat === 'undefined' || 
      typeof point1.lon === 'undefined' ||
      typeof point2.lat === 'undefined' || 
      typeof point2.lon === 'undefined') {
    throw new Error('Invalid points provided to calculateDistance');
  }

  // Convert latitude and longitude from degrees to radians
  const toRad = (value) => (parseFloat(value) * Math.PI) / 180;
  
  const lat1 = parseFloat(point1.lat);
  const lon1 = parseFloat(point1.lon);
  const lat2 = parseFloat(point2.lat);
  const lon2 = parseFloat(point2.lon);
  
  // Validate coordinates
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    throw new Error('Invalid coordinate values');
  }
  
  if (Math.abs(lat1) > 90 || Math.abs(lat2) > 90) {
    throw new Error('Latitude must be between -90 and 90 degrees');
  }
  
  if (Math.abs(lon1) > 180 || Math.abs(lon2) > 180) {
    throw new Error('Longitude must be between -180 and 180 degrees');
  }
  
  const R = 3440.065; // Earth's radius in nautical miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate the bearing (direction) from point1 to point2 in degrees
 * @param {Object} point1 - Starting point with lat and lon properties
 * @param {Object} point2 - Ending point with lat and lon properties
 * @returns {number} Bearing in degrees (0-360)
 * @throws {Error} If input is invalid
 */
function calculateBearing(point1, point2) {
  if (!point1 || !point2 || 
      typeof point1.lat === 'undefined' || 
      typeof point1.lon === 'undefined' ||
      typeof point2.lat === 'undefined' || 
      typeof point2.lon === 'undefined') {
    throw new Error('Invalid points provided to calculateBearing');
  }

  const toRad = (value) => (parseFloat(value) * Math.PI) / 180;
  const toDeg = (value) => (value * 180) / Math.PI;
  
  const lat1 = parseFloat(point1.lat);
  const lon1 = parseFloat(point1.lon);
  const lat2 = parseFloat(point2.lat);
  const lon2 = parseFloat(point2.lon);
  
  // Validate coordinates
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    throw new Error('Invalid coordinate values');
  }
  
  if (Math.abs(lat1) > 90 || Math.abs(lat2) > 90) {
    throw new Error('Latitude must be between -90 and 90 degrees');
  }
  
  if (Math.abs(lon1) > 180 || Math.abs(lon2) > 180) {
    throw new Error('Longitude must be between -180 and 180 degrees');
  }
  
  // If points are the same, return 0
  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }
  
  const radLat1 = toRad(lat1);
  const radLon1 = toRad(lon1);
  const radLat2 = toRad(lat2);
  const radLon2 = toRad(lon2);
  
  const y = Math.sin(radLon2 - radLon1) * Math.cos(radLat2);
  const x = 
    Math.cos(radLat1) * Math.sin(radLat2) -
    Math.sin(radLat1) * Math.cos(radLat2) * Math.cos(radLon2 - radLon1);
    
  let bearing = toDeg(Math.atan2(y, x));
  return (bearing + 360) % 360; // Normalize to 0-360
}

/**
 * Calculate statistics for a route
 * @param {Array} originalPoints - Array of original points
 * @param {Array} reducedPoints - Array of reduced points
 * @returns {Object} Statistics object with safe defaults
 */
function calculateRouteStatistics(originalPoints, reducedPoints) {
  // Initialize with default values
  const defaultStats = {
    originalPoints: 0,
    reducedPoints: 0,
    reduction: '0.00%',
    totalDistance: 0,
    directionChanges: 0,
    directions: [],
    closestLocations: {
      start: null,
      end: null
    }
  };

  try {
    // Validate input
    if (!originalPoints || !Array.isArray(originalPoints) || originalPoints.length === 0) {
      console.warn('Original points array is empty or invalid');
      return defaultStats;
    }
    
    if (!reducedPoints || !Array.isArray(reducedPoints) || reducedPoints.length === 0) {
      console.warn('Reduced points array is empty or invalid');
      return defaultStats;
    }
    
    const originalLength = originalPoints.length;
    const reducedLength = reducedPoints.length;
    const reduction = ((1 - (reducedLength / originalLength)) * 100).toFixed(2);
    
    // Calculate total distance if we have at least 2 points
    let totalDistance = 0;
    if (originalLength >= 2) {
      for (let i = 1; i < originalLength; i++) {
        try {
          totalDistance += calculateDistance(originalPoints[i - 1], originalPoints[i]);
        } catch (error) {
          console.warn(`Error calculating distance between points ${i-1} and ${i}:`, error.message);
        }
      }
    }
    
    // Calculate directions and segment lengths if we have at least 2 reduced points
    let directionChanges = 0;
    const directions = [];
    
    if (reducedLength >= 2) {
      let previousBearing = null;
      
      for (let i = 1; i < reducedLength; i++) {
        try {
          const startPoint = reducedPoints[i - 1];
          const endPoint = reducedPoints[i];
          const bearing = calculateBearing(startPoint, endPoint);
          const segmentLength = calculateDistance(startPoint, endPoint);
          
          directions.push({
            direction: bearing,
            length: parseFloat(segmentLength.toFixed(2)) // Round to 2 decimal places
          });
          
          if (previousBearing !== null && Math.abs(bearing - previousBearing) > 1) {
            directionChanges++;
          }
          
          previousBearing = bearing;
        } catch (error) {
          console.warn(`Error calculating bearing between reduced points ${i-1} and ${i}:`, error.message);
        }
      }
    }
    
    return {
      originalPoints: originalLength,
      reducedPoints: reducedLength,
      reduction: `${reduction}%`,
      totalDistance: parseFloat(totalDistance.toFixed(2)),
      directionChanges,
      directions,
      closestLocations: {
        start: null,
        end: null
      }
    };
  } catch (error) {
    console.error('Error in calculateRouteStatistics:', error);
    return defaultStats;
  }
}

export {
  calculateDistance,
  calculateBearing,
  calculateRouteStatistics
};
