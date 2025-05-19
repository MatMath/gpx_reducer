import fs from "fs-extra";
import path from "path";
import { parseString } from "xml2js";
import { fileURLToPath } from "url";
import { DirectionUtils } from "./directionUtils";
import { calculateRouteStatistics } from "./statistics";
import type { Point } from "./statistics";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Types
export interface GpxJsonData {
  gpx: {
    xmlns: string;
    version: string;
    creator: string;
    metadata: {
      link: {
        href: string;
      };
    };
    trk: Route[];
    wpt: any[];
  };
}

export interface Route {
  name: { value: string };
  trkseg: {
    trkpt: Point[];
    extensions?: {
      navionics_start_time: string;
      navionics_end_time: string;
    };
  };
  stats?: any;
  [key: string]: any;
}
// rtept?: Point | Point[];
// name?: string;
// }

export interface ProcessFileResult {
  inputFile: string;
  outputFile: string;
  routeCount: number;
  waypointCount: number;
  trackCount: number;
  stats: any[];
}

// Constants
const DEFAULT_DIRS = {
  input: path.join(__dirname, "../input"),
  output: path.join(__dirname, "../output"),
};

// Directory Management
export const ensureDirectories = (
  inputDir = DEFAULT_DIRS.input,
  outputDir = DEFAULT_DIRS.output
) => {
  // Create input and output directories if they don't exist
  fs.ensureDirSync(inputDir);
  fs.ensureDirSync(outputDir);
  return { inputDir, outputDir };
};

/**
 * Parse GPX file to JSON
 * @param filePath - Path to the GPX file
 * @returns Promise with parsed JSON object
 */
