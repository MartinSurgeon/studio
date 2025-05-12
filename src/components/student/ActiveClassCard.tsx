"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import type { Class, GeoLocation, AttendanceRecord } from '@/lib/types';
import { useAppContext } from '@/contexts/AppContext';
import { STUDENT_MOCK_ID } from '@/config';
import { verifyLocation, type VerifyLocationInput, type VerifyLocationOutput } from '@/ai/flows/verify-location';
import { useToast } from "@/hooks/use-toast";
import { Input } from '@/components/ui/input';
import LoadingSpinner from '@/components/core/LoadingSpinner';
import { MapPin, QrCodeIcon, CheckCircle, XCircle, AlertTriangle, Info, Upload } from 'lucide-react';
import QrScanner from './QrScanner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ActiveClassCardProps {
  classInstance: Class;
  onMarkAttendance: (record: AttendanceRecord) => void;
  existingAttendance?: AttendanceRecord;
}

export default function ActiveClassCard({ classInstance, onMarkAttendance, existingAttendance }: ActiveClassCardProps) {
  const { testingMode, userRole } = useAppContext();
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (classInstance.location && !existingAttendance) {
      getUserLocation();
    }
  }, [classInstance.location, existingAttendance]);

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    setIsGettingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation: GeoLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setCurrentLocation(userLocation);
        setLocationAccuracy(position.coords.accuracy);
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
        
        setLocationError(errorMessage);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleLocationCheckIn = async () => {
    if (!classInstance.location) {
      toast({ title: "Location Error", description: "This class does not support location-based check-in.", variant: "destructive" });
      return;
    }
    
    setIsVerifyingLocation(true);
    setVerificationResult(null);

    if (testingMode) {
      setTimeout(() => { // Simulate network delay
        const mockUserLocation: GeoLocation = { latitude: classInstance.location!.latitude, longitude: classInstance.location!.longitude };
        const attendanceRecord: AttendanceRecord = {
          id: `att_${Date.now()}`,
          classId: classInstance.id,
          studentId: STUDENT_MOCK_ID, // Replace with actual student ID if available
          checkInTime: new Date().toISOString(),
          status: 'Present', // Implement late logic if needed
          verificationMethod: 'Location',
          verifiedLocation: mockUserLocation,
        };
        onMarkAttendance(attendanceRecord);
        setVerificationResult({success: true, message: "Attendance marked (Testing Mode)."});
        toast({ title: "Attendance Marked (Testing)", description: `Successfully checked in for ${classInstance.name}.` });
        setIsVerifyingLocation(false);
      }, 1000);
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

    const verificationInput: VerifyLocationInput = {
      userLatitude: userLocation.latitude,
      userLongitude: userLocation.longitude,
      lectureLatitude: classInstance.location.latitude,
      lectureLongitude: classInstance.location.longitude,
      distanceThreshold: classInstance.distanceThreshold,
    };

    try {
      const result: VerifyLocationOutput = await verifyLocation(verificationInput);
      if (result.isLocationValid) {
        const attendanceRecord: AttendanceRecord = {
          id: `att_${Date.now()}`,
          classId: classInstance.id,
          studentId: STUDENT_MOCK_ID,
          checkInTime: new Date().toISOString(),
          status: 'Present',
          verificationMethod: 'Location',
          verifiedLocation: userLocation,
        };
        onMarkAttendance(attendanceRecord);
        setVerificationResult({success: true, message: `Location verified! Distance: ${result.distance.toFixed(0)}m. ${result.message}`});
        toast({ title: "Attendance Marked", description: `Successfully checked in for ${classInstance.name}.` });
      } else {
        setVerificationResult({success: false, message: `Location mismatch. Distance: ${result.distance.toFixed(0)}m. ${result.message}`});
        toast({ title: "Location Verification Failed", description: result.message, variant: "destructive" });
      }
    } catch (error) {
      console.error("AI Location verification error:", error);
      setVerificationResult({success: false, message: "Error verifying location. Please try again."});
      toast({ title: "Verification Error", description: "Could not verify location.", variant: "destructive" });
    } finally {
      setIsVerifyingLocation(false);
    }
  };

  const handleQrScanSuccess = (decodedText: string) => {
    if (!classInstance.qrCodeValue || !classInstance.qrCodeExpiry) {
      toast({ title: "QR Error", description: "QR code not available for this class.", variant: "destructive" });
      return;
    }
    
    if (Date.now() > classInstance.qrCodeExpiry) {
      toast({ title: "QR Expired", description: "The QR code for this class has expired.", variant: "destructive" });
      setVerificationResult({success: false, message: "QR Code Expired."});
      return;
    }
    
    if (decodedText === classInstance.qrCodeValue) {
      const attendanceRecord: AttendanceRecord = {
        id: `att_${Date.now()}`,
        classId: classInstance.id,
        studentId: STUDENT_MOCK_ID,
        checkInTime: new Date().toISOString(),
        status: 'Present',
        verificationMethod: 'QR',
      };
      onMarkAttendance(attendanceRecord);
      setVerificationResult({success: true, message: "QR Code verified successfully."});
      toast({ title: "Attendance Marked", description: `Successfully checked in for ${classInstance.name} via QR code.` });
      setIsQrModalOpen(false);
    } else {
      setVerificationResult({success: false, message: "Invalid QR Code."});
      toast({ title: "QR Verification Failed", description: "The scanned QR code is incorrect.", variant: "destructive" });
    }
  };

  const handleQrScanError = (error: string) => {
    setQrScanError(error);
  };

  const handleQrCheckIn = () => {
    if (!classInstance.qrCodeValue || !classInstance.qrCodeExpiry) {
      toast({ title: "QR Error", description: "QR code not available for this class.", variant: "destructive" });
      return;
    }
    if (Date.now() > classInstance.qrCodeExpiry) {
      toast({ title: "QR Expired", description: "The QR code for this class has expired.", variant: "destructive" });
      setVerificationResult({success: false, message: "QR Code Expired."});
      return;
    }
    if (qrCodeInput === classInstance.qrCodeValue) {
      const attendanceRecord: AttendanceRecord = {
        id: `att_${Date.now()}`,
        classId: classInstance.id,
        studentId: STUDENT_MOCK_ID,
        checkInTime: new Date().toISOString(),
        status: 'Present',
        verificationMethod: 'QR',
      };
      onMarkAttendance(attendanceRecord);
      setVerificationResult({success: true, message: "QR Code verified successfully."});
      toast({ title: "Attendance Marked", description: `Successfully checked in for ${classInstance.name} via QR code.` });
      setIsQrModalOpen(false);
      setQrCodeInput('');
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

  if (userRole !== 'student') return null;

  if (existingAttendance) {
    return (
       <Card className="shadow-md bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-green-700">{classInstance.name}</CardTitle>
          <CardDescription>Lecturer: {classInstance.lecturerId}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-6">
            <CheckCircle className="h-10 w-10 text-green-500 mr-3" />
            <div>
                <p className="font-semibold text-green-600">Attendance Marked!</p>
                <p className="text-sm text-green-500">Checked in at: {new Date(existingAttendance.checkInTime).toLocaleTimeString()}</p>
                <p className="text-sm text-green-500">Method: {existingAttendance.verificationMethod}</p>
            </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">{classInstance.name}</CardTitle>
        <CardDescription>Lecturer: {classInstance.lecturerId}</CardDescription>
        <CardDescription>Starts: {new Date(classInstance.startTime).toLocaleTimeString()}</CardDescription>
      </CardHeader>
      <CardContent>
        {verificationResult && (
          <div className={`p-3 rounded-md mb-4 text-sm flex items-center ${verificationResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {verificationResult.success ? <CheckCircle className="h-5 w-5 mr-2" /> : <XCircle className="h-5 w-5 mr-2" />}
            {verificationResult.message}
          </div>
        )}
        
        {isVerifyingLocation && <LoadingSpinner text="Verifying your location..." />}
        
        {isGettingLocation && <LoadingSpinner text="Getting your location..." />}
        
        {locationError && (
          <div className="p-3 rounded-md mb-4 text-sm flex items-center bg-red-100 text-red-700">
            <AlertTriangle className="h-5 w-5 mr-2" />
            {locationError}
          </div>
        )}
        
        {currentLocation && classInstance.location && !isVerifyingLocation && !verificationResult && (
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
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2 justify-end">
        {classInstance.location && (
          <Button 
            onClick={handleLocationCheckIn} 
            disabled={isVerifyingLocation || !!existingAttendance || isGettingLocation} 
            className="w-full sm:w-auto"
          >
            <MapPin className="mr-2 h-4 w-4" /> 
            {locationError ? "Retry Location" : "Mark Attendance (Location)"}
          </Button>
        )}
        {classInstance.qrCodeValue && (
          <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={!!existingAttendance} className="w-full sm:w-auto">
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
                  <Button onClick={handleQrCheckIn} className="w-full">Submit Code</Button>
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsQrModalOpen(false)}>Cancel</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        {!classInstance.location && !classInstance.qrCodeValue && (
            <div className="p-3 rounded-md text-sm flex items-center bg-yellow-100 text-yellow-700 border border-yellow-300 w-full">
                <Info className="h-5 w-5 mr-2" />
                This class has no active check-in methods (Location or QR).
            </div>
        )}
      </CardFooter>
    </Card>
  );
}
