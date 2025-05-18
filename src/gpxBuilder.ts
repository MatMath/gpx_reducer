import { Builder } from 'xml2js';

/**
 * Converts processed JSON back to GPX format
 */
class GpxBuilder {
  constructor() {
    this.builder = new Builder({
      xmldec: { version: '1.0', encoding: 'UTF-8' },
      headless: true
    });
  }

  /**
   * Build GPX XML string from processed JSON data
   * @param {Object} jsonData - The processed JSON data (from gpxProcessor)
   * @returns {string} GPX XML string
   */
  buildGpx(jsonData) {
    // Start with the root GPX element
    const gpxObj = {
      gpx: {
        $: {
          version: jsonData.version || '1.1',
          creator: jsonData.creator || 'GPX Processor',
          'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
          'xsi:schemaLocation': 'http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd',
          xmlns: jsonData.xmlns || 'http://www.topografix.com/GPX/1/1'
        },
        ...(jsonData.metadata ? { metadata: this._buildMetadata(jsonData.metadata) } : {}),
        ...(jsonData.wpt || jsonData.waypoints ? { wpt: this._buildWaypoints(jsonData.wpt || jsonData.waypoints) } : {}),
        ...(jsonData.rte || jsonData.routes ? { rte: this._buildRoutes(jsonData.rte || jsonData.routes) } : {}),
        ...(jsonData.trk || jsonData.tracks ? { trk: this._buildTracks(jsonData.trk || jsonData.tracks) } : {})
      }
    };

    // Convert to XML
    return this.builder.buildObject(gpxObj);
  }

  /**
   * Build metadata section
   * @private
   */
  _buildMetadata(metadata) {
    if (!metadata) return [];
    
    const result = {};
    
    // Handle direct properties
    if (metadata.name) result.name = [metadata.name];
    if (metadata.desc) result.desc = [metadata.desc];
    if (metadata.time) result.time = [metadata.time];
    
    // Handle link element if present
    if (metadata.link) {
      if (Array.isArray(metadata.link)) {
        result.link = metadata.link.map(link => {
          const href = link.$?.href || link.href;
          if (!href) return null;
          return {
            $: { href },
            ...(link.text ? { text: [link.text] } : {})
          };
        }).filter(Boolean);
      } else if (typeof metadata.link === 'object') {
        const href = metadata.link.$?.href || metadata.link.href;
        if (href) {
          result.link = [{
            $: { href },
            ...(metadata.link.text ? { text: [metadata.link.text] } : {})
          }];
        }
      }
    }
    
    return [result];
  }

  /**
   * Build waypoints section
   * @private
   */
  _buildWaypoints(waypoints) {
    if (!waypoints || !Array.isArray(waypoints)) return [];
    
    return waypoints.map(wpt => {
      // Handle both object with $ property and direct properties
      const attrs = wpt.$ || wpt;
      const point = {
        $: { 
          lat: attrs.lat || attrs.lat,
          lon: attrs.lon || attrs.lon
        }
      };

      // Add properties if they exist
      if (wpt.name) point.name = [wpt.name];
      if (wpt.desc) point.desc = [wpt.desc];
      if (wpt.sym) point.sym = [wpt.sym];
      if (wpt.type) point.type = [wpt.type];
      if (wpt.time) point.time = [wpt.time];
      if (wpt.ele) point.ele = [wpt.ele];
      
      return point;
    }).filter(Boolean);
  }

  /**
   * Build routes section
   * @private
   */
  _buildRoutes(routes) {
    if (!routes || !Array.isArray(routes)) return [];
    
    return routes.map(route => {
      const rte = {
        name: route.name ? [route.name] : undefined,
        desc: route.desc ? [route.desc] : undefined,
        number: route.number ? [route.number] : undefined,
        type: route.type ? [route.type] : undefined,
        rtept: this._buildRoutePoints(route.rtept)
      };
      
      // Remove undefined values
      Object.keys(rte).forEach(key => rte[key] === undefined && delete rte[key]);
      return rte;
    });
  }

  /**
   * Build route points
   * @private
   */
  _buildRoutePoints(points) {
    if (!points || !Array.isArray(points)) return [];
    
    return points.map(pt => {
      // Handle both object with $ property and direct properties
      const attrs = pt.$ || pt;
      const point = {
        $: { 
          lat: attrs.lat || pt.lat,
          lon: attrs.lon || pt.lon
        }
      };

      // Add properties if they exist
      if (pt.ele) point.ele = [pt.ele];
      if (pt.time) point.time = [pt.time];
      if (pt.name) point.name = [pt.name];
      if (pt.desc) point.desc = [pt.desc];
      if (pt.sym) point.sym = [pt.sym];
      if (pt.type) point.type = [pt.type];
      
      return point;
    }).filter(Boolean);
  }

  /**
   * Build tracks section
   * @private
   */
  _buildTracks(tracks) {
    if (!tracks || !Array.isArray(tracks)) return [];
    
    return tracks.map(track => {
      const trk = {
        name: track.name ? [track.name] : undefined,
        desc: track.desc ? [track.desc] : undefined,
        number: track.number ? [track.number] : undefined,
        type: track.type ? [track.type] : undefined,
        trkseg: this._buildTrackSegments(track.trkseg)
      };
      
      // Remove undefined values
      Object.keys(trk).forEach(key => trk[key] === undefined && delete trk[key]);
      return trk;
    });
  }

  /**
   * Build track segments
   * @private
   */
  _buildTrackSegments(segments) {
    if (!segments || !Array.isArray(segments)) return [];
    
    return segments.map(segment => ({
      trkpt: this._buildTrackPoints(segment.trkpt)
    }));
  }

  /**
   * Build track points
   * @private
   */
  _buildTrackPoints(points) {
    if (!points || !Array.isArray(points)) return [];
    
    return points.map(pt => {
      // Handle both object with $ property and direct properties
      const attrs = pt.$ || pt;
      const point = {
        $: { 
          lat: attrs.lat || pt.lat,
          lon: attrs.lon || pt.lon
        },
        ...(pt.ele ? { ele: [pt.ele] } : {}),
        ...(pt.time ? { time: [pt.time] } : {}),
        ...(pt.extensions ? { extensions: [pt.extensions] } : {})
      };
      
      return point;
    }).filter(Boolean);
  }
}

export default GpxBuilder;
