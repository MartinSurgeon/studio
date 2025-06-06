"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, CornerDownRight, RefreshCw } from 'lucide-react';
import LoadingSpinner from '@/components/core/LoadingSpinner';
import type { GeoLocation } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { GoogleMap, Circle, useJsApiLoader, DirectionsRenderer, Polyline, DirectionsService } from '@react-google-maps/api';

interface StudentRouteMapProps {
  classLocation?: GeoLocation;
  currentLocation?: GeoLocation;
  distanceToClass?: number;
  distanceThreshold?: number;
  onUpdateLocation?: (newLocation: GeoLocation) => void;
  onClose?: () => void;
}

const mapContainerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '0.5rem',
};

// Move libraries array outside the component to avoid performance warning
const GOOGLE_MAPS_LIBRARIES = ['places', 'geometry', 'routes'] as any;

// Helper to calculate distance between two lat/lng points in meters
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000; // meters
  const toRad = (deg: number) => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function StudentRouteMap({
  classLocation,
  currentLocation,
  distanceToClass,
  distanceThreshold = 100,
  onUpdateLocation,
  onClose
}: StudentRouteMapProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [directionsRequest, setDirectionsRequest] = useState<any | null>(null);
  const [locationHistory, setLocationHistory] = useState<GeoLocation[]>([]);
  const { toast } = useToast();

  // NEW: Google Maps API loader
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const classMarkerRef = useRef<any>(null);
  const studentMarkerRef = useRef<any>(null);

  // Map center
      const center = classLocation 
        ? { lat: classLocation.latitude, lng: classLocation.longitude }
        : currentLocation 
          ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
      : { lat: 7.9465, lng: -1.0232 }; // Default to Ghana center

  // Recenter map
  const recenterMap = () => {
    if (mapRef.current) {
      mapRef.current.panTo(center);
    }
  };

  // Update directions request when locations change
  useEffect(() => {
    if (
      currentLocation &&
      classLocation &&
      (currentLocation.latitude !== classLocation.latitude ||
        currentLocation.longitude !== classLocation.longitude)
    ) {
      const dist = haversineDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        classLocation.latitude,
        classLocation.longitude
      );
      if (dist < 15) {
        setDirectionsRequest(null);
        toast({
          title: "You are already at the class location!",
          description: `Distance: ${dist.toFixed(1)} meters. No route needed.`,
          variant: "default"
        });
        return;
      }
      console.log('Origin:', currentLocation, 'Destination:', classLocation);
      setDirectionsRequest({
            origin: { lat: currentLocation.latitude, lng: currentLocation.longitude },
            destination: { lat: classLocation.latitude, lng: classLocation.longitude },
        travelMode: 'WALKING',
      });
            } else {
      setDirectionsRequest(null);
    }
  }, [currentLocation, classLocation]);

  // Track location history for path
  useEffect(() => {
    if (currentLocation) {
      setLocationHistory((prev) => {
        if (prev.length === 0 || prev[prev.length - 1].latitude !== currentLocation.latitude || prev[prev.length - 1].longitude !== currentLocation.longitude) {
          return [...prev, currentLocation];
        }
        return prev;
      });
    }
  }, [currentLocation]);

  // Reset route
  const resetRoute = () => {
    setLocationHistory(currentLocation ? [currentLocation] : []);
    toast({
      title: "Route Reset",
      description: "Your route history has been cleared"
    });
  };

  // Tracking logic (unchanged)
  // NOTE: onUpdateLocation must update currentLocation in the parent for tracking to work
  const startTracking = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation Error",
        description: "Your browser doesn't support geolocation tracking",
        variant: "destructive"
      });
      return;
    }
    setIsTracking(true);
    const id = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation: GeoLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        if (onUpdateLocation) {
          // Parent must update currentLocation state for map to update
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

  // Add advanced markers when map and locations are ready
  useEffect(() => {
    if (!isLoaded || !window.google || !window.google.maps || !window.google.maps.marker || !mapRef.current) return;
    // Remove previous markers
    if (classMarkerRef.current) {
      classMarkerRef.current.map = null;
      classMarkerRef.current = null;
    }
    if (studentMarkerRef.current) {
      studentMarkerRef.current.map = null;
      studentMarkerRef.current = null;
    }
    // Add class marker
    if (classLocation) {
      classMarkerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current,
        position: { lat: classLocation.latitude, lng: classLocation.longitude },
        title: 'Class Location',
      });
    }
    // Add student marker
    if (currentLocation) {
      studentMarkerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current,
        position: { lat: currentLocation.latitude, lng: currentLocation.longitude },
        title: 'Your Location',
      });
    }
    // Cleanup on unmount
    return () => {
      if (classMarkerRef.current) {
        classMarkerRef.current.map = null;
        classMarkerRef.current = null;
      }
      if (studentMarkerRef.current) {
        studentMarkerRef.current.map = null;
        studentMarkerRef.current = null;
      }
    };
  }, [isLoaded, classLocation, currentLocation]);

  const lastRouteRef = useRef<{ distance: string | null, duration: string | null }>({ distance: null, duration: null });

  // Loading and error states
  if (loadError) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Route to Class</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[300px] bg-muted rounded-md">
            <MapPin className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Google Maps failed to load</p>
            <p className="text-sm text-muted-foreground mt-2">Check internet connection or try refreshing</p>
          </div>
        </CardContent>
      </Card>
    );
  }

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
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="ml-2">
              Close
            </Button>
          )}
        </div>
        <CardDescription>
          {isTracking ? 'Real-time tracking active' : 'View your path to class'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative w-full h-[300px] rounded-md mb-3">
          {!isLoaded ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <LoadingSpinner text="Loading map..." />
          </div>
          ) : (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={center}
              zoom={16}
              options={{
                mapTypeId: 'roadmap',
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
              }}
              onLoad={map => { mapRef.current = map; }}
            >
              {/* Class location circle */}
              {classLocation && (
                <Circle
                  center={{ lat: classLocation.latitude, lng: classLocation.longitude }}
                  radius={distanceThreshold}
                  options={{
                    strokeColor: "#FF0000",
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillColor: "#FF0000",
                    fillOpacity: 0.1,
                  }}
                />
              )}
              {/* Route directions */}
              {directionsRequest && (
                <DirectionsService
                  options={directionsRequest}
                  callback={(result, status) => {
                    if (status === 'OK' && result) {
                      setDirections(result);
                      const leg = result.routes[0].legs[0];
                      if (leg) {
                        const distance = leg.distance?.text;
                        const duration = leg.duration?.text;
                        if (
                          lastRouteRef.current.distance !== distance ||
                          lastRouteRef.current.duration !== duration
                        ) {
                          lastRouteRef.current = { distance: distance ?? null, duration: duration ?? null };
                        toast({
                          title: "Route Found",
                            description: `Distance: ${distance}, Time: ${duration}`,
                        });
                        }
                      }
                    } else {
                      setDirections(null);
                      toast({
                        title: "No Route Found",
                        description: "Could not find a walking route between your location and the class.",
                        variant: "destructive"
                      });
                    }
                  }}
                />
              )}
              {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: true, polylineOptions: { strokeColor: "#4285F4", strokeWeight: 5, strokeOpacity: 0.7 } }} />}
              {/* Path polyline */}
              {locationHistory.length > 1 && (
                <Polyline
                  path={locationHistory.map(loc => ({ lat: loc.latitude, lng: loc.longitude }))}
                  options={{
                    geodesic: true,
                    strokeColor: '#2563EB',
                    strokeOpacity: 0.8,
                    strokeWeight: 3,
                  }}
                />
              )}
            </GoogleMap>
          )}
          </div>
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
            onClick={resetRoute}
              >
                <RefreshCw className="mr-1 h-4 w-4" /> Reset Route
              </Button>
            </div>
      </CardContent>
    </Card>
  );
}