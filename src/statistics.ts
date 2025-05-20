/**
 * Utility functions for calculating GPX statistics
 */

/**
 * Represents a geographic point with latitude and longitude
 */
export interface Point {
  lat: number | string;
  lon: number | string;
  ele?: string;
  time?: {
    value: string;
    "#name": string;
  };
  extensions?: {
    navionics_speed?: {
      value: string;
      "#name": string;
    };
    navionics_haccuracy?: string;
    navionics_vaccuracy?: string;
  };
  [key: string]: any; // Allow additional properties
}

/**
 * Represents a direction segment with bearing and length
 */
interface DirectionSegment {
  direction: number;
  length: number;
}

/**
 * Statistics about a route
 */
interface RouteStatistics {
  originalPoints: number;
  reducedPoints: number;
  reduction: string;
  straightLineDistance: number;
  boatDistance: number;
  directionChanges: number;
  directions: DirectionSegment[];
  closestLocations: {
    start: null | Point;
    end: null | Point;
  };
  totalHours: number;
  maxSpeed: number;
  name?: string;
}

/**
 * Calculate the distance between two points in nautical miles using the Haversine formula
 * @param point1 - First point with lat and lon properties
 * @param point2 - Second point with lat and lon properties
 * @returns Distance in nautical miles
 * @throws If input is invalid
 */
function calculateDistance(point1: Point, point2: Point): number {
  if (
    !point1 ||
    !point2 ||
    typeof point1.lat === "undefined" ||
    typeof point1.lon === "undefined" ||
    typeof point2.lat === "undefined" ||
    typeof point2.lon === "undefined"
  ) {
    throw new Error("Invalid points provided to calculateDistance");
  }

  // Convert latitude and longitude from degrees to radians
  const toRad = (value: number | string): number =>
    (parseFloat(value as string) * Math.PI) / 180;

  const lat1 = parseFloat(String(point1.lat)); // Make sure it is string since TS complains
  const lon1 = parseFloat(String(point1.lon));
  const lat2 = parseFloat(String(point2.lat));
  const lon2 = parseFloat(String(point2.lon));

  // Validate coordinates
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    throw new Error("Invalid coordinate values");
  }

  if (Math.abs(lat1) > 90 || Math.abs(lat2) > 90) {
    throw new Error("Latitude must be between -90 and 90 degrees");
  }

  if (Math.abs(lon1) > 180 || Math.abs(lon2) > 180) {
    throw new Error("Longitude must be between -180 and 180 degrees");
  }

  // Earth's mean radius in nautical miles (more precise value)
  // 1 nautical mile = 1.852 km, Earth's mean radius = 6,371.0088 km
  const R = 6371.0088 / 1.852; // ≈ 3440.069 nm

  // Convert latitude and longitude to radians
  const radLat1 = toRad(lat1);
  const radLat2 = toRad(lat2);
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  // Haversine formula
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) *
      Math.cos(radLat2) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  // Round to 6 decimal places to avoid floating point precision issues
  return parseFloat(distance.toFixed(6));
}

/**
 * Calculate the bearing (direction) from point1 to point2 in degrees
 * @param point1 - Starting point with lat and lon properties
 * @param point2 - Ending point with lat and lon properties
 * @returns Bearing in degrees (0-360)
 * @throws If input is invalid
 */
