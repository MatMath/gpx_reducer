# Navionic GPS export to Google Map

Navionic GPS export everything, every meter moved... and this create files of hundred of MB. In order to import into other system like Google Map, we need to reduce the number of points. This script will reduce them.
Rule: As long as longitude and latitude keep the same direction, we can remove the point. When the direction change, we keep the point. This create start and end point of each section. 

Disclaimer: Might break if schema change, but it worked for me.

## Usage

Add the file in the input directory and run the script:
```bash
npm install
npm run start
```

Go to Google https://www.google.com/maps/d/u/0/ and import the GPX file from the output directory.

## Development

### Prerequisites

- Node.js 20+
- npm or yarn

## Features

- **GPX Parsing**: Convert GPX files to JSON for easy manipulation
- **GPX Generation**: Convert processed JSON data back to GPX format
- **Track Optimization**: Reduce points while maintaining route shape
- **Statistics**: Calculate distance, speed, elevation, and other metrics
- **Direction Analysis**: Detect and analyze direction changes in tracks
- **TypeScript Support**: Fully typed for better development experience


## License

ISC

## Acknowledgements

- [xml2js](https://github.com/Leonidas-from-XIV/node-xml2js) - For XML parsing and building