export const parseGpxToJson = async (
  filePath: string
): Promise<GpxJsonData> => {
  try {
    const xmlData = await fs.readFile(filePath, "utf-8");

    return new Promise((resolve, reject) => {
      parseString(
        xmlData,
        {
          explicitArray: false,
          mergeAttrs: true,
          explicitRoot: true,
          explicitChildren: true,
          preserveChildrenOrder: true,
          attrkey: "attrs",
          charkey: "value",
          trim: true,
        },
        (err, result) => {
          if (err) {
            reject(new Error(`Error parsing XML: ${err.message}`));
            return;
          }
          resolve(result as GpxJsonData);
        }
      );
    });
  } catch (error) {
    throw new Error(
      `Error reading file ${filePath}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

/**
 * Save JSON data to a file
 * @param fileName - Output file name (without extension)
 * @param data - JSON data to save
 * @param outputDir - Output directory path
 * @returns Path to the saved file
 */
export const saveJson = async (
  fileName: string,
  data: any,
  outputDir: string = DEFAULT_DIRS.output
): Promise<string> => {
  const outputPath = path.join(outputDir, `${fileName}.json`);
  await fs.writeJson(outputPath, data, { spaces: 2 });
  console.log(`JSON saved to: ${outputPath}`);
  return outputPath;
};

/**
 * Check if direction has changed for either latitude or longitude
 * @param current - Current point {lat, lon}
 * @param previous - Previous point {lat, lon}
 * @param directions - Previous directions {lat: number, lon: number}
 * @returns True if direction changed
 */
export const hasDirectionChanged = (
  current: Point,
  previous: Point,
  directions: { lat: number; lon: number }
): boolean => {
  return DirectionUtils.hasDirectionChanged(current, previous, directions);
};

/**
 * Reduce points by only keeping points where direction changes
 * @param points - Array of points with lat/lon
 * @returns Reduced array of points
 */
export const reducePointsByDirection = (points: Point[]): Point[] => {
  if (!points || points.length <= 2) return [...(points || [])];

  const reducedPoints = [points[0]]; // Always include first point
  let currentPoint = points[1];

  // Initialize directions based on first two points
  let directions = DirectionUtils.getCurrentDirections(currentPoint, points[0]);
  reducedPoints.push(currentPoint);

  for (let i = 2; i < points.length; i++) {
    const nextPoint = points[i];
    const newDirections = DirectionUtils.getCurrentDirections(
      nextPoint,
      currentPoint
    );

    // Check if direction has changed for either lat or lon
    if (
      newDirections.lat !== directions.lat ||
      newDirections.lon !== directions.lon
    ) {
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
};

/**
 * Process a single GPX file
 * @param filePath - Path to the GPX file
 * @param options - Options including input and output directories
 * @returns Processed file result with statistics
 */
export const processFile = async (
  filePath: string,
  options: { inputDir?: string; outputDir?: string } = {}
): Promise<ProcessFileResult> => {
  const { inputDir, outputDir = DEFAULT_DIRS.output } = options;

  try {
    console.log(`Processing file: ${filePath}`);

    // Ensure output directory exists
    if (outputDir) {
      ensureDirectories(inputDir, outputDir);
    }

    // Parse GPX to JSON
    const jsonData = await parseGpxToJson(filePath);

    // Process routes if they exist
    if (jsonData.gpx.trk) {
      const routes = Array.isArray(jsonData.gpx.trk)
        ? jsonData.gpx.trk
        : [jsonData.gpx.trk];

      routes.forEach((route) => {
        if (route.trkseg) {
          // Ensure we have an array of points
          const originalPoints = Array.isArray(route.trkseg.trkpt)
            ? route.trkseg.trkpt
            : [route.trkseg.trkpt];

          // Filter out any invalid points (missing lat/lon)
          const validPoints = originalPoints.filter(
            (point): point is Point =>
              point !== null &&
              typeof point === "object" &&
              "lat" in point &&
              "lon" in point &&
              !isNaN(parseFloat(String(point.lat))) &&
              !isNaN(parseFloat(String(point.lon)))
          );

          // Only process if we have at least 2 valid points
          if (validPoints.length >= 2) {
            const reducedPoints = reducePointsByDirection(validPoints);

            // Calculate statistics for the route
            const stats = calculateRouteStatistics(validPoints, reducedPoints);

            // Add route name to stats if available
            if (route.name) {
              stats.name = route.name;
            }

            // Add statistics to the route
            route.stats = stats;

            // Replace with reduced points
            route.trkseg.trkpt = reducedPoints;
          } else {
            // If not enough valid points, use default stats
            route.stats = calculateRouteStatistics([], []);
            route.trkseg.trkpt = validPoints;
          }
        } else {
          // If no points, use default stats
          route.stats = calculateRouteStatistics([], []);
          route.trkseg.trkpt = [];
        }
      });
    }

    // Get the base filename without extension
    const fileName = path.basename(filePath, path.extname(filePath));

    // Save the JSON file
    const outputPath = await saveJson(fileName, jsonData, outputDir);

    // Prepare result with file and route information
    const result: ProcessFileResult = {
      inputFile: filePath,
      outputFile: outputPath,
      routeCount: jsonData.gpx.trk
        ? Array.isArray(jsonData.gpx.trk)
          ? jsonData.gpx.trk.length
          : 1
        : 0,
      waypointCount: jsonData.gpx.wpt
        ? Array.isArray(jsonData.gpx.wpt)
          ? jsonData.gpx.wpt.length
          : 1
        : 0,
      trackCount: jsonData.gpx.trk
        ? Array.isArray(jsonData.gpx.trk)
          ? jsonData.gpx.trk.length
          : 1
        : 0,
      stats: [],
    };

    // Add detailed stats for each route if they exist
    if (jsonData.gpx.trk) {
      const routes = Array.isArray(jsonData.gpx.trk)
        ? jsonData.gpx.trk
        : [jsonData.gpx.trk];
      result.stats = routes.map((route) => route.stats || {});
    }

    return result;
  } catch (error) {
    console.error(
      `Error processing file ${filePath}:`,
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
};

// Export all functions
export const GpxProcessor = {
  ensureDirectories,
  parseGpxToJson,
  saveJson,
  hasDirectionChanged,
  reducePointsByDirection,
  processFile,
};

export default GpxProcessor;
