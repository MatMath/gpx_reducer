/**
 * Utility functions for direction calculations
 */
export const DirectionUtils = {
  /**
   * Get direction of movement between two points for a single coordinate
   * @param {number} current - Current coordinate value
   * @param {number} previous - Previous coordinate value
   * @returns {number} 1 if increasing, -1 if decreasing, 0 if equal
   */
  getDirection(current, previous) {
    if (current > previous) return 1;
    if (current < previous) return -1;
    return 0;
  },

  /**
   * Get current directions for both latitude and longitude
   * @param {Object} current - Current point {lat, lon} (as strings)
   * @param {Object} previous - Previous point {lat, lon} (as strings)
   * @returns {Object} Directions object with lat and lon properties
   */
  getCurrentDirections(current, previous) {
    if (!current || !previous) {
      return { lat: 0, lon: 0 };
    }

    const currentLat = parseFloat(current.lat);
    const currentLon = parseFloat(current.lon);
    const prevLat = parseFloat(previous.lat);
    const prevLon = parseFloat(previous.lon);

    return {
      lat: this.getDirection(currentLat, prevLat),
      lon: this.getDirection(currentLon, prevLon)
    };
  },

  /**
   * Check if direction has changed for either latitude or longitude
   * @param {Object} current - Current point {lat, lon} (as strings)
   * @param {Object} previous - Previous point {lat, lon} (as strings)
   * @param {Object} directions - Previous directions {lat: number, lon: number}
   * @returns {boolean} True if direction changed
   */
  hasDirectionChanged(current, previous, directions) {
    if (!previous) return true; // First point always included
    
    const currentDirections = this.getCurrentDirections(current, previous);
    
    return (
      currentDirections.lat !== directions.lat ||
      currentDirections.lon !== directions.lon
    );
  }
};

export default DirectionUtils;
