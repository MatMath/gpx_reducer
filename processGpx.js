#!/usr/bin/env node

import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import GpxProcessor from './src/gpxProcessor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  try {
    const processor = new GpxProcessor();
    
    // Get all GPX files in the input directory
    let inputFiles = [];
    
    // If a file is provided as an argument, use it
    if (process.argv[2]) {
      const filePath = path.resolve(process.argv[2]);
      if (fs.existsSync(filePath)) {
        inputFiles = [filePath];
      } else {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
      }
    } else {
      // Otherwise, look for GPX files in the input directory
      const files = fs.readdirSync(processor.inputDir);
      inputFiles = files
        .filter(file => file.toLowerCase().endsWith('.gpx'))
        .map(file => path.join(processor.inputDir, file));
      
      if (inputFiles.length === 0) {
        console.log(`No GPX files found in ${processor.inputDir}`);
        console.log(`Either place GPX files in the 'input' directory or provide a file path as an argument.`);
        process.exit(0);
      }
    }
    
    console.log(`Found ${inputFiles.length} GPX file(s) to process\n`);
    
    // Process each file
    for (const file of inputFiles) {
      try {
        const result = await processor.processFile(file);
        console.log(`- Processed: ${path.basename(file)}`);
        console.log(`  Routes: ${result.routeCount}`);
        console.log(`  Waypoints: ${result.waypointCount}`);
        console.log(`  Tracks: ${result.trackCount}`);
        
        // Display reduction statistics
        if (result.stats && result.stats.length > 0) {
          console.log('\n  Reduction Statistics:');
          result.stats.forEach((stat, index) => {
            console.log(`  Route ${index + 1}:`);
            console.log(`    Original points: ${stat.originalPoints}`);
            console.log(`    Reduced points: ${stat.reducedPoints}`);
            console.log(`    Reduction: ${stat.reduction}`);
          });
        }
        console.log('');
      } catch (error) {
        console.error(`Failed to process ${file}:`, error.message);
      }
    }
    
    console.log('Processing complete!');
  } catch (error) {
    console.error('An error occurred:', error.message);
    process.exit(1);
  }
}

main();
