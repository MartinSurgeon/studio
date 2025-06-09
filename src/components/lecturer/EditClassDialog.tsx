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
import type { Class, GeoLocation, VerificationMethod } from '@/lib/types';
import { DEFAULT_DISTANCE_THRESHOLD } from '@/config';
import { useToast } from '@/hooks/use-toast';
import { Save, MapPin, Loader2, Navigation, AlertTriangle, QrCode, Fingerprint, Camera, CreditCard, UserCheck } from 'lucide-react';

const editClassFormSchema = z.object({
  name: z.string().min(3, 'Class name must be at least 3 characters'),
  useLocation: z.boolean().default(false),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  distanceThreshold: z.string().optional(),
  scheduleType: z.enum(['one-time', 'daily', 'weekly', 'custom']).default('one-time'),
  durationMinutes: z.string().min(1, 'Duration is required'),
  gracePeriodMinutes: z.string().min(1, 'Grace period is required'),
  autoStart: z.boolean().default(false),
  autoEnd: z.boolean().default(false),
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
  path: ['latitude'],
});

type EditClassFormData = z.infer<typeof editClassFormSchema>;

interface EditClassDialogProps {
  classInstance: Class;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateClass: (updatedClass: Class) => void;
}

const VERIFICATION_METHODS: { key: VerificationMethod; label: string; icon: any }[] = [
  { key: 'QR', label: 'QR Code', icon: QrCode },
  { key: 'Location', label: 'Location', icon: MapPin },
  { key: 'Biometric', label: 'Biometric', icon: Fingerprint },
  { key: 'Facial', label: 'Facial Recognition', icon: Camera },
  { key: 'NFC', label: 'NFC', icon: CreditCard },
  { key: 'Manual', label: 'Manual', icon: UserCheck },
];

