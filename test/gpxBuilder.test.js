import { expect } from 'chai';
import GpxBuilder from '../src/gpxBuilder.js';

describe('GpxBuilder', () => {
  let builder;

  beforeEach(() => {
    builder = new GpxBuilder();
  });

  describe('buildGpx', () => {
    it('should generate valid GPX with minimal data', () => {
      const jsonData = {
        metadata: {
          name: 'Test Track',
          time: '2025-05-18T18:00:00Z'
        },
        routes: [
          {
            name: 'Test Route',
            rtept: [
              { $: { lat: '45.0', lon: '-75.0' } },
              { $: { lat: '45.1', lon: '-75.1' } }
            ]
          }
        ]
      };

      const gpx = builder.buildGpx(jsonData);
      
      expect(gpx).to.be.a('string');
      expect(gpx).to.include('<gpx');
      expect(gpx).to.include('version="1.1"');
      expect(gpx).to.include('<name>Test Track</name>');
      expect(gpx).to.include('<rtept lat="45.0" lon="-75.0">');
    });

    it('should handle waypoints, routes, and tracks', () => {
      const jsonData = {
        metadata: { name: 'Test Data' },
        waypoints: [
          { $: { lat: '45.5', lon: '-73.5' }, name: 'Start', sym: 'Flag' }
        ],
        routes: [
          {
            name: 'Test Route',
            desc: 'A test route',
            rtept: [
              { $: { lat: '45.0', lon: '-75.0' } },
              { $: { lat: '45.1', lon: '-75.1' } }
            ]
          }
        ],
        tracks: [
          {
            name: 'Test Track',
            trkseg: [
              {
                trkpt: [
                  { $: { lat: '45.0', lon: '-75.0' }, ele: '100', time: '2025-05-18T18:00:00Z' },
                  { $: { lat: '45.1', lon: '-75.1' }, ele: '110', time: '2025-05-18T18:10:00Z' }
                ]
              }
            ]
          }
        ]
      };

      const gpx = builder.buildGpx(jsonData);
      
      expect(gpx).to.include('<wpt lat="45.5" lon="-73.5">');
      expect(gpx).to.include('<name>Start</name>');
      expect(gpx).to.include('<sym>Flag</sym>');
      expect(gpx).to.include('<rte>');
      expect(gpx).to.include('<trk>');
      expect(gpx).to.include('<ele>100</ele>');
      expect(gpx).to.include('<time>2025-05-18T18:00:00Z</time>');
    });

    it('should handle empty sections', () => {
      const jsonData = {
        metadata: { name: 'Empty Test' }
        // No waypoints, routes, or tracks
      };

      const gpx = builder.buildGpx(jsonData);
      
      expect(gpx).to.include('<gpx');
      expect(gpx).to.include('<name>Empty Test</name>');
      expect(gpx).to.not.include('<wpt');
      expect(gpx).to.not.include('<rte');
      expect(gpx).to.not.include('<trk');
    });
  });

  describe('_buildMetadata', () => {
    it('should build metadata section', () => {
      const metadata = {
        name: 'Test',
        desc: 'Description',
        time: '2025-05-18T18:00:00Z',
        author: 'Tester'
      };

      const result = builder._buildMetadata(metadata);
      expect(result).to.deep.equal([{
        name: ['Test'],
        desc: ['Description'],
        time: ['2025-05-18T18:00:00Z']
      }]);
    });
  });

  describe('_buildWaypoints', () => {
    it('should build waypoints section', () => {
      const waypoints = [
        { $: { lat: '45.0', lon: '-75.0' }, name: 'WP1', sym: 'Flag' },
        { $: { lat: '46.0', lon: '-76.0' }, desc: 'Waypoint 2' }
      ];

      const result = builder._buildWaypoints(waypoints);
      
      expect(result).to.have.length(2);
      expect(result[0].$).to.deep.equal({ lat: '45.0', lon: '-75.0' });
      expect(result[0].name).to.deep.equal(['WP1']);
      expect(result[1].$).to.deep.equal({ lat: '46.0', lon: '-76.0' });
      expect(result[1].desc).to.deep.equal(['Waypoint 2']);
    });
  });
});
