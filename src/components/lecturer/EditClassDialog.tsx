"use client";

import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { Class, GeoLocation } from '@/lib/types';
import { DEFAULT_DISTANCE_THRESHOLD } from '@/config';
import { useToast } from '@/hooks/use-toast';
import { Save, MapPin, Loader2, Navigation, AlertTriangle } from 'lucide-react';

const editClassFormSchema = z.object({
  name: z.string().min(3, 'Class name must be at least 3 characters'),
  useLocation: z.boolean().default(false),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  distanceThreshold: z.string().optional(),
}).refine(data => {
  if (data.useLocation) {
    return !!data.latitude && !!data.longitude && !isNaN(parseFloat(data.latitude)) && !isNaN(parseFloat(data.longitude));
  }
  return true;
}, {
  message: 'Latitude and Longitude are required if location verification is enabled and must be valid numbers.',
  path: ['latitude'], // Show error on latitude field
});

type EditClassFormData = z.infer<typeof editClassFormSchema>;

interface EditClassDialogProps {
  classInstance: Class;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateClass: (updatedClass: Class) => void;
}

export default function EditClassDialog({ classInstance, isOpen, onOpenChange, onUpdateClass }: EditClassDialogProps) {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const { toast } = useToast();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<EditClassFormData>({
    resolver: zodResolver(editClassFormSchema),
    defaultValues: {
      name: classInstance.name,
      useLocation: !!classInstance.location,
      latitude: classInstance.location?.latitude.toString() || '',
      longitude: classInstance.location?.longitude.toString() || '',
      distanceThreshold: classInstance.distanceThreshold.toString(),
    }
  });

  // Reset form values when the dialog is opened or class changes
  useEffect(() => {
    if (isOpen) {
      reset({
        name: classInstance.name,
        useLocation: !!classInstance.location,
        latitude: classInstance.location?.latitude.toString() || '',
        longitude: classInstance.location?.longitude.toString() || '',
        distanceThreshold: classInstance.distanceThreshold.toString(),
      });
    }
  }, [isOpen, classInstance, reset]);

  const useLocationValue = watch('useLocation');

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({ 
        title: "Geolocation Error", 
        description: "Geolocation is not supported by your browser", 
        variant: "destructive" 
      });
      return;
    }

    setIsGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue('latitude', position.coords.latitude.toString());
        setValue('longitude', position.coords.longitude.toString());
        
        toast({ 
          title: "Location Acquired", 
          description: `Your current location (${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}) has been set.`,
        });
        
        setIsGettingLocation(false);
      },
      (error) => {
        setIsGettingLocation(false);
        
        let errorMessage = "Unable to retrieve your location";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied. Please enable it in your browser settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "The request to get your location timed out.";
            break;
        }
        
        toast({ 
          title: "Geolocation Error", 
          description: errorMessage, 
          variant: "destructive" 
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const onSubmit: SubmitHandler<EditClassFormData> = (data) => {
    const updatedClass: Class = {
      ...classInstance,
      name: data.name,
      distanceThreshold: data.distanceThreshold ? parseInt(data.distanceThreshold, 10) : DEFAULT_DISTANCE_THRESHOLD,
    };

    if (data.useLocation && data.latitude && data.longitude) {
      updatedClass.location = {
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
      };
    } else {
      // Remove location if useLocation is false
      delete updatedClass.location;
    }
    
    onUpdateClass(updatedClass);
    toast({ title: "Class Updated", description: `"${data.name}" has been successfully updated.` });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Class</DialogTitle>
          <DialogDescription>
            Update class details and location settings.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Class Name</Label>
            <Input 
              id="edit-name" 
              {...register('name')} 
              placeholder="e.g., Introduction to AI" 
              className={errors.name ? 'border-destructive' : ''} 
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="edit-useLocation" 
              {...register('useLocation')} 
            />
            <Label htmlFor="edit-useLocation" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Enable Location Verification
            </Label>
          </div>

          {useLocationValue && (
            <div className="space-y-4 p-4 border rounded-md bg-muted/50">
              <div className="flex items-center justify-between text-primary font-medium mb-2">
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2"/> Location Details
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={handleGetCurrentLocation}
                  disabled={isGettingLocation}
                  className="h-8"
                >
                  {isGettingLocation ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Getting Location...
                    </>
                  ) : (
                    <>
                      <Navigation className="mr-2 h-4 w-4" />
                      Use Current Location
                    </>
                  )}
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-latitude">Latitude</Label>
                  <Input 
                    id="edit-latitude" 
                    type="number" 
                    step="any" 
                    {...register('latitude')} 
                    placeholder="e.g., 34.0522" 
                    className={errors.latitude ? 'border-destructive' : ''}
                  />
                  {errors.latitude && <p className="text-sm text-destructive">{errors.latitude.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-longitude">Longitude</Label>
                  <Input 
                    id="edit-longitude" 
                    type="number" 
                    step="any" 
                    {...register('longitude')} 
                    placeholder="e.g., -118.2437" 
                    className={errors.longitude ? 'border-destructive' : ''}
                  />
                  {errors.longitude && <p className="text-sm text-destructive">{errors.longitude.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-distanceThreshold">Distance Threshold (meters)</Label>
                <Input 
                  id="edit-distanceThreshold" 
                  type="number" 
                  {...register('distanceThreshold')} 
                  className={errors.distanceThreshold ? 'border-destructive' : ''} 
                />
                {errors.distanceThreshold && <p className="text-sm text-destructive">{errors.distanceThreshold.message}</p>}
              </div>
              
              {classInstance.active && (
                <div className="flex items-center p-3 mt-2 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
                  <AlertTriangle className="h-4 w-4 mr-2 text-yellow-600" />
                  <span className="text-xs">Changing location settings for an active class may affect students currently trying to mark attendance.</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 