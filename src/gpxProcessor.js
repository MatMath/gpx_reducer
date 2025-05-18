import fs from 'fs-extra';
import path from 'path';
import { parseString } from 'xml2js';
import { fileURLToPath } from 'url';
import { DirectionUtils } from './directionUtils.js';
import { calculateRouteStatistics } from './statistics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GpxProcessor {
  constructor() {
    this.inputDir = path.join(__dirname, '../input');
    this.outputDir = path.join(__dirname, '../output');
    this.ensureDirectories();
  }

  ensureDirectories() {
    // Create input and output directories if they don't exist
    fs.ensureDirSync(this.inputDir);
    fs.ensureDirSync(this.outputDir);
  }

  /**
   * Parse GPX file to JSON
   * @param {string} filePath - Path to the GPX file
   * @returns {Promise<Object>} Parsed JSON object
   */
  async parseGpxToJson(filePath) {
    try {
      const xmlData = await fs.readFile(filePath, 'utf-8');
      
      return new Promise((resolve, reject) => {
        parseString(xmlData, { explicitArray: false, mergeAttrs: true }, (err, result) => {
          if (err) {
            reject(new Error(`Error parsing XML: ${err.message}`));
            return;
          }
          resolve(result);
        });
      });
    } catch (error) {
      throw new Error(`Error reading file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Save JSON data to a file
   * @param {string} fileName - Output file name (without extension)
   * @param {Object} data - JSON data to save
   */
  async saveJson(fileName, data) {
    const outputPath = path.join(this.outputDir, `${fileName}.json`);
    await fs.writeJson(outputPath, data, { spaces: 2 });
    console.log(`JSON saved to: ${outputPath}`);
    return outputPath;
  }

  /**
   * Check if direction has changed for either latitude or longitude
   * @param {Object} current - Current point {lat, lon}
   * @param {Object} previous - Previous point {lat, lon}
   * @param {Object} directions - Previous directions {lat: number, lon: number}
   * @returns {boolean} True if direction changed
   */
  _hasDirectionChanged(current, previous, directions) {
    return DirectionUtils.hasDirectionChanged(current, previous, directions);
  }

  /**
   * Reduce points by only keeping points where direction changes
   * @param {Array} points - Array of points with lat/lon
   * @returns {Array} Reduced array of points
   */
  reducePointsByDirection(points) {
    if (!points || points.length <= 2) return [...points];
    
    const reducedPoints = [points[0]]; // Always include first point
    let previousPoint = points[0];
    let currentPoint = points[1];
    
    // Initialize directions based on first two points
    let directions = DirectionUtils.getCurrentDirections(currentPoint, previousPoint);
    reducedPoints.push(currentPoint);
    
    for (let i = 2; i < points.length; i++) {
      const nextPoint = points[i];
      const newDirections = DirectionUtils.getCurrentDirections(nextPoint, currentPoint);
      
      // Check if direction has changed for either lat or lon
      if (newDirections.lat !== directions.lat || newDirections.lon !== directions.lon) {
        reducedPoints.push(nextPoint);
        directions = newDirections;
      }
      
      currentPoint = nextPoint;
    }
    
    // Ensure last point is included if not already
    const lastPoint = points[points.length - 1];
    if (reducedPoints[reducedPoints.length - 1] !== lastPoint) {
      reducedPoints.push(lastPoint);
    }
    
    return reducedPoints;
  }

  /**
   * Process a single GPX file
   * @param {string} filePath - Path to the GPX file
   */
  async processFile(filePath) {
    try {
      console.log(`Processing file: ${filePath}`);
      
      // Parse GPX to JSON
      const jsonData = await this.parseGpxToJson(filePath);
      
      // Process routes if they exist
      if (jsonData.gpx.rte) {
        const routes = Array.isArray(jsonData.gpx.rte) ? jsonData.gpx.rte : [jsonData.gpx.rte];
        
        routes.forEach(route => {
          if (route.rtept) {
            // Ensure we have an array of points
            const originalPoints = Array.isArray(route.rtept) ? route.rtept : [route.rtept];
            
            // Filter out any invalid points (missing lat/lon)
            const validPoints = originalPoints.filter(point => 
              point && 
              typeof point.lat !== 'undefined' && 
              typeof point.lon !== 'undefined' &&
              !isNaN(parseFloat(point.lat)) && 
              !isNaN(parseFloat(point.lon))
            );
            
            // Only process if we have at least 2 valid points
            if (validPoints.length >= 2) {
              const reducedPoints = this.reducePointsByDirection(validPoints);
              
              // Calculate statistics for the route
              const stats = calculateRouteStatistics(validPoints, reducedPoints);
              
              // Add route name to stats if available
              if (route.name) {
                stats.name = route.name;
              }
              
              // Add statistics to the route
              route.stats = stats;
              
              // Replace with reduced points
              route.rtept = reducedPoints;
            } else {
              // If not enough valid points, use default stats
              route.stats = calculateRouteStatistics([], []);
              route.rtept = validPoints;
            }
          } else {
            // If no points, use default stats
            route.stats = calculateRouteStatistics([], []);
            route.rtept = [];
          }
        });
      }
      
      // Get the base filename without extension
      const fileName = path.basename(filePath, path.extname(filePath));
      
      // Save the JSON file
      const outputPath = await this.saveJson(fileName, jsonData);
      
      // Prepare result with file and route information
      const result = {
        inputFile: filePath,
        outputFile: outputPath,
        routeCount: jsonData.gpx.rte ? (Array.isArray(jsonData.gpx.rte) ? jsonData.gpx.rte.length : 1) : 0,
        waypointCount: jsonData.gpx.wpt ? (Array.isArray(jsonData.gpx.wpt) ? jsonData.gpx.wpt.length : 1) : 0,
        trackCount: jsonData.gpx.trk ? (Array.isArray(jsonData.gpx.trk) ? jsonData.gpx.trk.length : 1) : 0,
        stats: []
      };
      
      // Add detailed stats for each route if they exist
      if (jsonData.gpx.rte) {
        const routes = Array.isArray(jsonData.gpx.rte) ? jsonData.gpx.rte : [jsonData.gpx.rte];
        result.stats = routes.map(route => route.stats || {});
      }
      
      return result;
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error.message);
      throw error;
    }
  }
}

export default GpxProcessor;
