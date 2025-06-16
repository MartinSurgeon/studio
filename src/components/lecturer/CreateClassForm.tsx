"use client";

import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useAppContext } from '@/contexts/AppContext';
import type { Class, GeoLocation, VerificationMethod } from '@/lib/types';
import { DEFAULT_DISTANCE_THRESHOLD, LECTURER_MOCK_ID } from '@/config';
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, MapPin, Loader2, Navigation } from 'lucide-react';
import { classService } from '@/lib/services/class.service';
import { Controller } from 'react-hook-form';

const classFormSchema = z.object({
  name: z.string().min(3, 'Class name must be at least 3 characters'),
  useLocation: z.boolean(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  distanceThreshold: z.string().optional(),
  scheduleType: z.enum(['one-time', 'daily', 'weekly', 'custom']),
  durationMinutes: z.string().min(1, 'Duration is required'),
  gracePeriodMinutes: z.string().min(1, 'Grace period is required'),
  autoStart: z.boolean(),
  autoEnd: z.boolean(),
  // Recurrence pattern fields (optional, only for custom)
  recurrenceFrequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  recurrenceInterval: z.string().optional(),
  recurrenceDaysOfWeek: z.array(z.number()).optional(),
  recurrenceDaysOfMonth: z.array(z.number()).optional(),
  recurrenceEndDate: z.string().optional(),
  recurrenceOccurrences: z.string().optional(),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
}).refine(data => {
  if (data.useLocation) {
    return !!data.latitude && !!data.longitude && !isNaN(parseFloat(data.latitude)) && !isNaN(parseFloat(data.longitude));
  }
  return true;
}, {
  message: 'Latitude and Longitude are required if location verification is enabled and must be valid numbers.',
  path: ['latitude'], // Show error on latitude field
});

type ClassFormData = z.infer<typeof classFormSchema>;

interface CreateClassFormProps {
  onClassCreated: (newClass: Class) => void;
}

const VERIFICATION_METHODS: { key: VerificationMethod; label: string }[] = [
  { key: 'QR', label: 'QR Code' },
  { key: 'Location', label: 'Location' },
  { key: 'Biometric', label: 'Biometric' },
  { key: 'Facial', label: 'Facial Recognition' },
  { key: 'NFC', label: 'NFC' },
  { key: 'Manual', label: 'Manual' },
];

export default function CreateClassForm({ onClassCreated }: CreateClassFormProps) {
  const { classes, setClasses, user } = useAppContext();
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedMethods, setSelectedMethods] = useState<VerificationMethod[]>(['QR']);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors }, control } = useForm<ClassFormData>({
    resolver: zodResolver(classFormSchema),
  });

  const useLocationValue = watch('useLocation');
  const scheduleTypeValue = watch('scheduleType');
  const recurrenceFrequency = watch('recurrenceFrequency');
  const recurrenceDaysOfWeek = watch('recurrenceDaysOfWeek');
  const recurrenceDaysOfMonth = watch('recurrenceDaysOfMonth');
  const recurrenceEndDate = watch('recurrenceEndDate');

  // ADDED: Log errors for debugging
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log("Form Errors:", errors);
    }
  }, [errors]);

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

  // Function to safely dispatch class created event
  const dispatchClassCreatedEvent = (newClass: Class) => {
    // Only run this on the client side
    if (typeof window !== 'undefined') {
      // Use requestAnimationFrame to ensure this runs after hydration
      requestAnimationFrame(() => {
        const classEvent = new CustomEvent('class-updated', {
          detail: {
            classId: newClass.id,
            active: newClass.active,
            isNewClass: true
          }
        });
        window.dispatchEvent(classEvent);
        console.log('CreateClassForm: Dispatched class-updated event for new class', newClass.id);
      });
    }
  };

  const onSubmit: SubmitHandler<ClassFormData> = async (data) => {
    console.log("CreateClassForm: Attempting onSubmit", { data, errors });
    if (!user || !user.id) {
      toast({ 
        title: "Authentication Error", 
        description: "You must be logged in to create a class", 
        variant: "destructive" 
      });
      return;
    }
    
    if (selectedMethods.length === 0) {
      toast({ title: "Select Verification Method", description: "Please select at least one verification method.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create class object with proper lecturer ID
      const classData: Omit<Class, 'id'> = {
        name: data.name,
        lecturerId: user.id, // Use actual user ID instead of mock ID
        active: false,
        startTime: data.startTime,
        endTime: data.endTime,
        distanceThreshold: data.distanceThreshold ? parseInt(data.distanceThreshold, 10) : DEFAULT_DISTANCE_THRESHOLD,
        scheduleType: data.scheduleType,
        durationMinutes: parseInt(data.durationMinutes, 10),
        gracePeriodMinutes: parseInt(data.gracePeriodMinutes, 10),
        autoStart: data.autoStart,
        autoEnd: data.autoEnd,
        recurrencePattern: data.scheduleType === 'custom' ? {
          frequency: data.recurrenceFrequency || 'weekly',
          interval: data.recurrenceInterval ? parseInt(data.recurrenceInterval, 10) : 1,
          daysOfWeek: data.recurrenceFrequency === 'weekly' ? (data.recurrenceDaysOfWeek || []) : undefined,
          daysOfMonth: data.recurrenceFrequency === 'monthly' ? (data.recurrenceDaysOfMonth || []) : undefined,
          endDate: data.recurrenceEndDate || undefined,
          occurrences: data.recurrenceOccurrences ? parseInt(data.recurrenceOccurrences, 10) : undefined,
        } : undefined,
        verification_methods: selectedMethods,
        createdAt: new Date().toISOString(),
      };

      if (data.useLocation && data.latitude && data.longitude) {
        classData.location = {
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
        };
        classData.distanceThreshold = data.distanceThreshold ? parseInt(data.distanceThreshold, 10) : DEFAULT_DISTANCE_THRESHOLD;
      }
      
      // Save to Supabase
      const savedClass = await classService.createClass(classData);
      
      if (!savedClass) {
        throw new Error("Failed to save class to database");
      }
      
      // Update local state
      onClassCreated(savedClass);
      toast({ title: "Class Created", description: `"${data.name}" has been successfully created and saved.` });
      
      // Notify students about new class
      dispatchClassCreatedEvent(savedClass);
      
      reset();
      setFormError(null);
    } catch (error) {
      console.error("Error creating class:", error);
      setFormError(error instanceof Error ? error.message : "An unknown error occurred");
      toast({ 
        title: "Error Creating Class", 
        description: error instanceof Error ? error.message : "An unknown error occurred", 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-lg shadow-lg max-h-[90vh] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl">
          <PlusCircle className="mr-2 h-6 w-6 text-primary" /> Create New Class
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
        <CardContent className="space-y-6 overflow-y-auto flex-1">
          {/* Error message area */}
          {formError && (
            <div className="bg-destructive/10 border border-destructive text-destructive rounded p-2 mb-2 text-sm">
              {formError}
            </div>
          )}
          {/* ADDED: General error display */}
          {Object.keys(errors).length > 0 && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Form Validation Errors:</strong>
              <ul className="mt-2 list-disc list-inside">
                {Object.entries(errors).map(([key, error]) => (
                  <li key={key} className="text-sm">
                    <span className="font-medium">{key}:</span> {error?.message || 'Invalid value'}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Class Name</Label>
            <Input id="name" {...register('name')} className={errors.name ? 'border-destructive' : ''} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="useLocation" {...register('useLocation')} checked={useLocationValue} onCheckedChange={(checked) => {
               setValue('useLocation', !!checked);
               if (!checked) {
                // If user is unchecking Location, ensure other methods exist
                const methodsWithoutLocation = selectedMethods.filter(m => m !== 'Location');
                if (methodsWithoutLocation.length === 0) {
                  toast({ title: "Verification Method Required", description: "At least one verification method must be selected.", variant: "destructive" });
                  setValue('useLocation', true); // Revert checkbox state
                  // Also re-add 'Location' to selectedMethods if it was the only one
                  if (!selectedMethods.includes('Location')) {
                    setSelectedMethods((prev) => [...prev, 'Location']);
                  }
                  return;
                }
                setValue('latitude', '');
                setValue('longitude', '');
                setValue('distanceThreshold', DEFAULT_DISTANCE_THRESHOLD.toString());
                 setSelectedMethods((prev) => prev.filter((method) => method !== 'Location'));
              } else {
                 setSelectedMethods((prev) => { 
                    if (!prev.includes('Location')) { return [...prev, 'Location']; } 
                    return prev; 
                  });
              }
            }} />
            <Label htmlFor="useLocation" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Enable Location Verification
            </Label>
          </div>

          {useLocationValue && (
            <div className="space-y-4 p-4 border rounded-md bg-muted/50">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between text-primary font-medium mb-2 gap-2">
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2"/> Location Details
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={handleGetCurrentLocation}
                  disabled={isGettingLocation}
                  className="h-8 w-full md:w-auto"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    {...register('latitude')}
                    placeholder="e.g., 5.6037"
                    className={errors.latitude ? 'border-destructive' : ''}
                  />
                  {errors.latitude && <p className="text-sm text-destructive">{errors.latitude.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    {...register('longitude')}
                    placeholder="e.g., -0.1870"
                    className={errors.longitude ? 'border-destructive' : ''}
                  />
                  {errors.longitude && <p className="text-sm text-destructive">{errors.longitude.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="distanceThreshold">Distance Threshold (meters)</Label>
                <Input
                  id="distanceThreshold"
                  type="number"
                  min={1}
                  {...register('distanceThreshold')}
                  placeholder={DEFAULT_DISTANCE_THRESHOLD.toString()}
                  className={errors.distanceThreshold ? 'border-destructive' : ''}
                />
                {errors.distanceThreshold && <p className="text-sm text-destructive">{errors.distanceThreshold.message}</p>}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="scheduleType">Schedule Type</Label>
            <select id="scheduleType" {...register('scheduleType')} className="w-full border rounded px-2 py-1">
              <option value="one-time">One Time</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Recurrence Pattern Fields (only for custom) */}
          {scheduleTypeValue === 'custom' && (
            <div className="space-y-4 p-4 border rounded-md bg-muted/50">
              <div className="space-y-2">
                <Label>Recurrence Pattern</Label>
                <select {...register('recurrenceFrequency')} className="w-full border rounded px-2 py-1">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Repeat every</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    {...register('recurrenceInterval')}
                    className="w-20"
                  />
                  <span>{recurrenceFrequency === 'daily' ? 'days' : recurrenceFrequency === 'weekly' ? 'weeks' : 'months'}</span>
                </div>
              </div>
              {recurrenceFrequency === 'weekly' && (
                <div className="space-y-2">
                  <Label>Repeat on</Label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
                      <div key={day} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          value={index}
                          checked={recurrenceDaysOfWeek?.includes(index)}
                          onChange={e => {
                            const checked = e.target.checked;
                            const value = parseInt(e.target.value, 10);
                            let newDays = recurrenceDaysOfWeek ? [...recurrenceDaysOfWeek] : [];
                            if (checked) {
                              newDays.push(value);
                            } else {
                              newDays = newDays.filter(d => d !== value);
                            }
                            setValue('recurrenceDaysOfWeek', newDays);
                          }}
                        />
                        <Label>{day}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {recurrenceFrequency === 'monthly' && (
                <div className="space-y-2">
                  <Label>Repeat on days</Label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <div key={day} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          value={day}
                          checked={recurrenceDaysOfMonth?.includes(day)}
                          onChange={e => {
                            const checked = e.target.checked;
                            const value = parseInt(e.target.value, 10);
                            let newDays = recurrenceDaysOfMonth ? [...recurrenceDaysOfMonth] : [];
                            if (checked) {
                              newDays.push(value);
                            } else {
                              newDays = newDays.filter(d => d !== value);
                            }
                            setValue('recurrenceDaysOfMonth', newDays);
                          }}
                        />
                        <Label>{day}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>End Date (Optional)</Label>
                <Input
                  type="date"
                  {...register('recurrenceEndDate')}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>Occurrences (Optional)</Label>
                <Input
                  type="number"
                  min={1}
                  {...register('recurrenceOccurrences')}
                  placeholder="Number of occurrences"
                  className="w-full"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="durationMinutes">Duration (minutes)</Label>
              <Input id="durationMinutes" type="number" min={15} max={480} {...register('durationMinutes')} className="w-full" />
              {errors.durationMinutes && <p className="text-sm text-destructive">{errors.durationMinutes.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="gracePeriodMinutes">Grace Period (minutes)</Label>
              <Input id="gracePeriodMinutes" type="number" min={0} max={60} {...register('gracePeriodMinutes')} className="w-full" />
              {errors.gracePeriodMinutes && <p className="text-sm text-destructive">{errors.gracePeriodMinutes.message}</p>}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <div className="flex items-center space-x-2">
              <Controller
                name="autoStart"
                control={control}
                render={({ field }) => (
                  <>
                    <Checkbox
                      id="autoStart"
                      checked={!!field.value}
                      onCheckedChange={(checked) => field.onChange(!!checked)}
                    />
                    <Label htmlFor="autoStart">Auto-start class at scheduled time</Label>
                  </>
                )}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Controller
                name="autoEnd"
                control={control}
                render={({ field }) => (
                  <>
                    <Checkbox
                      id="autoEnd"
                      checked={!!field.value}
                      onCheckedChange={(checked) => field.onChange(!!checked)}
                    />
                    <Label htmlFor="autoEnd">Auto-end class after duration</Label>
                  </>
                )}
              />
            </div>
          </div>

          {/* Verification Methods */}
          <div>
            <Label className="mb-2 block font-semibold">Verification Methods</Label>
            <div className="flex flex-wrap gap-4">
              {VERIFICATION_METHODS.map((method) => (
                <label key={method.key} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selectedMethods.includes(method.key)}
                    onCheckedChange={(checked) => {
                      if (method.key === 'Location') {
                        // This will trigger the useLocation checkbox's onCheckedChange, 
                        // which now contains the logic to prevent empty selectedMethods
                        setValue('useLocation', !!checked);
                         if (!checked) {
                            setValue('latitude', '');
                            setValue('longitude', '');
                            setValue('distanceThreshold', DEFAULT_DISTANCE_THRESHOLD.toString());
                             setSelectedMethods((prev) => prev.filter((m) => m !== 'Location'));
                         } else {
                             setSelectedMethods((prev) => { 
                                if (!prev.includes('Location')) { return [...prev, 'Location']; } 
                                return prev; 
                              });
                         }
                      } else {
                        // For non-Location methods: prevent unchecking if it's the last one
                        if (!checked) {
                          const methodsAfterRemoval = selectedMethods.filter(m => m !== method.key);
                          if (methodsAfterRemoval.length === 0) {
                             toast({ title: "Verification Method Required", description: "At least one verification method must be selected.", variant: "destructive" });
                             return; // Prevent unchecking
                          }
                        }
                        setSelectedMethods((prev) =>
                          checked
                            ? [...prev, method.key]
                            : prev.filter((m) => m !== method.key)
                        );
                      }
                    }}
                    disabled={method.key === 'Location' && useLocationValue}
                  />
                  <span>{method.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="datetime-local"
                {...register('startTime')}
                className={errors.startTime ? 'border-destructive' : ''}
              />
              {errors.startTime && <p className="text-sm text-destructive">{errors.startTime.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="datetime-local"
                {...register('endTime')}
                className={errors.endTime ? 'border-destructive' : ''}
              />
              {errors.endTime && <p className="text-sm text-destructive">{errors.endTime.message}</p>}
            </div>
          </div>
        </CardContent>
        <CardFooter className="sticky bottom-0 left-0 right-0 bg-background z-10 border-t p-4">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Creating Class...
              </>
            ) : (
              <>
                <PlusCircle className="mr-2 h-5 w-5" /> Create Class
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
