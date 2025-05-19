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
  name: { value: string } | string;
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

export type Point = {
  $?: { lat: string | number; lon: string | number };
  lat?: string | number;
  lon?: string | number;
  ele?: string | number;
  time?: string;
  name?: string;
  desc?: string;
  sym?: string;
  type?: string;
  [key: string]: any;
};

export type Track = {
  name?: string;
  desc?: string;
  number?: string | number;
  type?: string;
  trkseg?: Array<{ trkpt: Point[] }>;
  [key: string]: any;
};
