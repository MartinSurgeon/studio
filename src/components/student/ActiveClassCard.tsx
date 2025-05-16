"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import type { Class, GeoLocation, AttendanceRecord } from '@/lib/types';
import { useAppContext } from '@/contexts/AppContext';
import { verifyLocation, type VerifyLocationInput, type VerifyLocationOutput } from '@/ai/flows/verify-location';
import { useToast } from "@/hooks/use-toast";
import { Input } from '@/components/ui/input';
import LoadingSpinner from '@/components/core/LoadingSpinner';
import { MapPin, QrCodeIcon, CheckCircle, XCircle, AlertTriangle, Info, Upload, Map, User, Clock, QrCode, UserCheck } from 'lucide-react';
import QrScanner from './QrScanner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { attendanceService } from '@/lib/services/attendance.service';
import StudentRouteMap from './StudentRouteMap';
import { cn } from '@/lib/utils';
import { userService } from '@/lib/services/user.service';

interface ActiveClassCardProps {
  classItem: Class;
  studentId: string;
  onMarkAttendance: (record: AttendanceRecord) => void;
}

export default function ActiveClassCard({ classItem, studentId, onMarkAttendance }: ActiveClassCardProps) {
  const { testingMode } = useAppContext();
  const { toast } = useToast();
  const [isVerifyingLocation, setIsVerifyingLocation] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrCodeInput, setQrCodeInput] = useState('');
  const [verificationResult, setVerificationResult] = useState<{success: boolean, message: string} | null>(null);
  const [qrScanError, setQrScanError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<GeoLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationFetchAttempted, setLocationFetchAttempted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasExistingAttendance, setHasExistingAttendance] = useState<AttendanceRecord | null>(null);
  const [attendanceChecked, setAttendanceChecked] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [showRouteMap, setShowRouteMap] = useState(false);
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);
  const [lecturerName, setLecturerName] = useState<string | null>(null);

  useEffect(() => {
    const fetchLecturerName = async () => {
      if (!classItem.lecturerId) return;
      
      try {
        const lecturer = await userService.getUserById(classItem.lecturerId);
        if (lecturer) {
          setLecturerName(lecturer.displayName || lecturer.email.split('@')[0]);
        }
      } catch (error) {
        console.error('Error fetching lecturer name:', error);
      }
    };
    
    fetchLecturerName();
  }, [classItem.lecturerId]);

  useEffect(() => {
    const checkAttendance = async () => {
      // Skip if we've already checked or if missing required info
      if (attendanceChecked || !studentId || !classItem.id) return;
      
      try {
        console.log(`ActiveClassCard: Checking attendance for student ${studentId} in class ${classItem.id}`);
        setAttendanceChecked(true); // Mark as checked to prevent loops
        
        // Check for student-specific attendance records, using test mode if needed
        const studentRecords = await attendanceService.getAttendanceRecords({ 
          studentId,
          classId: classItem.id
        }, testingMode);
        
        if (studentRecords.length > 0) {
          console.log(`ActiveClassCard: Student has existing attendance record`);
          setHasExistingAttendance(studentRecords[0]); // Store the actual record
          return;
        }
        
        // If no student records found and we're not in test mode, check for device-specific records
        if (!testingMode) {
        // This handles cases where a different student used the same device
          const deviceId = localStorage.getItem('geoattend-device-id');
        if (deviceId) {
            // We can't directly query by deviceId using the service, so we'll just warn the user in the UI when they try to submit
          console.log(`ActiveClassCard: Student has no attendance record`);
          setHasExistingAttendance(null);
        } else {
          console.log(`ActiveClassCard: No device ID found, assuming first use`);
            setHasExistingAttendance(null);
          }
        } else {
          console.log(`ActiveClassCard: No attendance record found in test mode`);
          setHasExistingAttendance(null);
        }
      } catch (error) {
        console.error('ActiveClassCard: Error checking attendance:', error);
        setAttendanceChecked(true); // Mark as checked even if there was an error
        setHasExistingAttendance(null);
      }
    };
    
    checkAttendance();
  }, [studentId, classItem.id, testingMode, attendanceChecked]);

  useEffect(() => {
    // Only attempt to get location if class has location, user doesn't have attendance,
    // and we haven't already tried fetching location
    if (classItem.location && !hasExistingAttendance && !locationFetchAttempted && !currentLocation) {
      console.log('ActiveClassCard: Fetching user location for verification');
      getUserLocation();
    }
  }, [classItem.location, hasExistingAttendance, locationFetchAttempted, currentLocation]);

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setLocationFetchAttempted(true);
      toast({ 
        title: "Location Not Supported", 
        description: "Your browser doesn't support geolocation. Please try another device or browser.", 
        variant: "destructive" 
      });
      return;
    }

    // Check if browser is in secure context
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      setLocationError("Geolocation requires a secure connection (HTTPS)");
      setLocationFetchAttempted(true);
      toast({ 
        title: "Secure Connection Required", 
        description: "Location services require a secure (HTTPS) connection.", 
        variant: "destructive" 
      });
      return;
    }

    setIsGettingLocation(true);
    setLocationError(null);
    setLocationFetchAttempted(true); // Mark as attempted to prevent loops

    try {
      console.log('ActiveClassCard: Requesting user geolocation');
      
      // Set a timeout to handle cases where geolocation silently fails
      const timeoutId = setTimeout(() => {
        if (isGettingLocation) {
          setIsGettingLocation(false);
          setLocationError("Location request timed out. Your browser may have blocked location access.");
          toast({ 
            title: "Location Timeout", 
            description: "Couldn't get your location in time. Please check your permissions or try another device.", 
            variant: "destructive" 
          });
        }
      }, 20000); // 20 second timeout

    navigator.geolocation.getCurrentPosition(
      (position) => {
          clearTimeout(timeoutId);
          console.log('ActiveClassCard: Got user location successfully');
        const userLocation: GeoLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setCurrentLocation(userLocation);
        setLocationAccuracy(position.coords.accuracy);
        setIsGettingLocation(false);
      },
      (error) => {
          clearTimeout(timeoutId);
          console.error('ActiveClassCard: Error getting location:', error);
        setIsGettingLocation(false);
        let errorMessage = "Unable to retrieve your location";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied. Please enable it in your browser settings.";
            break;
          case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information is unavailable on this device or browser.";
            break;
          case error.TIMEOUT:
            errorMessage = "The request to get your location timed out.";
            break;
            default:
              errorMessage = `Location error (${error.code}): ${error.message || "Unknown error"}`;
        }
        
        setLocationError(errorMessage);
          toast({ 
            title: "Location Error", 
            description: errorMessage, 
            variant: "destructive" 
          });
        },
        { 
          enableHighAccuracy: true, 
          timeout: 15000, 
          maximumAge: 0 
        }
      );
    } catch (ex) {
      console.error('ActiveClassCard: Exception in geolocation API:', ex);
      setIsGettingLocation(false);
      const errorMessage = "Error accessing location services. Please check your browser settings.";
      setLocationError(errorMessage);
      toast({ 
        title: "Location Error", 
        description: "Failed to access your device's location services. Please check your permissions.", 
        variant: "destructive" 
      });
    }
  };

  // Function to safely dispatch attendance event
  const dispatchAttendanceEvent = (record: AttendanceRecord) => {
    // Only run this on the client side
    if (typeof window !== 'undefined') {
      // Use requestAnimationFrame to ensure this runs after hydration
      requestAnimationFrame(() => {
        // Local event for current tab
        const attendanceEvent = new CustomEvent('attendance-marked', {
          detail: {
            classId: record.classId,
            studentId: record.studentId,
            record: record
          }
        });
        window.dispatchEvent(attendanceEvent);
        
        // Also broadcast to other tabs using BroadcastChannel API
        try {
          // Create a broadcast channel for sending the message to other tabs
          const broadcastChannel = new BroadcastChannel('geoattend-attendance');
          
          // Send the message
          broadcastChannel.postMessage({
            type: 'attendance-marked',
            classId: record.classId,
            studentId: record.studentId,
            timestamp: Date.now()
          });
          
          // Close after a short delay to ensure message is sent
          setTimeout(() => {
            broadcastChannel.close();
            console.log('ActiveClassCard: Closed BroadcastChannel after sending');
          }, 1000);
          
          console.log('ActiveClassCard: Broadcast attendance-marked event to all tabs', record.classId);
        } catch (error) {
          console.error('ActiveClassCard: Failed to broadcast attendance event', error);
        }
        
        console.log('ActiveClassCard: Dispatched attendance-marked event', record.classId);
      });
    }
  };

  const handleLocationCheckIn = async () => {
    if (!classItem.location) {
      toast({ title: "Location Error", description: "This class does not support location-based check-in.", variant: "destructive" });
      return;
    }
    
    if (!studentId) {
      toast({ 
        title: "Index Number Required", 
        description: "Your student index number is required to mark attendance. Please set up your profile first.", 
        variant: "destructive" 
      });
      return;
    }
    
    // Check if student already has an attendance record for this class BEFORE doing anything else
    try {
      const existingRecords = await attendanceService.getAttendanceRecords({ 
        classId: classItem.id, 
        studentId: studentId
      });
      
      if (existingRecords && existingRecords.length > 0) {
        setHasExistingAttendance(existingRecords[0]);
        toast({ 
          title: "Already Checked In", 
          description: "You have already recorded attendance for this class.", 
          variant: "destructive" 
        });
        return;
      }
    } catch (error) {
      console.error("Error checking existing attendance:", error);
    }
    
    setIsVerifyingLocation(true);
    setVerificationResult(null);

    // Stronger timeout to guarantee the verification process stops
    setTimeout(() => {
      if (isVerifyingLocation) {
        console.log("Force-stopping verification process after timeout");
        setIsVerifyingLocation(false);
        setVerificationResult({
          success: false, 
          message: "Verification timed out. Please try again or use QR code instead."
        });
        toast({ 
          title: "Verification Timeout", 
          description: "Location verification is taking too long. Please try using QR code instead.", 
          variant: "destructive" 
        });
      }
    }, 15000); // Shorter 15-second timeout for better user experience

    if (testingMode) {
      try {
        console.log("Testing Mode: Creating attendance record with mock location");
        
        // EMERGENCY FIX: Skip verification entirely and create record with class location
        const mockUserLocation: GeoLocation = { 
          latitude: classItem.location!.latitude, 
          longitude: classItem.location!.longitude 
        };
        
        // Create the attendance record using the service in testing mode (bypass all checks)
        const newRecord: Omit<AttendanceRecord, 'id'> = {
          classId: classItem.id,
          studentId: studentId,
          checkInTime: new Date().toISOString(),
          status: 'Present',
          verificationMethod: 'Location',
          verifiedLocation: mockUserLocation,
        };
        
        console.log("Testing Mode: About to save attendance record:", {
          classId: classItem.id,
          studentId,
          verificationMethod: 'Location',
          hasLocation: !!mockUserLocation
        });
        
        // Use the test mode parameter to avoid database errors
        const savedRecord = await attendanceService.createAttendanceRecord(newRecord, true);
        
        if (savedRecord) {
          console.log("Testing Mode: Successfully saved attendance record:", {
            id: savedRecord.id,
            classId: savedRecord.classId,
            studentId: savedRecord.studentId
          });
          
          onMarkAttendance(savedRecord);
          setHasExistingAttendance(savedRecord);
        setVerificationResult({success: true, message: "Attendance marked (Testing Mode)."});
          toast({ 
            title: "Attendance Marked (Testing)", 
            description: `Successfully checked in for ${classItem.name}.` 
          });
          
          // Trigger any parent component refresh if needed
          dispatchAttendanceEvent(savedRecord);
        } else {
          console.error("Testing Mode: Failed to save attendance record - null result returned");
          throw new Error("Failed to save attendance record in testing mode");
        }
      } catch (error) {
        console.error("Testing mode attendance error:", error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        
        if (errorMsg.includes('already marked')) {
          toast({ 
            title: "Already Checked In", 
            description: "You have already recorded attendance for this class.", 
            variant: "destructive" 
          });
        } else {
          toast({ 
            title: "Attendance Error", 
            description: "Failed to record your attendance in testing mode.", 
            variant: "destructive" 
          });
        }
        setVerificationResult({success: false, message: "Failed to mark attendance in testing mode"});
      } finally {
        setIsVerifyingLocation(false);
      }
      return;
    }

    let userLocation = currentLocation;
    if (!userLocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { 
            enableHighAccuracy: true, 
            timeout: 10000, 
            maximumAge: 0 
          });
        });
        
        userLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        setCurrentLocation(userLocation);
        setLocationAccuracy(position.coords.accuracy);
      } catch (error: any) {
        let message = "Could not get your location. Please ensure location services are enabled.";
        if (error.code === error.PERMISSION_DENIED) message = "Location permission denied. Please enable it in your browser settings.";
        setVerificationResult({success: false, message});
        toast({ title: "Geolocation Error", description: message, variant: "destructive" });
        setIsVerifyingLocation(false);
        return;
      }
    }

    try {
      // Use the attendance service to mark attendance with location
      console.log(`ActiveClassCard: Marking attendance for student ${studentId} in class ${classItem.id} with location`);
      console.log(`ActiveClassCard: User location: ${JSON.stringify(userLocation)}`);
      console.log(`ActiveClassCard: Class location: ${JSON.stringify(classItem.location)}`);
      
      const result = await attendanceService.markAttendanceWithLocation(
        classItem.id,
        studentId,
        userLocation
      );
      
      if (result.success && result.record) {
        setVerificationResult({
          success: true, 
          message: result.message || "Attendance successfully recorded!"
        });
        onMarkAttendance(result.record);
        toast({ 
          title: "Attendance Marked", 
          description: result.message || `Successfully checked in for ${classItem.name}.` 
        });
        // Update the hasExistingAttendance state
        setHasExistingAttendance(result.record);
        
        // Trigger any parent component refresh if needed
        dispatchAttendanceEvent(result.record);
      } else {
        // Handle the out-of-range case with specific feedback
        if (result.details && !result.details.withinRange) {
          const { distance, threshold } = result.details;
          
          // Create a more detailed error message with distance information
          const errorMessage = `You are approximately ${distance}m away from class. 
                                Maximum allowed distance is ${threshold}m.`;
          
          setVerificationResult({
            success: false, 
            message: errorMessage
          });
          
          toast({ 
            title: "Too Far From Class", 
            description: `You need to be within ${threshold}m of the class location. 
                         You are currently ${distance}m away.`, 
            variant: "destructive" 
          });
        } else {
          // Handle other error cases
        setVerificationResult({
          success: false, 
          message: result.message || "Failed to verify your location"
        });
        toast({ 
          title: "Location Verification Failed", 
          description: result.message || "Could not verify your location for attendance", 
          variant: "destructive" 
        });
        }
      }
    } catch (error) {
      console.error("Attendance recording error:", error);
      setVerificationResult({success: false, message: "Error recording attendance. Please try again."});
      toast({ title: "Attendance Error", description: "Could not save your attendance record.", variant: "destructive" });
    } finally {
      setIsVerifyingLocation(false);
    }
  };

  const handleQrScanSuccess = async (decodedText: string) => {
    if (!classItem.qrCodeValue || !classItem.qrCodeExpiry) {
      toast({ title: "QR Error", description: "QR code not available for this class.", variant: "destructive" });
      return;
    }
    
    if (!studentId) {
      toast({ 
        title: "Index Number Required", 
        description: "Your student index number is required to mark attendance. Please set up your profile first.", 
        variant: "destructive" 
      });
      return;
    }
    
    if (Date.now() > classItem.qrCodeExpiry) {
      toast({ title: "QR Expired", description: "The QR code for this class has expired.", variant: "destructive" });
      setVerificationResult({success: false, message: "QR Code Expired."});
      return;
    }

    if (decodedText === classItem.qrCodeValue) {
      try {
        // Get any existing records for this class/student
        const existingRecords = await attendanceService.getAttendanceRecords({ 
          classId: classItem.id, 
          studentId: studentId
        }, testingMode);
        
        if (existingRecords && existingRecords.length > 0) {
          toast({ 
            title: "Already Checked In", 
            description: "You have already recorded attendance for this class.", 
            variant: "destructive" 
          });
          setHasExistingAttendance(existingRecords[0]);
          return;
        }
        
        // Create a new attendance record
        const newRecord: Omit<AttendanceRecord, 'id'> = {
          classId: classItem.id,
          studentId: studentId,
          checkInTime: new Date().toISOString(),
          status: 'Present', // Could add logic to set 'Late' based on class start time
          verificationMethod: 'QR',
          // The deviceId will be added by the attendance service
        };
        
        console.log(`ActiveClassCard: Creating attendance record for student ${studentId} in class ${classItem.id} via QR`);
        const savedRecord = await attendanceService.createAttendanceRecord(newRecord, testingMode);
        
        if (savedRecord) {
          onMarkAttendance(savedRecord);
          setHasExistingAttendance(savedRecord);
          toast({ 
            title: "Attendance Marked", 
            description: `Successfully checked in for ${classItem.name}.` 
          });
          setIsQrModalOpen(false);
          
          // Trigger any parent component refresh if needed
          dispatchAttendanceEvent(savedRecord);
        } else {
          throw new Error("Failed to save attendance record");
        }
      } catch (error) {
        console.error("QR attendance error:", error);
        
        // Check if error message indicates already marked from device
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.includes('already marked from this device')) {
          toast({ 
            title: "Already Checked In", 
            description: "Attendance has already been marked from this device.", 
            variant: "destructive" 
          });
        } else {
          toast({ 
            title: "Attendance Error", 
            description: "Failed to record your attendance. Please try again.", 
            variant: "destructive" 
          });
        }
      }
    } else {
      setVerificationResult({success: false, message: "Invalid QR Code."});
      toast({ title: "Invalid QR Code", description: "The scanned QR code does not match the expected value.", variant: "destructive" });
    }
  };

  const handleQrScanError = (error: string) => {
    setQrScanError(error);
  };

  const handleQrCheckIn = async () => {
    if (!classItem.qrCodeValue || !classItem.qrCodeExpiry) {
      toast({ title: "QR Error", description: "QR code not available for this class.", variant: "destructive" });
      return;
    }
    
    if (!studentId) {
      toast({ 
        title: "Index Number Required", 
        description: "Your student index number is required to mark attendance. Please set up your profile first.", 
        variant: "destructive" 
      });
      return;
    }
    
    if (Date.now() > classItem.qrCodeExpiry) {
      toast({ title: "QR Expired", description: "The QR code for this class has expired.", variant: "destructive" });
      setVerificationResult({success: false, message: "QR Code Expired."});
      return;
    }
    
    if (qrCodeInput === classItem.qrCodeValue) {
      try {
        // Check for existing attendance records
        const existingRecords = await attendanceService.getAttendanceRecords({ 
        classId: classItem.id,
          studentId: studentId
        });
        
        if (existingRecords && existingRecords.length > 0) {
          toast({ 
            title: "Already Checked In", 
            description: "You have already recorded attendance for this class.", 
            variant: "destructive" 
          });
          setHasExistingAttendance(existingRecords[0]);
          return;
        }
        
        // Create a new attendance record using the service
        const newRecord: Omit<AttendanceRecord, 'id'> = {
          classId: classItem.id,
          studentId: studentId,
        checkInTime: new Date().toISOString(),
        status: 'Present',
        verificationMethod: 'QR',
      };
        
        // Save to database
        const savedRecord = await attendanceService.createAttendanceRecord(newRecord);
        
        if (savedRecord) {
          onMarkAttendance(savedRecord);
          setHasExistingAttendance(savedRecord);
      setVerificationResult({success: true, message: "QR Code verified successfully."});
          toast({ 
            title: "Attendance Marked", 
            description: `Successfully checked in for ${classItem.name} via QR code.` 
          });
      setIsQrModalOpen(false);
      setQrCodeInput('');
          
          // Trigger any parent component refresh if needed
          dispatchAttendanceEvent(savedRecord);
        } else {
          throw new Error("Failed to save attendance record");
        }
      } catch (error) {
        console.error("QR code attendance error:", error);
        
        // Check if error message indicates already marked from device
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.includes('already marked from this device')) {
          toast({ 
            title: "Already Checked In", 
            description: "Attendance has already been marked from this device.", 
            variant: "destructive" 
          });
        } else {
          setVerificationResult({success: false, message: "Error saving attendance."});
          toast({ 
            title: "Attendance Error", 
            description: "Failed to record your attendance. Please try again.", 
            variant: "destructive" 
          });
        }
      }
    } else {
      setVerificationResult({success: false, message: "Invalid QR Code."});
      toast({ title: "QR Verification Failed", description: "The scanned QR code is incorrect.", variant: "destructive" });
    }
  };

  const handleQrFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Clear previous error
    setQrScanError(null);

    try {
      // Explicitly import Html5Qrcode to avoid reference issues
      import('html5-qrcode').then(({ Html5Qrcode }) => {
        const qrScanner = new Html5Qrcode("qr-reader-hidden");
        qrScanner.scanFile(file, /* showImage */ false)
          .then(decodedText => {
            handleQrScanSuccess(decodedText);
            qrScanner.clear();
          })
          .catch(err => {
            setQrScanError("Could not read QR code from image. Try a clearer photo or manual entry.");
            console.error("QR scan error:", err);
            qrScanner.clear();
          });
      }).catch(err => {
        setQrScanError("Could not load QR scanner. Try manual entry instead.");
        console.error("Import error:", err);
      });
    } catch (error) {
      setQrScanError("Failed to process image. Try manual entry instead.");
      console.error("File processing error:", error);
    }
    
    // Clear the file input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleManualQrSubmit = async () => {
    if (!qrCodeInput || !classItem.qrCodeValue || !classItem.qrCodeExpiry) {
      setQrError("Please enter a valid QR code value");
      return;
    }
    
    if (!studentId) {
      toast({ 
        title: "Index Number Required", 
        description: "Your student index number is required to mark attendance. Please set up your profile first.", 
        variant: "destructive" 
      });
      return;
    }

    if (Date.now() > classItem.qrCodeExpiry) {
      setQrError("QR Code Expired");
      return;
    }

    if (qrCodeInput !== classItem.qrCodeValue) {
      setQrError("Invalid QR Code value");
      return;
    }
    
      try {
        // Get any existing records for this class/student
        const existingRecords = await attendanceService.getAttendanceRecords({ 
          classId: classItem.id, 
          studentId: studentId
      }, testingMode);
        
        if (existingRecords && existingRecords.length > 0) {
          toast({ 
            title: "Already Checked In", 
            description: "You have already recorded attendance for this class.", 
            variant: "destructive" 
          });
        setQrError("You have already marked attendance for this class");
          return;
        }
        
        // Create a new attendance record
        const newRecord: Omit<AttendanceRecord, 'id'> = {
          classId: classItem.id,
          studentId: studentId,
          checkInTime: new Date().toISOString(),
        status: 'Present',
          verificationMethod: 'QR',
        };
        
      const savedRecord = await attendanceService.createAttendanceRecord(newRecord, testingMode);
        
        if (savedRecord) {
          onMarkAttendance(savedRecord);
          setHasExistingAttendance(savedRecord);
          setVerificationResult({success: true, message: "QR Code verified successfully."});
          toast({ 
            title: "Attendance Marked", 
            description: `Successfully checked in for ${classItem.name}.` 
          });
          setIsQrModalOpen(false);
          setQrCodeInput('');
          
          // Trigger any parent component refresh if needed
          dispatchAttendanceEvent(savedRecord);
        } else {
          throw new Error("Failed to save attendance record");
        }
      } catch (error) {
        console.error("Manual QR attendance error:", error);
        
        // Check if error message indicates already marked from device
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.includes('already marked from this device')) {
          toast({ 
            title: "Already Checked In", 
            description: "Attendance has already been marked from this device.", 
            variant: "destructive" 
          });
        } else {
          setVerificationResult({success: false, message: "Error saving attendance."});
          toast({ 
            title: "Attendance Error", 
            description: "Failed to record your attendance. Please try again.", 
            variant: "destructive" 
          });
        }
      }
  };

  // Calculate distance between current location and class location
  const calculateDistanceToClass = (): number | undefined => {
    if (!currentLocation || !classItem.location) return undefined;
    
    const R = 6371e3; // Earth radius in meters
    const φ1 = currentLocation.latitude * Math.PI / 180;
    const φ2 = classItem.location.latitude * Math.PI / 180;
    const Δφ = (classItem.location.latitude - currentLocation.latitude) * Math.PI / 180;
    const Δλ = (classItem.location.longitude - currentLocation.longitude) * Math.PI / 180;

    const a = 
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  };
  
  // Update current location when new position is available from the map
  const handleLocationUpdate = (newLocation: GeoLocation) => {
    setCurrentLocation(newLocation);
  };

  if (hasExistingAttendance) {
    return (
      <Card className="shadow-md bg-green-50 border-green-200">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl font-semibold text-green-700">
                {classItem.name}
              </CardTitle>
              <CardDescription className="flex flex-col space-y-2">
                <div className="flex items-center text-green-600">
                  <User className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">
                    {lecturerName || 'Unknown Lecturer'}
                  </span>
                </div>
                <div className="flex items-center text-green-600">
                  <Clock className="h-4 w-4 mr-2" />
                  <span className="text-sm">
                    Started at {new Date(classItem.startTime).toLocaleTimeString()}
                  </span>
                </div>
              </CardDescription>
            </div>
            <Badge className="bg-green-100 text-green-800 border-green-300">
              Attended
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-6">
          <div className="flex items-center bg-white rounded-lg p-4 shadow-sm">
            <CheckCircle className="h-10 w-10 text-green-500 mr-3" />
            <div>
              <p className="font-semibold text-green-600">Attendance Marked!</p>
              <div className="text-sm text-green-500 space-y-1">
                <p className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {new Date(hasExistingAttendance.checkInTime).toLocaleTimeString()}
                </p>
                <p className="flex items-center">
                  {hasExistingAttendance.verificationMethod === 'QR' && <QrCode className="h-4 w-4 mr-1" />}
                  {hasExistingAttendance.verificationMethod === 'Location' && <MapPin className="h-4 w-4 mr-1" />}
                  {hasExistingAttendance.verificationMethod === 'Manual' && <UserCheck className="h-4 w-4 mr-1" />}
                  {hasExistingAttendance.verificationMethod}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("shadow-md", {
      "border-primary": isMarkingAttendance,
      "border-2": isMarkingAttendance
    })}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl font-semibold">{classItem.name}</CardTitle>
            <CardDescription className="flex flex-col space-y-2">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2 text-blue-500" />
                <span className="text-sm font-medium">
                  {lecturerName || 'Unknown Lecturer'}
                </span>
              </div>
              <div className="flex items-center text-muted-foreground">
                <Clock className="h-4 w-4 mr-2" />
                <div className="flex flex-col">
                  <span className="text-sm">
                    Started at {new Date(classItem.startTime).toLocaleTimeString()}
                  </span>
                  {classItem.endTime && (
                    <span className="text-xs">
                      Ends at {new Date(classItem.endTime).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
              {classItem.location && (
                <div className="flex items-center text-emerald-600">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span className="text-sm">Location verification enabled</span>
                </div>
              )}
            </CardDescription>
          </div>
          <Badge variant={isMarkingAttendance ? "secondary" : "default"} className={cn({
            "animate-pulse": isMarkingAttendance
          })}>
            {isMarkingAttendance ? "Marking..." : "Active"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {verificationResult && (
          <div className={cn("p-3 rounded-md mb-4 text-sm flex items-center", {
            'bg-green-100 text-green-700': verificationResult.success,
            'bg-red-100 text-red-700': !verificationResult.success
          })}>
            {verificationResult.success ? (
              <CheckCircle className="h-5 w-5 mr-2" />
            ) : (
              <XCircle className="h-5 w-5 mr-2" />
            )}
            {verificationResult.message}
          </div>
        )}
        
        {isVerifyingLocation && (
          <div className="p-4 bg-blue-50 rounded-md">
            <LoadingSpinner text="Verifying your location..." />
          </div>
        )}
        
        {isGettingLocation && (
          <div className="p-4 bg-blue-50 rounded-md">
            <LoadingSpinner text="Getting your location..." />
          </div>
        )}
        
        {locationError && (
          <div className="p-4 rounded-md bg-red-50 text-red-700">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{locationError}</p>
                <p className="text-sm mt-1">
                  If location doesn't work, try using QR code attendance instead.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {currentLocation && classItem.location && !isVerifyingLocation && !verificationResult && (
          <div className="p-3 rounded-md mb-4 text-sm">
            <div className="flex items-center text-green-700 mb-1">
              <MapPin className="h-5 w-5 mr-2" />
              Location detected!
              {locationAccuracy && <span className="ml-1 text-xs">(±{Math.round(locationAccuracy)}m accuracy)</span>}
            </div>
            <div className="text-xs text-muted-foreground">
              Your coordinates: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
            </div>
          </div>
        )}

        {/* Show distance information if we have both locations */}
        {currentLocation && classItem.location && !isVerifyingLocation && !verificationResult && (
          <div className="p-3 bg-amber-50 rounded-md mb-4 text-sm">
            <div className="flex items-center text-amber-700 mb-2">
              <Info className="h-5 w-5 mr-2" />
              <span className="font-medium">Distance Check</span>
            </div>
            
            {(() => {
              // Calculate distance between user and class location
              const R = 6371e3; // Earth radius in meters
              const φ1 = currentLocation.latitude * Math.PI / 180;
              const φ2 = classItem.location.latitude * Math.PI / 180;
              const Δφ = (classItem.location.latitude - currentLocation.latitude) * Math.PI / 180;
              const Δλ = (classItem.location.longitude - currentLocation.longitude) * Math.PI / 180;
              
              const a = 
                Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
              
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              const distance = Math.round(R * c); // Distance in meters
              
              // Default threshold if not specified in class
              const threshold = classItem.distanceThreshold || 100;
              const withinRange = distance <= threshold;
              
              // Determine the percentage for the progress bar (capped at 100%)
              const percentage = Math.min(100, Math.round((threshold / distance) * 100));
              
              return (
                <>
                  <div className="mb-2">
                    <div className="flex justify-between mb-1 text-xs">
                      <span>Current distance: <span className="font-medium">{distance}m</span></span>
                      <span>Threshold: <span className="font-medium">{threshold}m</span></span>
                    </div>
                    
                    {/* Progress bar showing distance as percentage of threshold */}
                    <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                      <div 
                        className={`h-2 rounded-full ${withinRange ? 'bg-green-500' : 'bg-amber-500'}`}
                        style={{ width: `${withinRange ? 100 : percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className={`text-sm ${withinRange ? 'text-green-700' : 'text-amber-700'}`}>
                    {withinRange 
                      ? <span className="flex items-center"><CheckCircle className="h-4 w-4 mr-1" /> You're within the required distance range.</span>
                      : <span className="flex items-center"><AlertTriangle className="h-4 w-4 mr-1" /> You need to be closer to the class location.</span>}
                  </div>
                  
                  {/* Route map toggle button */}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => setShowRouteMap(!showRouteMap)}
                  >
                    <Map className="mr-2 h-4 w-4" />
                    {showRouteMap ? "Hide Route Map" : "Show Route to Class"}
                  </Button>
                </>
              );
            })()}
          </div>
        )}
        
        {/* Show route map if enabled */}
        {showRouteMap && currentLocation && classItem.location && (
          <StudentRouteMap
            classLocation={classItem.location}
            currentLocation={currentLocation}
            distanceToClass={calculateDistanceToClass()}
            distanceThreshold={classItem.distanceThreshold || 100}
            onUpdateLocation={handleLocationUpdate}
          />
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setIsQrModalOpen(true)}
          disabled={!!hasExistingAttendance}
        >
          <QrCodeIcon className="mr-2 h-4 w-4" /> QR Scan
        </Button>
        
        {classItem.location && (
          <Button 
            onClick={handleLocationCheckIn} 
            disabled={isVerifyingLocation || !!hasExistingAttendance}
          >
            {isVerifyingLocation ? (
              <LoadingSpinner text="" className="mr-2" />
            ) : (
            <MapPin className="mr-2 h-4 w-4" /> 
            )}
            {isVerifyingLocation ? "Verifying..." : "Mark Attendance"}
          </Button>
        )}
      </CardFooter>
      
      {classItem.qrCodeValue && (
          <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
            <DialogTrigger asChild>
            <Button variant="outline" disabled={!!hasExistingAttendance} className="w-full sm:w-auto">
                <QrCodeIcon className="mr-2 h-4 w-4" /> Mark Attendance (QR)
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Scan QR Code</DialogTitle>
                <DialogDescription>
                  Scan the QR code displayed by your lecturer or enter the code manually.
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="scanner" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="scanner">Camera</TabsTrigger>
                  <TabsTrigger value="upload">Upload</TabsTrigger>
                  <TabsTrigger value="manual">Manual</TabsTrigger>
                </TabsList>
                
                <TabsContent value="scanner" className="space-y-4 py-4">
                  <QrScanner 
                    onScanSuccess={handleQrScanSuccess} 
                    onScanError={handleQrScanError} 
                  />
                  {qrScanError && (
                    <p className="text-sm text-destructive flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-1"/>{qrScanError}
                    </p>
                  )}
                </TabsContent>
                
                <TabsContent value="upload" className="space-y-4 py-4">
                  <div className="flex flex-col items-center space-y-4">
                    <Button 
                      variant="outline" 
                      className="w-full h-24 border-dashed"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <span>Upload QR code image</span>
                      </div>
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleQrFileSelect}
                    />
                    {qrScanError && (
                      <p className="text-sm text-destructive flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-1"/>{qrScanError}
                      </p>
                    )}
                    <div id="qr-reader-hidden" style={{ display: 'none' }}></div>
                  </div>
                </TabsContent>
                
                <TabsContent value="manual" className="space-y-4 py-4">
                 <Input 
                    type="text" 
                    placeholder="Enter QR code value" 
                    value={qrCodeInput}
                    onChange={(e) => setQrCodeInput(e.target.value)} 
                  />
                  {verificationResult && !verificationResult.success && (
                    <p className="text-sm text-destructive flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-1"/>{verificationResult.message}
                    </p>
                  )}
                  <Button onClick={handleManualQrSubmit} className="w-full">Submit Code</Button>
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsQrModalOpen(false)}>Cancel</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
    </Card>
  );
}
