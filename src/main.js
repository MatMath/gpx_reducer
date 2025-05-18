#!/usr/bin/env node

import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import GpxProcessor from './gpxProcessor.js';
import GpxBuilder from './gpxBuilder.js';

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
        
        // Display statistics for each route
        if (result.stats && result.stats.length > 0) {
          console.log('\n  Route Statistics:');
          result.stats.forEach((stat, index) => {
            const routeName = stat.name ? ` - ${stat.name}` : 'N/A';
            console.log(`\n  ${routeName}`);
            console.log('  ' + '─'.repeat(50));
            console.log(`    Points: ${stat.originalPoints} → ${stat.reducedPoints} (${stat.reduction} reduction)`);
            console.log(`    Straight-line distance: ${stat.straightLineDistance} nm`);
            console.log(`    Boat distance: ${stat.boatDistance} nm`);
            console.log(`    Direction changes: ${stat.directionChanges}`);
            
            // Display initial direction and segment length if available
            if (stat.directions && stat.directions.length > 0) {
              // Display all segments if there are multiple
              if (stat.directions.length > 1) {
                console.log('    \n    Route Segments:');
                stat.directions.forEach((segment, idx) => {
                  console.log(`      Segment ${idx + 1}: ${segment.direction.toFixed(1)}° for ${segment.length} nm`);
                });
              }
            }
            console.log('  ' + '─'.repeat(50));
          });
        }
        console.log('');
      } catch (error) {
        console.error(`Failed to process ${file}:`, error.message);
      }
    }
    
    console.log('Processing complete!');
    
    // Automatically convert the generated JSON files to GPX
    console.log('\nConverting JSON files to GPX...');
    const outputDir = path.join(__dirname, '../output');
    const jsonFiles = fs.readdirSync(outputDir)
      .filter(file => file.endsWith('.json') && !file.endsWith('-reduced.json'));
    
    // Convert the file back into GPX
    const builder = new GpxBuilder();
    
    for (const jsonFile of jsonFiles) {
      const jsonPath = path.join(outputDir, jsonFile);
      const gpxPath = jsonPath.replace(/\.json$/, '.gpx');
      
      try {
        console.log(`- Converting ${jsonFile} to GPX...`);
        
        // Read JSON file
        const jsonData = await fs.readJson(jsonPath);
        
        // Convert to GPX
        const gpxContent = builder.buildGpx(jsonData.gpx || jsonData);
        
        // Write GPX file
        await fs.writeFile(gpxPath, gpxContent);
        
        console.log(`  ✓ Created ${path.basename(gpxPath)}`);
      } catch (error) {
        console.error(`  ✗ Failed to convert ${jsonFile}:`, error.message);
      }
    }
    
    console.log('\nAll conversions complete!');
  } catch (error) {
    console.error('An error occurred:', error.message);
    process.exit(1);
  }
}

main();
