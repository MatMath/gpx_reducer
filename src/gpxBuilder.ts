import { Builder } from 'xml2js';

// Types
import { Point, Route } from './types';

type Metadata = {
  name?: string;
  desc?: string;
  time?: string;
  link?: {
    $?: { href: string };
    href?: string;
    text?: string;
  } | Array<{ $?: { href: string }; href?: string; text?: string }>;
  [key: string]: any;
};

type GpxData = {
  version?: string;
  creator?: string;
  xmlns?: string;
  metadata?: Metadata;
  wpt?: Point[];
  waypoints?: Point[];
  rte?: Route[];
  routes?: Route[];
  trk?: Route['trkseg'][];
  tracks?: Route['trkseg'][];
  [key: string]: any;
};

// XML Builder instance
const builder = new Builder();

/**
 * Build track points
 */
const buildTrackPoints = (points: Point[] = []): any[] => {
  if (!Array.isArray(points)) return [];
  
  return points.map(pt => {
    const attrs = pt.$ || pt;
    const point: Record<string, any> = {
      $: {
        lat: attrs.lat ?? pt.lat,
        lon: attrs.lon ?? pt.lon
      }
    };

    if (pt.ele) point.ele = [pt.ele];
    if (pt.time) point.time = [pt.time];
    if (pt.name) point.name = [pt.name];
    if (pt.desc) point.desc = [pt.desc];
    if (pt.sym) point.sym = [pt.sym];
    if (pt.type) point.type = [pt.type];
    
    return point;
  }).filter(Boolean);
};

/**
 * Build track segments
 */
const buildTrackSegments = (segments: Route['trkseg']): Route['trkseg'] => {

  if (!segments) return {
    trkpt: []
  };
  
  return {
    trkpt: buildTrackPoints(segments.trkpt)
  };
};

/**
 * Build tracks section
 */
const buildTracks = (tracks: Route['trkseg'][] = []): any[] => {
  if (!Array.isArray(tracks)) return [];
  
  return tracks.map(track => {
    const trk: Record<string, any> = {
      name: track.name,
      // desc: track.desc ? [track.desc] : undefined,
      // number: track.number ? [track.number] : undefined,
      // type: track.type ? [track.type] : undefined,
      trkseg: buildTrackSegments(track.trkseg)
    };
    
    Object.keys(trk).forEach(key => trk[key] === undefined && delete trk[key]);
    return trk;
  });
};

/**
 * Build route points
 */
const buildRoutePoints = (points: Point[] = []): any[] => {
  if (!Array.isArray(points)) return [];
  
  return points.map(pt => {
    const attrs = pt.$ || pt;
    const point: Record<string, any> = {
      $: {
        lat: attrs.lat ?? pt.lat,
        lon: attrs.lon ?? pt.lon
      }
    };

    if (pt.ele) point.ele = [pt.ele];
    if (pt.time) point.time = [pt.time];
    if (pt.name) point.name = [pt.name];
    if (pt.desc) point.desc = [pt.desc];
    if (pt.sym) point.sym = [pt.sym];
    if (pt.type) point.type = [pt.type];
    
    return point;
  }).filter(Boolean);
};

/**
 * Build routes section
 */
const buildRoutes = (routes: Route[] = []): any[] => {
  if (!Array.isArray(routes)) return [];
  
  return routes.map(route => {
    const rte: Record<string, any> = {
      name: route.name ? [route.name] : undefined,
      desc: route.desc ? [route.desc] : undefined,
      number: route.number ? [route.number] : undefined,
      type: route.type ? [route.type] : undefined,
      rtept: buildRoutePoints(route.rtept)
    };
    
    Object.keys(rte).forEach(key => rte[key] === undefined && delete rte[key]);
    return rte;
  });
};

/**
 * Build waypoints section
 */
const buildWaypoints = (waypoints: Point[] = []): any[] => {
  if (!Array.isArray(waypoints)) return [];
  
  return waypoints.map(wpt => {
    const attrs = wpt.$ || wpt;
    const point: Record<string, any> = {
      $: {
        lat: attrs.lat ?? wpt.lat,
        lon: attrs.lon ?? wpt.lon
      }
    };

    if (wpt.name) point.name = [wpt.name];
    if (wpt.desc) point.desc = [wpt.desc];
    if (wpt.sym) point.sym = [wpt.sym];
    if (wpt.type) point.type = [wpt.type];
    if (wpt.time) point.time = [wpt.time];
    if (wpt.ele) point.ele = [wpt.ele];
    
    return point;
  }).filter(Boolean);
};

/**
 * Build metadata section
 */
const buildMetadata = (metadata?: Metadata): any[] => {
  if (!metadata) return [];
  
  const result: Record<string, any> = {};
  
  if (metadata.name) result.name = [metadata.name];
  if (metadata.desc) result.desc = [metadata.desc];
  if (metadata.time) result.time = [metadata.time];
  
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
};

/**
 * Build GPX XML string from processed JSON data
 * @param {GpxData} jsonData - The processed JSON data (from gpxProcessor)
 * @returns {string} GPX XML string
 */
const buildGpx = (jsonData: GpxData): string => {
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
      ...(jsonData.metadata ? { metadata: buildMetadata(jsonData.metadata) } : {}),
      ...(jsonData.wpt || jsonData.waypoints ? { wpt: buildWaypoints(jsonData.wpt || jsonData.waypoints) } : {}),
      ...(jsonData.rte || jsonData.routes ? { rte: buildRoutes(jsonData.rte || jsonData.routes) } : {}),
      ...(jsonData.trk ? { trk: buildTracks(jsonData.trk) } : {})
    }
  };

  // Convert to XML
  return builder.buildObject(gpxObj);
};

export {
  buildGpx,
  buildMetadata,
  buildWaypoints,
  buildRoutes,
  buildRoutePoints,
  buildTracks,
  buildTrackSegments,
  buildTrackPoints
};

export type {
  GpxData,
  Metadata,
  Point,
  Route,
};
