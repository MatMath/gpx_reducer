import fs from 'fs-extra';
import path from 'path';
import { parseString } from 'xml2js';
import { fileURLToPath } from 'url';

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
   * Process a single GPX file
   * @param {string} filePath - Path to the GPX file
   */
  async processFile(filePath) {
    try {
      console.log(`Processing file: ${filePath}`);
      
      // Parse GPX to JSON
      const jsonData = await this.parseGpxToJson(filePath);
      
      // Get the base filename without extension
      const fileName = path.basename(filePath, path.extname(filePath));
      
      // Save the JSON file
      const outputPath = await this.saveJson(fileName, jsonData);
      
      return {
        inputFile: filePath,
        outputFile: outputPath,
        routeCount: jsonData.gpx.rte ? (Array.isArray(jsonData.gpx.rte) ? jsonData.gpx.rte.length : 1) : 0,
        waypointCount: jsonData.gpx.wpt ? (Array.isArray(jsonData.gpx.wpt) ? jsonData.gpx.wpt.length : 1) : 0,
        trackCount: jsonData.gpx.trk ? (Array.isArray(jsonData.gpx.trk) ? jsonData.gpx.trk.length : 1) : 0
      };
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error.message);
      throw error;
    }
  }
}

export default GpxProcessor;