function calculateBearing(point1: Point, point2: Point): number {
  if (
    !point1 ||
    !point2 ||
    typeof point1.lat === "undefined" ||
    typeof point1.lon === "undefined" ||
    typeof point2.lat === "undefined" ||
    typeof point2.lon === "undefined"
  ) {
    throw new Error("Invalid points provided to calculateBearing");
  }

  const toRad = (value: number | string): number =>
    (parseFloat(value as string) * Math.PI) / 180;
  const toDeg = (value: number): number => (value * 180) / Math.PI;

  const lat1 = parseFloat(String(point1.lat)); // Make sure it is string since TS complains
  const lon1 = parseFloat(String(point1.lon));
  const lat2 = parseFloat(String(point2.lat));
  const lon2 = parseFloat(String(point2.lon));

  // Validate coordinates
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    throw new Error("Invalid coordinate values");
  }

  if (Math.abs(lat1) > 90 || Math.abs(lat2) > 90) {
    throw new Error("Latitude must be between -90 and 90 degrees");
  }

  if (Math.abs(lon1) > 180 || Math.abs(lon2) > 180) {
    throw new Error("Longitude must be between -180 and 180 degrees");
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
 * @param originalPoints - Array of original points
 * @param reducedPoints - Array of reduced points
 * @returns Statistics object with safe defaults
 */
function calculateRouteStatistics(
  originalPoints: Point[],
  reducedPoints: Point[]
): RouteStatistics {
  // Initialize with default values
  const defaultStats: RouteStatistics = {
    originalPoints: 0,
    reducedPoints: 0,
    reduction: "0.00%",
    straightLineDistance: 0,
    boatDistance: 0,
    directionChanges: 0,
    directions: [],
    closestLocations: {
      start: null,
      end: null,
    },
    totalHours: 0,
    maxSpeed: 0,
  };

  try {
    // Validate input
    if (
      !originalPoints ||
      !Array.isArray(originalPoints) ||
      originalPoints.length === 0
    ) {
      console.warn("Original points array is empty or invalid");
      return defaultStats;
    }

    if (
      !reducedPoints ||
      !Array.isArray(reducedPoints) ||
      reducedPoints.length === 0
    ) {
      console.warn("Reduced points array is empty or invalid");
      return defaultStats;
    }

    const originalLength = originalPoints.length;
    const reducedLength = reducedPoints.length;
    const reduction = ((1 - reducedLength / originalLength) * 100).toFixed(2);

    // Calculate total straight-line distance (over ground)
    let straightLineDistance = 0;
    if (originalLength >= 2) {
      straightLineDistance = calculateDistance(
        originalPoints[0],
        originalPoints[originalLength - 1]
      );
    }

    // Calculate total boat distance (sum of all segments)
    let boatDistance = 0;
    if (originalLength >= 2) {
      for (let i = 1; i < originalLength; i++) {
        try {
          boatDistance += calculateDistance(
            originalPoints[i - 1],
            originalPoints[i]
          );
        } catch (error) {
          console.warn(
            `Error calculating distance between points ${i - 1} and ${i}:`,
            error.message
          );
        }
      }
    }

    // Calculate directions and segment lengths if we have at least 2 reduced points
    let directionChanges = 0;
    const directions: DirectionSegment[] = [];

    if (reducedLength >= 2) {
      let previousBearing: number | null = null;

      for (let i = 1; i < reducedLength; i++) {
        try {
          const startPoint = reducedPoints[i - 1];
          const endPoint = reducedPoints[i];
          const bearing = calculateBearing(startPoint, endPoint);
          const segmentLength = calculateDistance(startPoint, endPoint);

          directions.push({
            direction: bearing,
            length: parseFloat(segmentLength.toFixed(2)), // Round to 2 decimal places
          });

          if (
            previousBearing !== null &&
            Math.abs(bearing - previousBearing) > 1
          ) {
            directionChanges++;
          }

          previousBearing = bearing;
        } catch (error) {
          console.warn(
            `Error calculating bearing between reduced points ${
              i - 1
            } and ${i}:`,
            error.message
          );
        }
      }
    }

    // Calculate total hours from first to last point
    let totalHours = 0;
    const lastPoint = originalPoints[originalLength - 1];
    if (
      originalLength >= 2 &&
      originalPoints[0].time &&
      lastPoint.time
    ) {
      const startTime = new Date(originalPoints[0].time.value).getTime();
      const endTime = new Date(lastPoint.time.value).getTime();
      totalHours = (endTime - startTime) / (1000 * 60 * 60); // Convert ms to hours
    }

    // Find maximum speed from all points
    let maxSpeed = 0;
    for (const point of originalPoints) {
      if (point.extensions?.navionics_speed?.value) {
        const speed = parseFloat(point.extensions.navionics_speed.value);
        if (!isNaN(speed) && speed > maxSpeed) {
          maxSpeed = speed;
        }
      }
    }

    return {
      originalPoints: originalLength,
      reducedPoints: reducedLength,
      reduction: `${reduction}%`,
      straightLineDistance: parseFloat(straightLineDistance.toFixed(2)),
      boatDistance: parseFloat(boatDistance.toFixed(2)),
      directionChanges,
      directions,
      closestLocations: {
        start: null,
        end: null,
      },
      totalHours: parseFloat(totalHours.toFixed(2)),
      maxSpeed: parseFloat(maxSpeed.toFixed(2)),
    };
  } catch (error) {
    console.error("Error in calculateRouteStatistics:", error);
    return defaultStats;
  }
}

export { calculateDistance, calculateBearing, calculateRouteStatistics };
