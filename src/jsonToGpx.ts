import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import GpxBuilder from './gpxBuilder';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  try {
    // Check if input file is provided
    if (process.argv.length < 3) {
      console.error('Usage: node jsonToGpx <input-json-file> [output-gpx-file]');
      console.error('If output file is not provided, it will use the input filename with .gpx extension');
      process.exit(1);
    }

    const inputFile = path.resolve(process.argv[2]);
    let outputFile = process.argv[3];

    // Set default output filename if not provided
    if (!outputFile) {
      const ext = path.extname(inputFile);
      outputFile = inputFile.replace(ext, '.gpx');
    } else {
      outputFile = path.resolve(outputFile);
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputFile);
    await fs.ensureDir(outputDir);

    console.log(`Reading JSON from: ${inputFile}`);
    const jsonData = await fs.readJson(inputFile);

    console.log('Converting JSON to GPX...');
    const builder = new GpxBuilder();
    
    // Extract the content from the gpx property if it exists
    const gpxData = jsonData.gpx || jsonData;
    const gpx = builder.buildGpx(gpxData);

    console.log(`Writing GPX to: ${outputFile}`);
    await fs.writeFile(outputFile, gpx);

    console.log('Conversion completed successfully!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