export default function EditClassDialog({ classInstance, isOpen, onOpenChange, onUpdateClass }: EditClassDialogProps) {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const { toast } = useToast();
  const [selectedMethods, setSelectedMethods] = useState<VerificationMethod[]>(classInstance.verification_methods || ['QR']);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors }, control } = useForm({
    resolver: zodResolver(editClassFormSchema),
    defaultValues: {
      name: classInstance.name,
      useLocation: !!classInstance.location,
      latitude: classInstance.location?.latitude?.toString() || '',
      longitude: classInstance.location?.longitude?.toString() || '',
      distanceThreshold: classInstance.distanceThreshold?.toString() || DEFAULT_DISTANCE_THRESHOLD.toString(),
      scheduleType: classInstance.scheduleType ?? 'one-time',
      durationMinutes: classInstance.durationMinutes?.toString() || '60',
      gracePeriodMinutes: classInstance.gracePeriodMinutes?.toString() || '15',
      autoStart: classInstance.autoStart ?? false,
      autoEnd: classInstance.autoEnd ?? false,
      recurrenceFrequency: classInstance.recurrencePattern?.frequency || 'weekly',
      recurrenceInterval: classInstance.recurrencePattern?.interval?.toString() || '1',
      recurrenceDaysOfWeek: classInstance.recurrencePattern?.daysOfWeek || [],
      recurrenceDaysOfMonth: classInstance.recurrencePattern?.daysOfMonth || [],
      recurrenceEndDate: classInstance.recurrencePattern?.endDate || '',
      recurrenceOccurrences: classInstance.recurrencePattern?.occurrences?.toString() || '',
      startTime: classInstance.startTime ? classInstance.startTime.slice(0, 16) : '',
      endTime: classInstance.endTime ? classInstance.endTime.slice(0, 16) : '',
    }
  });

  // Reset form values when the dialog is opened or class changes
  useEffect(() => {
    if (isOpen) {
      reset({
        name: classInstance.name,
        useLocation: !!classInstance.location,
        latitude: classInstance.location?.latitude?.toString() || '',
        longitude: classInstance.location?.longitude?.toString() || '',
        distanceThreshold: classInstance.distanceThreshold?.toString() || DEFAULT_DISTANCE_THRESHOLD.toString(),
        scheduleType: classInstance.scheduleType ?? 'one-time',
        durationMinutes: classInstance.durationMinutes?.toString() || '60',
        gracePeriodMinutes: classInstance.gracePeriodMinutes?.toString() || '15',
        autoStart: classInstance.autoStart ?? false,
        autoEnd: classInstance.autoEnd ?? false,
        recurrenceFrequency: classInstance.recurrencePattern?.frequency || 'weekly',
        recurrenceInterval: classInstance.recurrencePattern?.interval?.toString() || '1',
        recurrenceDaysOfWeek: classInstance.recurrencePattern?.daysOfWeek || [],
        recurrenceDaysOfMonth: classInstance.recurrencePattern?.daysOfMonth || [],
        recurrenceEndDate: classInstance.recurrencePattern?.endDate || '',
        recurrenceOccurrences: classInstance.recurrencePattern?.occurrences?.toString() || '',
        startTime: classInstance.startTime ? classInstance.startTime.slice(0, 16) : '',
        endTime: classInstance.endTime ? classInstance.endTime.slice(0, 16) : '',
      });
      setSelectedMethods(classInstance.verification_methods || ['QR']);
    }
  }, [isOpen, classInstance, reset]);

  const useLocationValue = watch('useLocation');
  const scheduleTypeValue = watch('scheduleType');
  const recurrenceFrequency = watch('recurrenceFrequency');
  const recurrenceDaysOfWeek = watch('recurrenceDaysOfWeek');
  const recurrenceDaysOfMonth = watch('recurrenceDaysOfMonth');

  // Effect to clear location fields when useLocation is unchecked
  useEffect(() => {
    if (!useLocationValue) {
      setValue('latitude', '');
      setValue('longitude', '');
      setValue('distanceThreshold', DEFAULT_DISTANCE_THRESHOLD.toString());
       // Also ensure 'Location' is removed from selected methods when unchecked
      setSelectedMethods((prev) => prev.filter((method) => method !== 'Location'));
    }
  }, [useLocationValue, setValue]);

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
    console.log('EditClassDialog: onSubmit started', { data, selectedMethods });

    // Determine the final list of verification methods to be saved
    let finalVerificationMethods = [...selectedMethods];
    if (data.useLocation && !finalVerificationMethods.includes('Location')) {
      finalVerificationMethods.push('Location');
    }

    // Now check if the final list of methods is empty
    if (finalVerificationMethods.length === 0) {
      toast({ title: 'Select Verification Method', description: 'Please select at least one verification method.', variant: 'destructive' });
      return;
    }

    const updatedClass: Class = {
      ...classInstance,
      name: data.name,
      distanceThreshold: data.distanceThreshold ? parseInt(data.distanceThreshold, 10) : DEFAULT_DISTANCE_THRESHOLD,
      scheduleType: data.scheduleType,
      durationMinutes: parseInt(data.durationMinutes, 10),
      gracePeriodMinutes: parseInt(data.gracePeriodMinutes, 10),
      autoStart: data.autoStart,
      autoEnd: data.autoEnd,
      recurrencePattern: data.scheduleType === 'custom' ? {
        frequency: data.recurrenceFrequency || 'weekly',
        interval: data.recurrenceInterval ? parseInt(data.recurrenceInterval, 10) : 1,
        daysOfWeek: data.recurrenceFrequency === 'weekly' ? data.recurrenceDaysOfWeek : undefined,
        daysOfMonth: data.recurrenceFrequency === 'monthly' ? data.recurrenceDaysOfMonth : undefined,
        endDate: data.recurrenceEndDate || undefined,
        occurrences: data.recurrenceOccurrences ? parseInt(data.recurrenceOccurrences, 10) : undefined,
      } : undefined,
      verification_methods: finalVerificationMethods,
      startTime: data.startTime,
      endTime: data.endTime,
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

    if (data.useLocation) {
      if (!data.latitude || !data.longitude || !data.distanceThreshold) {
        toast({ title: 'Location Required', description: 'Latitude, Longitude, and Distance Threshold are required for location verification.', variant: 'destructive' });
        return;
      }
    }

    console.log('EditClassDialog: Calling onUpdateClass', { updatedClass });
    onUpdateClass(updatedClass);
    console.log('EditClassDialog: onUpdateClass called');
    toast({ title: "Class Updated", description: `"${data.name}" has been successfully updated.` });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Class</DialogTitle>
          <DialogDescription>
            Update class details and location settings.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { console.log('Form native onSubmit event fired'); handleSubmit(onSubmit)(e); }} className="space-y-4">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-latitude">Latitude</Label>
                  <Input id="edit-latitude" type="number" step="any" {...register('latitude')} placeholder="e.g., 34.0522" className={errors.latitude ? 'border-destructive' : ''}/>
                  {errors.latitude && <p className="text-sm text-destructive">{errors.latitude.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-longitude">Longitude</Label>
                  <Input id="edit-longitude" type="number" step="any" {...register('longitude')} placeholder="e.g., -118.2437" className={errors.longitude ? 'border-destructive' : ''}/>
                  {errors.longitude && <p className="text-sm text-destructive">{errors.longitude.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-distanceThreshold">Distance Threshold (meters)</Label>
                <Input id="edit-distanceThreshold" type="number" {...register('distanceThreshold')} defaultValue={DEFAULT_DISTANCE_THRESHOLD} className={errors.distanceThreshold ? 'border-destructive' : ''} />
                {errors.distanceThreshold && <p className="text-sm text-destructive">{errors.distanceThreshold.message}</p>}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-scheduleType">Schedule Type</Label>
            <select id="edit-scheduleType" {...register('scheduleType')} className="w-full border rounded px-2 py-1">
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
              <Label htmlFor="edit-durationMinutes">Duration (minutes)</Label>
              <Input id="edit-durationMinutes" type="number" min={15} max={480} {...register('durationMinutes')} className="w-full" />
              {errors.durationMinutes && <p className="text-sm text-destructive">{errors.durationMinutes.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-gracePeriodMinutes">Grace Period (minutes)</Label>
              <Input id="edit-gracePeriodMinutes" type="number" min={0} max={60} {...register('gracePeriodMinutes')} className="w-full" />
              {errors.gracePeriodMinutes && <p className="text-sm text-destructive">{errors.gracePeriodMinutes.message}</p>}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <div className="flex items-center space-x-2">
              <Checkbox id="edit-autoStart" {...register('autoStart')} />
              <Label htmlFor="edit-autoStart">Auto-start class at scheduled time</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="edit-autoEnd" {...register('autoEnd')} />
              <Label htmlFor="edit-autoEnd">Auto-end class after duration</Label>
            </div>
          </div>

          <div>
            <Label className="mb-2 block font-semibold">Verification Methods</Label>
            <div className="flex flex-wrap gap-4">
              {VERIFICATION_METHODS.map((method) => (
                <label key={method.key} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selectedMethods.includes(method.key)}
                    onCheckedChange={(checked) => {
                      if (method.key === 'Location' && useLocationValue) return;
                      setSelectedMethods((prev) =>
                        checked
                          ? [...prev, method.key]
                          : prev.filter((m) => m !== method.key)
                      );
                    }}
                    disabled={method.key === 'Location' && useLocationValue}
                  />
                  {method.icon && <method.icon className="h-4 w-4" />}
                  <span>{method.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-startTime">Start Time</Label>
              <Input
                id="edit-startTime"
                type="datetime-local"
                {...register('startTime')}
                className={errors.startTime ? 'border-destructive' : ''}
              />
              {errors.startTime && <p className="text-sm text-destructive">{errors.startTime.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-endTime">End Time</Label>
              <Input
                id="edit-endTime"
                type="datetime-local"
                {...register('endTime')}
                className={errors.endTime ? 'border-destructive' : ''}
              />
              {errors.endTime && <p className="text-sm text-destructive">{errors.endTime.message}</p>}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" onClick={() => console.log('Save Changes button clicked')}>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 