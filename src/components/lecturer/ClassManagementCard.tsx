"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import type { Class, AttendanceRecord } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import QrCodeDisplay from './QrCodeDisplay';
import EditClassDialog from './EditClassDialog';
import { PlayCircle, StopCircle, Edit3, Trash2, Eye, Users, MapPin, AlertTriangle, Calendar, QrCode, BookOpen, Clock } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { classService } from '@/lib/services/class.service';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface ClassManagementCardProps {
  classInstance: Class;
  attendanceRecords: AttendanceRecord[];
  onUpdateClass: (updatedClass: Class) => void;
  onDeleteClass: (classId: string) => void;
  onViewReport: (classId: string) => void;
}

export default function ClassManagementCard({ classInstance, attendanceRecords, onUpdateClass, onDeleteClass, onViewReport }: ClassManagementCardProps) {
  const { toast } = useToast();
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Refresh session when component mounts to prevent auth issues
  useEffect(() => {
    // Check and refresh auth session silently
    const refreshSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!data.session || error) {
          console.log("No active session or session error, attempting refresh");
          await supabase.auth.refreshSession();
        }
      } catch (e) {
        console.error("Error refreshing session:", e);
      }
    };
    
    refreshSession();
  }, []);

  const studentsInClass = attendanceRecords.filter(ar => ar.classId === classInstance.id).length;

  // Function to safely dispatch class updated event
  const dispatchClassUpdatedEvent = (updatedClass: Class) => {
    // Only run this on the client side
    if (typeof window !== 'undefined') {
      // Use requestAnimationFrame to ensure this runs after hydration
      requestAnimationFrame(() => {
        const classEvent = new CustomEvent('class-updated', {
          detail: {
            classId: updatedClass.id,
            active: updatedClass.active
          }
        });
        window.dispatchEvent(classEvent);
        console.log('ClassManagementCard: Dispatched class-updated event for', updatedClass.id);
      });
    }
  };

  const handleToggleActive = async () => {
    setIsUpdating(true);
    console.log("======== Starting class toggle process ========");
    console.log("Current class state:", {
      id: classInstance.id,
      name: classInstance.name,
      active: classInstance.active,
      hasQrCode: !!classInstance.qrCodeValue
    });
    
    try {
      console.log("Original class instance:", classInstance);
      
      // Make sure we have a valid class ID format (UUID)
      if (!classInstance.id || typeof classInstance.id !== 'string') {
        throw new Error("Invalid class ID format: ID is missing or not a string");
      }
      
      // Extract class ID if it's in QR code format
      let classId = classInstance.id;
      console.log("Current class ID:", classId);
      
      if (classId.includes('class_')) {
        // Handle custom class ID format
        console.warn('Found custom class ID format, extracting proper ID');
        // Try to extract a UUID-like format or generate a new one
        // This is a fallback to ensure we have something that looks like a UUID
        classId = crypto.randomUUID();
        console.log("Generated new UUID:", classId);
      } else if (classId.startsWith('QRCODE_') && classId.includes('_')) {
        console.warn('Found QR code format as class ID, extracting original ID');
        classId = classId.split('_')[1];
        console.log("Extracted ID from QR code:", classId);
      }
      
      // Check auth session first to detect potential issues
      console.log("Checking authentication status...");
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("Authentication session error:", sessionError);
        throw new Error(`Authentication error: ${sessionError.message}`);
      }
      
      if (!sessionData.session) {
        console.error("No active session found");
        // Try to refresh the token
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.error("Failed to refresh session:", refreshError);
          throw new Error("Your session has expired. Please log in again.");
        }
      }
      
      // Get the current authenticated user
      console.log("Getting current user...");
      const { data, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error("Error getting user:", userError);
        throw new Error(`Failed to get user: ${userError.message}`);
      }
      
      const currentUser = data.user;
      console.log("Current user:", currentUser?.id || "No user found");
      
      if (!currentUser || !currentUser.id) {
        throw new Error("Not authenticated. Please log in again.");
      }
      
      // Create a clean updated class object with proper ID
      const updatedClass: Class = { 
        ...classInstance,
        id: classId, // Set the correct ID
        active: !classInstance.active,
        // Ensure lecturerId is a valid UUID by using the current user's ID
        lecturerId: currentUser.id
      };
      
      console.log("Updating class active state:", {
        oldActive: classInstance.active,
        newActive: updatedClass.active
      });
      
      if (updatedClass.active) {
        // When activating a class, set the start time and clear end time
        updatedClass.startTime = new Date().toISOString();
        updatedClass.endTime = undefined;
        
        // Generate a QR code value if none exists
        if (!updatedClass.qrCodeValue) {
          console.log("Generating QR code for newly activated class");
          const timestamp = Date.now();
          const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
          updatedClass.qrCodeValue = `CLASS_${classId}_${randomCode}_${timestamp}`;
          
          // Set expiry to 24 hours from now (or another appropriate value)
          updatedClass.qrCodeExpiry = timestamp + 86400000; // 24 hours
          console.log("Generated QR code:", {
            value: updatedClass.qrCodeValue,
            expiresAt: new Date(updatedClass.qrCodeExpiry).toISOString()
          });
        }
      } else {
        // When deactivating a class, set the end time
        updatedClass.endTime = new Date().toISOString();
        // Clear QR code data when ending class
        updatedClass.qrCodeValue = undefined;
        updatedClass.qrCodeExpiry = undefined;
      }
      
      console.log("Updated class object ready for saving:", {
        id: updatedClass.id,
        active: updatedClass.active,
        hasQrCode: !!updatedClass.qrCodeValue,
        startTime: updatedClass.startTime,
        endTime: updatedClass.endTime || "undefined"
      });
      
      console.log("Attempting to update class with ID:", classId);
      console.log("Updated class data:", updatedClass);
      
      try {
        // Save to Supabase
        const savedClass = await classService.updateClass(classId, updatedClass);
        if (!savedClass) {
          throw new Error("Failed to update class in database - no class returned");
        }
        
        console.log("Class updated successfully:", savedClass);
        
        // Update local state
        onUpdateClass(savedClass);
        toast({ 
          title: `Class ${savedClass.active ? 'Started' : 'Ended'}`, 
          description: `"${classInstance.name}" has been ${savedClass.active ? 'started' : 'ended'} and saved to database.` 
        });
        
        // Notify about class update
        dispatchClassUpdatedEvent(savedClass);
      } catch (dbError) {
        console.error("Database error updating class:", dbError);
        // Try to create a new class if update fails
        if (String(dbError).includes('invalid input syntax for type uuid') || 
            String(dbError).includes('not found')) {
          console.log("Attempting to create new class instead of update");
          const { id, ...classDataWithoutId } = updatedClass;
          const newClass = await classService.createClass(classDataWithoutId);
          if (newClass) {
            console.log("Successfully created new class:", newClass);
            onUpdateClass(newClass);
            toast({ 
              title: `Class ${newClass.active ? 'Started' : 'Ended'}`, 
              description: `"${classInstance.name}" has been ${newClass.active ? 'started' : 'ended'} and saved to database.` 
            });
            // Notify about class update
            dispatchClassUpdatedEvent(newClass);
            return;
          }
        }
        throw dbError; // Re-throw if recovery failed
      }
    } catch (error) {
      console.error("Error in handleToggleActive:", error);
      
      // Handle specific auth errors
      if (error instanceof Error) {
        if (error.message.includes("authenticated") || 
            error.message.includes("session") || 
            error.message.includes("log in")) {
          
          // Session error - prompt user to log in again
          toast({ 
            title: "Authentication Error", 
            description: "Your session has expired. Please log out and log in again.",
            variant: "destructive" 
          });
          
          // You might want to redirect to login page here or refresh tokens
          return;
        }
      } else if (error && typeof error === 'object' && Object.keys(error as object).length === 0) {
        // Empty error object - likely a connectivity or authentication issue
        console.error("Empty error object received - possible connectivity or auth issue");
        
        toast({ 
          title: "Connection Error", 
          description: "Unable to connect to the database. Please check your internet connection and login status.",
          variant: "destructive" 
        });
        
        // Try to refresh the session
        supabase.auth.refreshSession().then(({ error: refreshError }) => {
          if (refreshError) {
            console.error("Failed to refresh session:", refreshError);
            toast({ 
              title: "Authentication Error", 
              description: "Please log out and log in again to refresh your session.",
              variant: "destructive" 
            });
          }
        });
        
        return;
      }
      
      toast({ 
        title: "Error Updating Class", 
        description: error instanceof Error ? error.message : "An unknown error occurred", 
        variant: "destructive" 
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleQrUpdate = async (updatedClass: Class) => {
    try {
      console.log("QR Update - Original class:", classInstance);
      console.log("QR Update - Updated class:", updatedClass);
      
      // Make sure we have a valid class ID format (UUID)
      if (!classInstance.id || typeof classInstance.id !== 'string') {
        throw new Error("Invalid class ID format: ID is missing or not a string");
      }
      
      // Extract class ID if it's in QR code format
      let classId = classInstance.id;
      console.log("Current class ID:", classId);
      
      if (classId.includes('class_')) {
        // Handle custom class ID format
        console.warn('Found custom class ID format, extracting proper ID');
        classId = crypto.randomUUID();
        console.log("Generated new UUID:", classId);
      } else if (classId.startsWith('QRCODE_') && classId.includes('_')) {
        console.warn('Found QR code format as class ID, extracting original ID');
        classId = classId.split('_')[1];
        console.log("Extracted ID from QR code:", classId);
      }
      
      // Get the current authenticated user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser || !currentUser.id) {
        throw new Error("Not authenticated. Please log in again.");
      }
      
      // Create a clean updated class object with proper ID
      const cleanUpdatedClass: Class = {
        ...updatedClass,
        id: classId, // Set the correct ID
        lecturerId: currentUser.id // Ensure lecturerId is valid
      };
      
      try {
        // Save to Supabase
        console.log("Attempting to update class with ID:", classId);
        const savedClass = await classService.updateClass(classId, cleanUpdatedClass);
        if (!savedClass) {
          throw new Error("Failed to update QR code in database - no class returned");
        }
        
        console.log("QR code updated successfully:", savedClass);
        
        // Update local state
        onUpdateClass(savedClass);
      } catch (dbError) {
        console.error("Database error updating QR code:", dbError);
        // Still update local state even if database update fails
        onUpdateClass({
          ...cleanUpdatedClass,
          id: classId // Ensure we use the clean ID
        });
      }
    } catch (error) {
      console.error("Error in handleQrUpdate:", error);
      // Still update local state with QR code even if other errors occur
    onUpdateClass(updatedClass);
    }
  };

  const handleSetCurrentLocation = () => {
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
      async (position) => {
        try {
          console.log("Location Update - Original class:", classInstance);
          
          // Make sure we have a valid class ID format (UUID)
          if (!classInstance.id || typeof classInstance.id !== 'string') {
            throw new Error("Invalid class ID format: ID is missing or not a string");
          }
          
          // Extract class ID if it's in QR code format
          let classId = classInstance.id;
          console.log("Current class ID:", classId);
          
          if (classId.includes('class_')) {
            // Handle custom class ID format
            console.warn('Found custom class ID format, extracting proper ID');
            classId = crypto.randomUUID();
            console.log("Generated new UUID:", classId);
          } else if (classId.startsWith('QRCODE_') && classId.includes('_')) {
            console.warn('Found QR code format as class ID, extracting original ID');
            classId = classId.split('_')[1];
            console.log("Extracted ID from QR code:", classId);
          }
          
          // Get the current authenticated user
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (!currentUser || !currentUser.id) {
            throw new Error("Not authenticated. Please log in again.");
          }
          
          // Create a clean updated class object with proper ID
          const updatedClass: Class = { 
          ...classInstance, 
            id: classId, // Set the correct ID
            lecturerId: currentUser.id, // Ensure lecturerId is valid
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }
        };
        
          try {
            // Save to Supabase
            console.log("Attempting to update class location with ID:", classId);
            const savedClass = await classService.updateClass(classId, updatedClass);
            if (!savedClass) {
              throw new Error("Failed to update location in database - no class returned");
            }
            
            console.log("Location updated successfully:", savedClass);
            
            // Update local state
            onUpdateClass(savedClass);
        
        toast({ 
          title: "Location Updated", 
              description: `Location coordinates (${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}) have been set for "${classInstance.name}" and saved to database.`,
        });
          } catch (dbError) {
            console.error("Database error updating location:", dbError);
            // Try to create a new class if update fails
            if (String(dbError).includes('invalid input syntax for type uuid') || 
                String(dbError).includes('not found')) {
              console.log("Attempting to create new class with location instead of update");
              const { id, ...classDataWithoutId } = updatedClass;
              const newClass = await classService.createClass(classDataWithoutId);
              if (newClass) {
                console.log("Successfully created new class with location:", newClass);
                onUpdateClass(newClass);
                toast({ 
                  title: "Location Set", 
                  description: `Location coordinates (${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}) have been set for "${classInstance.name}" and saved to database.`
                });
                setIsGettingLocation(false);
                // Notify about class update
                dispatchClassUpdatedEvent(newClass);
                return;
              }
            }
            throw dbError; // Re-throw if recovery failed
          }
        } catch (error) {
          console.error("Error in handleSetCurrentLocation:", error);
          toast({ 
            title: "Error Updating Location", 
            description: error instanceof Error ? error.message : "An unknown error occurred", 
            variant: "destructive" 
          });
        } finally {
        setIsGettingLocation(false);
        }
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

  const handleDeleteClassItem = async () => {
    setIsDeleting(true);
    try {
      console.log("Delete - Original class:", classInstance);
      
      // Make sure we have a valid class ID format (UUID)
      if (!classInstance.id || typeof classInstance.id !== 'string') {
        throw new Error("Invalid class ID format: ID is missing or not a string");
      }
      
      // Extract class ID if it's in QR code format
      let classId = classInstance.id;
      console.log("Current class ID to delete:", classId);
      
      if (classId.includes('class_')) {
        // Handle custom class ID format
        console.warn('Found custom class ID format, cannot delete properly');
        // Instead of trying to delete a non-existent ID, just update UI
        onDeleteClass(classId);
        toast({ 
          title: "Class Removed", 
          description: "The class has been removed from your view.",
          variant: "default" 
        });
        return;
      } else if (classId.startsWith('QRCODE_') && classId.includes('_')) {
        console.warn('Found QR code format as class ID, extracting original ID');
        classId = classId.split('_')[1];
        console.log("Extracted ID from QR code:", classId);
      }
      
      try {
        // Delete from Supabase
        console.log("Attempting to delete class with ID:", classId);
        const success = await classService.deleteClass(classId);
        if (!success) {
          throw new Error("Failed to delete class from database - operation returned false");
        }
        
        console.log("Class deleted successfully");
        
        // Update local state
        onDeleteClass(classId);
        toast({ 
          title: "Class Deleted", 
          description: "The class and its attendance records have been deleted.",
          variant: "destructive" 
        });
      } catch (dbError) {
        console.error("Database error deleting class:", dbError);
        // If we can't delete from the database, at least remove it from the UI
        if (String(dbError).includes('invalid input syntax for type uuid') || 
            String(dbError).includes('not found')) {
          console.log("Class doesn't exist in database, just removing from UI");
          onDeleteClass(classId);
          toast({ 
            title: "Class Removed", 
            description: "The class has been removed from your view.",
            variant: "default" 
          });
          return;
        }
        throw dbError; // Re-throw if it's a different error
      }
    } catch (error) {
      console.error("Error in handleDeleteClassItem:", error);
      toast({ 
        title: "Error Deleting Class", 
        description: error instanceof Error ? error.message : "An unknown error occurred", 
        variant: "destructive" 
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl font-semibold">{classInstance.name}</CardTitle>
            <CardDescription className="flex flex-col space-y-2">
              <div className="flex items-center text-sm">
                <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                <span>Created {new Date(classInstance.startTime).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center text-sm">
                <Clock className="h-4 w-4 mr-2 text-blue-500" />
                <span>
                  {classInstance.active ? (
                    <span className="text-green-600">Currently in session</span>
                  ) : (
                    <span className="text-muted-foreground">Session ended</span>
                  )}
                </span>
              </div>
            </CardDescription>
          </div>
          <Badge 
            variant={classInstance.active ? 'default' : 'secondary'} 
            className={cn(
              "transition-colors duration-200",
              classInstance.active ? 'bg-green-500 text-white hover:bg-green-600' : ''
            )}
          >
            {classInstance.active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Attendance Statistics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center text-sm font-medium">
              <Users className="h-4 w-4 mr-2 text-blue-500" />
              Attendance Overview
            </div>
            <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
              <div>
                <div className="text-2xl font-bold text-blue-700">{studentsInClass}</div>
                <div className="text-sm text-blue-600">Students</div>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center text-sm font-medium">
              <MapPin className="h-4 w-4 mr-2 text-emerald-500" />
              Verification Method
            </div>
            <div className={cn(
              "p-3 rounded-lg flex items-center justify-between",
              classInstance.location ? "bg-emerald-50" : "bg-orange-50"
            )}>
              <div>
                <div className="text-sm font-medium">
                  {classInstance.location ? (
                    <span className="text-emerald-700">Location Enabled</span>
                  ) : (
                    <span className="text-orange-700">QR Code Only</span>
                  )}
                </div>
                {classInstance.location && (
                  <div className="text-xs text-emerald-600 mt-1">
                    Threshold: {classInstance.distanceThreshold}m
                  </div>
                )}
              </div>
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center",
                classInstance.location ? "bg-emerald-100" : "bg-orange-100"
              )}>
                {classInstance.location ? (
                  <MapPin className="h-5 w-5 text-emerald-500" />
                ) : (
                  <QrCode className="h-5 w-5 text-orange-500" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {classInstance.active ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsQrModalOpen(true)}
                className="flex-1"
              >
                <QrCode className="h-4 w-4 mr-2" />
                Show QR Code
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleActive}
                className="flex-1"
              >
                <StopCircle className="h-4 w-4 mr-2" />
                End Class
              </Button>
            </>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={handleToggleActive}
              className="flex-1"
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                  Starting...
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Start Class
                </>
              )}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewReport(classInstance.id)}
            className="flex-1"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            View Report
          </Button>
          <div className="flex gap-2 w-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditDialogOpen(true)}
              className="flex-1"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Edit Class
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Class
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Class</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{classInstance.name}"? This action cannot be undone
                    and will permanently delete all attendance records for this class.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteClassItem}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>

      {/* QR Code Dialog */}
      <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Class QR Code</DialogTitle>
            <DialogDescription>
              Display this QR code for students to scan. The code refreshes periodically for security.
              {!classInstance.active && " Warning: Class is not active - start the class to enable attendance marking."}
            </DialogDescription>
          </DialogHeader>
          <QrCodeDisplay classInstance={classInstance} onUpdateClass={handleQrUpdate} />
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between">
            <div className="mb-2 sm:mb-0">
              {!classInstance.active && (
                <Button 
                  onClick={handleToggleActive}
                  className="w-full sm:w-auto"
                  disabled={isUpdating}
                >
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Start Class
                </Button>
              )}
            </div>
            <Button 
              variant="outline" 
              onClick={() => setIsQrModalOpen(false)}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Class Dialog */}
      <EditClassDialog 
        classInstance={classInstance}
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onUpdateClass={onUpdateClass}
      />
    </Card>
  );
}

function QrCodeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="5" height="5" x="3" y="3" rx="1" />
      <rect width="5" height="5" x="16" y="3" rx="1" />
      <rect width="5" height="5" x="3" y="16" rx="1" />
      <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
      <path d="M21 21v.01" />
      <path d="M12 7v3a2 2 0 0 1-2 2H7" />
      <path d="M3 12h.01" />
      <path d="M12 3h.01" />
      <path d="M12 16v.01" />
      <path d="M16 12h.01" />
      <path d="M21 12v.01" />
      <path d="M12 21v-3a2 2 0 0 0-2-2H7" />
      <path d="M7 21h.01" />
    </svg>
  );
}

