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
import type { Class, GeoLocation } from '@/lib/types';
import { DEFAULT_DISTANCE_THRESHOLD, LECTURER_MOCK_ID } from '@/config';
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, MapPin } from 'lucide-react';

const classFormSchema = z.object({
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

type ClassFormData = z.infer<typeof classFormSchema>;

interface CreateClassFormProps {
  onClassCreated: (newClass: Class) => void;
}

export default function CreateClassForm({ onClassCreated }: CreateClassFormProps) {
  const { classes, setClasses } = useAppContext();
  const [showLocationFields, setShowLocationFields] = useState(false);
  const { toast } = useToast();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ClassFormData>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      name: '',
      useLocation: false,
      distanceThreshold: DEFAULT_DISTANCE_THRESHOLD.toString(),
    }
  });

  const useLocationValue = watch('useLocation');

  useEffect(() => {
    setShowLocationFields(useLocationValue);
    if(!useLocationValue) {
      setValue('latitude', '');
      setValue('longitude', '');
    }
  }, [useLocationValue, setValue]);


  const onSubmit: SubmitHandler<ClassFormData> = (data) => {
    const newClass: Class = {
      id: `class_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: data.name,
      lecturerId: LECTURER_MOCK_ID,
      active: false, // Classes are not active immediately on creation
      startTime: new Date().toISOString(), // Placeholder, lecturer should "start" it
      distanceThreshold: data.distanceThreshold ? parseInt(data.distanceThreshold, 10) : DEFAULT_DISTANCE_THRESHOLD,
    };

    if (data.useLocation && data.latitude && data.longitude) {
      newClass.location = {
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
      };
    }
    
    onClassCreated(newClass);
    toast({ title: "Class Created", description: `"${data.name}" has been successfully created.` });
    reset();
    setShowLocationFields(false);
  };

  return (
    <Card className="w-full max-w-lg shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl">
          <PlusCircle className="mr-2 h-6 w-6 text-primary" /> Create New Class
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Class Name</Label>
            <Input id="name" {...register('name')} placeholder="e.g., Introduction to AI" className={errors.name ? 'border-destructive' : ''} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="useLocation" {...register('useLocation')} checked={showLocationFields} onCheckedChange={(checked) => setShowLocationFields(!!checked)} />
            <Label htmlFor="useLocation" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Enable Location Verification
            </Label>
          </div>

          {showLocationFields && (
            <div className="space-y-4 p-4 border rounded-md bg-muted/50">
              <div className="flex items-center text-primary font-medium mb-2">
                <MapPin className="h-5 w-5 mr-2"/> Location Details
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input id="latitude" type="number" step="any" {...register('latitude')} placeholder="e.g., 34.0522" className={errors.latitude ? 'border-destructive' : ''}/>
                  {errors.latitude && <p className="text-sm text-destructive">{errors.latitude.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input id="longitude" type="number" step="any" {...register('longitude')} placeholder="e.g., -118.2437" className={errors.longitude ? 'border-destructive' : ''}/>
                  {errors.longitude && <p className="text-sm text-destructive">{errors.longitude.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="distanceThreshold">Distance Threshold (meters)</Label>
                <Input id="distanceThreshold" type="number" {...register('distanceThreshold')} defaultValue={DEFAULT_DISTANCE_THRESHOLD} className={errors.distanceThreshold ? 'border-destructive' : ''} />
                {errors.distanceThreshold && <p className="text-sm text-destructive">{errors.distanceThreshold.message}</p>}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full">
            <PlusCircle className="mr-2 h-5 w-5" /> Create Class
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
