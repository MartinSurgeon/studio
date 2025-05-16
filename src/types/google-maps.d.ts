declare namespace google.maps {
  class Map {
    constructor(mapDiv: Element, opts?: MapOptions);
    panTo(latLng: LatLng | LatLngLiteral): void;
    setZoom(zoom: number): void;
    fitBounds(bounds: LatLngBounds, padding?: number): void;
  }
  
  class Marker {
    constructor(opts?: MarkerOptions);
    setPosition(latLng: LatLng | LatLngLiteral): void;
    setMap(map: Map | null): void;
    addListener(eventName: string, handler: Function): MapsEventListener;
  }
  
  class Polyline {
    constructor(opts?: PolylineOptions);
    setMap(map: Map | null): void;
  }
  
  class Circle {
    constructor(opts?: CircleOptions);
  }
  
  class LatLngBounds {
    constructor();
    extend(latLng: LatLng | LatLngLiteral): void;
  }
  
  class InfoWindow {
    constructor(opts?: InfoWindowOptions);
    open(map?: Map, anchor?: any): void;
  }
  
  class DirectionsService {
    route(request: DirectionsRequest, callback: (result: DirectionsResult, status: string) => void): void;
  }
  
  class DirectionsRenderer {
    constructor(opts?: DirectionsRendererOptions);
    setMap(map: Map | null): void;
    setDirections(directions: DirectionsResult): void;
  }
  
  interface DirectionsResult {
    routes: DirectionsRoute[];
  }
  
  interface DirectionsRoute {
    legs: DirectionsLeg[];
  }
  
  interface DirectionsLeg {
    distance?: { text: string; value: number };
    duration?: { text: string; value: number };
  }
  
  interface DirectionsRequest {
    origin: string | LatLng | LatLngLiteral;
    destination: string | LatLng | LatLngLiteral;
    travelMode: TravelMode;
  }
  
  enum TravelMode {
    DRIVING = 'DRIVING',
    WALKING = 'WALKING',
    BICYCLING = 'BICYCLING',
    TRANSIT = 'TRANSIT'
  }
  
  interface DirectionsRendererOptions {
    map?: Map;
    suppressMarkers?: boolean;
    polylineOptions?: PolylineOptions;
  }
  
  interface PolylineOptions {
    path?: Array<LatLng | LatLngLiteral>;
    geodesic?: boolean;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeWeight?: number;
  }
  
  interface CircleOptions {
    center?: LatLng | LatLngLiteral;
    radius?: number;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeWeight?: number;
    fillColor?: string;
    fillOpacity?: number;
    map?: Map;
  }
  
  interface MarkerOptions {
    position: LatLng | LatLngLiteral;
    map?: Map;
    title?: string;
    animation?: Animation;
    icon?: string | Icon;
  }
  
  interface Icon {
    url: string;
    size?: Size;
    origin?: Point;
    anchor?: Point;
    scaledSize?: Size;
  }
  
  class Size {
    constructor(width: number, height: number);
  }
  
  class Point {
    constructor(x: number, y: number);
  }
  
  interface MapOptions {
    center?: LatLng | LatLngLiteral;
    zoom?: number;
    mapTypeId?: string;
    mapTypeControl?: boolean;
    fullscreenControl?: boolean;
    streetViewControl?: boolean;
    zoomControl?: boolean;
    styles?: MapTypeStyle[];
  }
  
  interface MapTypeStyle {
    featureType?: string;
    elementType?: string;
    stylers: MapTypeStyler[];
  }
  
  interface MapTypeStyler {
    visibility?: string;
    [key: string]: any;
  }
  
  class LatLng {
    constructor(lat: number, lng: number);
    lat(): number;
    lng(): number;
  }
  
  interface LatLngLiteral {
    lat: number;
    lng: number;
  }
  
  interface InfoWindowOptions {
    content?: string | Element;
    position?: LatLng | LatLngLiteral;
  }
  
  interface MapsEventListener {
    remove(): void;
  }
  
  namespace MapTypeId {
    const ROADMAP: string;
    const SATELLITE: string;
    const HYBRID: string;
    const TERRAIN: string;
  }
  
  enum Animation {
    DROP = 1,
    BOUNCE = 2
  }
  
  function importLibrary(libraryName: string): Promise<MapsLibrary | RoutesLibrary | MarkerLibrary | GeometryLibrary>;

  interface MapsLibrary {
    Map: typeof Map;
  }

  interface RoutesLibrary {
    DirectionsService: typeof DirectionsService;
    DirectionsRenderer: typeof DirectionsRenderer;
  }

  interface MarkerLibrary {
    Marker: typeof Marker;
  }

  interface GeometryLibrary {
    Circle: typeof Circle;
  }
} 