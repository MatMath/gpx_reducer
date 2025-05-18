import fs from 'fs-extra';
import path from 'path';
import { parseString } from 'xml2js';
import { fileURLToPath } from 'url';
import { DirectionUtils } from './directionUtils.js';

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
  async reducePointsByDirection(points) {
    if (!points || points.length <= 2) return points;
    
    const reducedPoints = [points[0]]; // Always include first point
    let previousPoint = points[0];
    
    // Initialize directions (0 = no change, 1 = increasing, -1 = decreasing)
    let directions = { lat: 0, lon: 0 };
    
    for (let i = 1; i < points.length; i++) {
      const currentPoint = points[i];
      
      if (this._hasDirectionChanged(currentPoint, previousPoint, directions)) {
        // Update directions for next comparison
        directions = DirectionUtils.getCurrentDirections(currentPoint, previousPoint);
        
        reducedPoints.push(currentPoint);
        previousPoint = currentPoint;
      }
    }
    
    // Always include last point if it's not already included
    if (points.length > 1 && !reducedPoints.includes(points[points.length - 1])) {
      reducedPoints.push(points[points.length - 1]);
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
            const originalPoints = Array.isArray(route.rtept) ? route.rtept : [route.rtept];
            const reducedPoints = this.reducePointsByDirection(originalPoints);
            
            // Add statistics to the route
            route.stats = {
              originalPoints: originalPoints.length,
              reducedPoints: reducedPoints.length,
              reduction: ((1 - (reducedPoints.length / originalPoints.length)) * 100).toFixed(2) + '%'
            };
            
            // Replace with reduced points
            route.rtept = reducedPoints;
          }
        });
      }
      
      // Get the base filename without extension
      const fileName = path.basename(filePath, path.extname(filePath));
      
      // Save the JSON file
      const outputPath = await this.saveJson(fileName, jsonData);
      
      return {
        inputFile: filePath,
        outputFile: outputPath,
        routeCount: jsonData.gpx.rte ? (Array.isArray(jsonData.gpx.rte) ? jsonData.gpx.rte.length : 1) : 0,
        waypointCount: jsonData.gpx.wpt ? (Array.isArray(jsonData.gpx.wpt) ? jsonData.gpx.wpt.length : 1) : 0,
        trackCount: jsonData.gpx.trk ? (Array.isArray(jsonData.gpx.trk) ? jsonData.gpx.trk.length : 1) : 0,
        stats: jsonData.gpx.rte ? (Array.isArray(jsonData.gpx.rte) ? 
          jsonData.gpx.rte.map(r => r.stats) : 
          [jsonData.gpx.rte.stats]) : []
      };
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error.message);
      throw error;
    }
  }
}

export default GpxProcessor;
