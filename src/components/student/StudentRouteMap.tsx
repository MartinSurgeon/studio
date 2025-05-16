"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, CornerDownRight, RefreshCw } from 'lucide-react';
import LoadingSpinner from '@/components/core/LoadingSpinner';
import type { GeoLocation } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface StudentRouteMapProps {
  classLocation?: GeoLocation;
  currentLocation?: GeoLocation;
  distanceToClass?: number;
  distanceThreshold?: number;
  onUpdateLocation?: (newLocation: GeoLocation) => void;
}

export default function StudentRouteMap({
  classLocation,
  currentLocation,
  distanceToClass,
  distanceThreshold = 100,
  onUpdateLocation
}: StudentRouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const classMarkerRef = useRef<google.maps.Marker | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const locationHistoryRef = useRef<GeoLocation[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const { toast } = useToast();

  // Function to initialize Google Maps
  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google || !window.google.maps) {
      setMapError("Google Maps failed to load");
      setIsLoading(false);
      return;
    }

    try {
      // Initialize map centered on class location or current location
      const center = classLocation 
        ? { lat: classLocation.latitude, lng: classLocation.longitude }
        : currentLocation 
          ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
          : { lat: 0, lng: 0 };

      const mapOptions: google.maps.MapOptions = {
        center,
        zoom: 16,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
        zoomControl: true,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      };

      // Create the map
      const map = new google.maps.Map(mapRef.current, mapOptions);
      mapInstanceRef.current = map;

      // Create markers for class and student locations
      if (classLocation) {
        const classMarker = new google.maps.Marker({
          position: { lat: classLocation.latitude, lng: classLocation.longitude },
          map,
          title: "Class Location",
          icon: {
            url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png"
          }
        });
        
        // Add circle to represent the distance threshold
        new google.maps.Circle({
          strokeColor: "#FF0000",
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: "#FF0000",
          fillOpacity: 0.1,
          map,
          center: { lat: classLocation.latitude, lng: classLocation.longitude },
          radius: distanceThreshold // in meters
        });
        
        classMarkerRef.current = classMarker;

        // Add info window to class marker
        const infowindow = new google.maps.InfoWindow({
          content: `<div><strong>Class Location</strong><br>Must be within ${distanceThreshold}m</div>`
        });
        
        classMarker.addListener('click', () => {
          infowindow.open(map, classMarker);
        });
      }

      // Create student marker if we have current location
      if (currentLocation) {
        const studentMarker = new google.maps.Marker({
          position: { lat: currentLocation.latitude, lng: currentLocation.longitude },
          map,
          title: "Your Location",
          animation: google.maps.Animation.DROP,
          icon: {
            url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
          }
        });
        
        markerRef.current = studentMarker;
        
        // Add student location to history
        locationHistoryRef.current = [currentLocation];
        
        // Draw route between student and class if both exist
        if (classLocation) {
          // Create route polyline
          const directionsService = new google.maps.DirectionsService();
          const directionsRenderer = new google.maps.DirectionsRenderer({
            map,
            suppressMarkers: true, // Don't show default markers
            polylineOptions: {
              strokeColor: "#4285F4",
              strokeWeight: 5,
              strokeOpacity: 0.7
            }
          });
          
          directionsRendererRef.current = directionsRenderer;
          
          // Request directions
          directionsService.route({
            origin: { lat: currentLocation.latitude, lng: currentLocation.longitude },
            destination: { lat: classLocation.latitude, lng: classLocation.longitude },
            travelMode: google.maps.TravelMode.WALKING
          }, (response, status) => {
            if (status === 'OK' && response) {
              directionsRenderer.setDirections(response);
              
              // Add distance info
              const leg = response.routes[0].legs[0];
              if (leg) {
                toast({
                  title: "Route Found",
                  description: `Distance: ${leg.distance?.text}, Time: ${leg.duration?.text}`,
                });
              }
            } else {
              console.error('Directions request failed due to', status);
              // Create a simple polyline instead
              createDirectLine();
            }
          });
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError("Failed to initialize map");
      setIsLoading(false);
    }
  }, [classLocation, currentLocation, distanceThreshold, toast]);
  
  // Create a direct line between student and class location
  const createDirectLine = useCallback(() => {
    if (!mapInstanceRef.current || !classLocation || !currentLocation) return;
    
    // Remove existing polyline if any
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }
    
    // Create a new polyline
    const polyline = new google.maps.Polyline({
      path: [
        { lat: currentLocation.latitude, lng: currentLocation.longitude },
        { lat: classLocation.latitude, lng: classLocation.longitude }
      ],
      geodesic: true,
      strokeColor: '#4285F4',
      strokeOpacity: 0.7,
      strokeWeight: 3
    });
    
    polyline.setMap(mapInstanceRef.current);
    polylineRef.current = polyline;
  }, [classLocation, currentLocation]);

  // Load Google Maps API
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Create a global callback function
    const callbackName = 'initGoogleMapsCallback';
    (window as any)[callbackName] = () => {
      if (window.google && window.google.maps) {
        initializeMap();
      }
    };

    // Check if Google Maps script is already loaded
    if (window.google && window.google.maps) {
      initializeMap();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector(`script[src*="maps.googleapis.com/maps/api/js"]`);
    if (existingScript) {
      return;
    }

    // Load Google Maps API script
    const loadGoogleMapsApi = () => {
      const script = document.createElement('script');
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

      if (!apiKey) {
        console.error('Google Maps API key is not configured');
        setMapError("Google Maps API key is not configured. Please check your environment variables.");
        return;
      }

      // Create a loader script first
      const loaderScript = document.createElement('script');
      loaderScript.textContent = `
        (g=>{var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement("script"));e.set("libraries",[...r]+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);e.set("callback",c+".maps."+q);a.src=\`https://maps.\${c}apis.com/maps/api/js?\`+e;d[q]=f;a.onerror=()=>h=n(Error(p+" could not load."));a.nonce=m.querySelector("script[nonce]")?.nonce||"";m.head.append(a)}));d[l]?console.warn(p+" only loads once. Ignoring:",g):d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})({
          key: "${apiKey}",
          v: "weekly"
        });
      `;
      document.head.appendChild(loaderScript);

      // Then load the required libraries
      const initMap = async () => {
        try {
          const { Map } = await google.maps.importLibrary("maps") as google.maps.MapsLibrary;
          const { DirectionsService, DirectionsRenderer } = await google.maps.importLibrary("routes") as google.maps.RoutesLibrary;
          const { Marker } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
          const { Circle } = await google.maps.importLibrary("geometry") as google.maps.GeometryLibrary;
          
          // Once libraries are loaded, initialize the map
          initializeMap();
        } catch (error) {
          console.error('Error loading Google Maps libraries:', error);
          setMapError("Failed to load Google Maps. Please check your internet connection and try again.");
        }
      };

      // Start loading the map
      initMap();
    };

    loadGoogleMapsApi();

    // Cleanup
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      // Clean up the global callback
      delete (window as any)[callbackName];
    };
  }, [initializeMap, watchId]);

  // Update map when locations change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    
    // Update student marker position
    if (markerRef.current && currentLocation) {
      markerRef.current.setPosition({
        lat: currentLocation.latitude,
        lng: currentLocation.longitude
      });
      
      // Store location in history
      locationHistoryRef.current.push(currentLocation);
      
      // Recenter map if tracking is enabled
      if (isTracking) {
        mapInstanceRef.current.panTo({
          lat: currentLocation.latitude,
          lng: currentLocation.longitude
        });
      }
      
      // Update route if class location exists
      if (classLocation) {
        if (directionsRendererRef.current) {
          // Try to update directions if we have a directions renderer
          const directionsService = new google.maps.DirectionsService();
          directionsService.route({
            origin: { lat: currentLocation.latitude, lng: currentLocation.longitude },
            destination: { lat: classLocation.latitude, lng: classLocation.longitude },
            travelMode: google.maps.TravelMode.WALKING
          }, (response, status) => {
            if (status === 'OK' && response && directionsRendererRef.current) {
              directionsRendererRef.current.setDirections(response);
            } else {
              // Fall back to direct line
              createDirectLine();
            }
          });
        } else {
          // Just update the direct line
          createDirectLine();
        }
      }
      
      // Draw path of where student has walked
      if (locationHistoryRef.current.length > 1 && mapInstanceRef.current) {
        // Remove old path polyline
        if (polylineRef.current) {
          polylineRef.current.setMap(null);
        }
        
        // Create path from location history
        const pathCoords = locationHistoryRef.current.map(loc => ({
          lat: loc.latitude,
          lng: loc.longitude
        }));
        
        const polyline = new google.maps.Polyline({
          path: pathCoords,
          geodesic: true,
          strokeColor: '#2563EB',
          strokeOpacity: 0.8,
          strokeWeight: 3
        });
        
        polyline.setMap(mapInstanceRef.current);
        polylineRef.current = polyline;
      }
    }
  }, [currentLocation, classLocation, isTracking, createDirectLine]);

  // Start location tracking
  const startTracking = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation Error",
        description: "Your browser doesn't support geolocation tracking",
        variant: "destructive"
      });
      return;
    }
    
    // Set tracking state
    setIsTracking(true);
    
    // Start watching position
    const id = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation: GeoLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        
        // Call the callback if provided
        if (onUpdateLocation) {
          onUpdateLocation(newLocation);
        }
      },
      (error) => {
        console.error('Error tracking location:', error);
        toast({
          title: "Tracking Error",
          description: `Could not track your location: ${error.message}`,
          variant: "destructive"
        });
        
        // Stop tracking on error
        stopTracking();
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000
      }
    );
    
    setWatchId(id);
    
    toast({
      title: "Tracking Started",
      description: "Your location is now being tracked in real-time"
    });
  };

  // Stop location tracking
  const stopTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    
    setIsTracking(false);
    
    toast({
      title: "Tracking Stopped",
      description: "Location tracking has been stopped"
    });
  };

  // Recenter map on class or current location
  const recenterMap = () => {
    if (!mapInstanceRef.current) return;
    
    if (classLocation && currentLocation) {
      // Create bounds that include both points
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: classLocation.latitude, lng: classLocation.longitude });
      bounds.extend({ lat: currentLocation.latitude, lng: currentLocation.longitude });
      
      // Add some padding for better visibility
      mapInstanceRef.current.fitBounds(bounds, 50);
    } else if (classLocation) {
      mapInstanceRef.current.panTo({ lat: classLocation.latitude, lng: classLocation.longitude });
      mapInstanceRef.current.setZoom(16);
    } else if (currentLocation) {
      mapInstanceRef.current.panTo({ lat: currentLocation.latitude, lng: currentLocation.longitude });
      mapInstanceRef.current.setZoom(16);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Route to Class</CardTitle>
          {distanceToClass !== undefined && (
            <Badge variant={distanceToClass <= distanceThreshold ? "secondary" : "destructive"} className="ml-2">
              {distanceToClass <= distanceThreshold 
                ? `${Math.round(distanceToClass)}m (In Range)` 
                : `${Math.round(distanceToClass)}m (Out of Range)`}
            </Badge>
          )}
        </div>
        <CardDescription>
          {isTracking ? 'Real-time tracking active' : 'View your path to class'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px]">
            <LoadingSpinner text="Loading map..." />
          </div>
        ) : mapError ? (
          <div className="flex flex-col items-center justify-center h-[300px] bg-muted rounded-md">
            <MapPin className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">{mapError}</p>
            <p className="text-sm text-muted-foreground mt-2">Check internet connection or try refreshing</p>
          </div>
        ) : (
          <>
            <div ref={mapRef} className="w-full h-[300px] rounded-md mb-3" />
            <div className="flex flex-wrap gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={recenterMap}>
                <Navigation className="mr-1 h-4 w-4" /> Recenter
              </Button>
              {!isTracking ? (
                <Button variant="default" size="sm" onClick={startTracking}>
                  <MapPin className="mr-1 h-4 w-4" /> Start Tracking
                </Button>
              ) : (
                <Button variant="destructive" size="sm" onClick={stopTracking}>
                  <CornerDownRight className="mr-1 h-4 w-4" /> Stop Tracking
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  // Reset location history
                  locationHistoryRef.current = [];
                  if (currentLocation) {
                    locationHistoryRef.current.push(currentLocation);
                  }
                  // Remove polyline
                  if (polylineRef.current) {
                    polylineRef.current.setMap(null);
                    polylineRef.current = null;
                  }
                  toast({
                    title: "Route Reset",
                    description: "Your route history has been cleared"
                  });
                }}
              >
                <RefreshCw className="mr-1 h-4 w-4" /> Reset Route
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
} 