"use client";

import { useState, useEffect } from 'react';
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
import { MapPin, QrCodeIcon, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

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

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const userLocation: GeoLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        const verificationInput: VerifyLocationInput = {
          userLatitude: userLocation.latitude,
          userLongitude: userLocation.longitude,
          lectureLatitude: classInstance.location!.latitude,
          lectureLongitude: classInstance.location!.longitude,
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
      },
      (error) => {
        console.error("Geolocation error:", error);
        let message = "Could not get your location. Please ensure location services are enabled.";
        if (error.code === error.PERMISSION_DENIED) message = "Location permission denied. Please enable it in your browser settings.";
        setVerificationResult({success: false, message});
        toast({ title: "Geolocation Error", description: message, variant: "destructive" });
        setIsVerifyingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
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
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2 justify-end">
        {classInstance.location && (
          <Button onClick={handleLocationCheckIn} disabled={isVerifyingLocation || !!existingAttendance} className="w-full sm:w-auto">
            <MapPin className="mr-2 h-4 w-4" /> Mark Attendance (Location)
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
                  Enter the value from the QR code shown by your lecturer.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                 <Input 
                    type="text" 
                    placeholder="Enter QR code value" 
                    value={qrCodeInput}
                    onChange={(e) => setQrCodeInput(e.target.value)} 
                  />
                  {verificationResult && !verificationResult.success && (
                     <p className="text-sm text-destructive flex items-center"><AlertTriangle className="h-4 w-4 mr-1"/>{verificationResult.message}</p>
                  )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsQrModalOpen(false)}>Cancel</Button>
                <Button onClick={handleQrCheckIn}>Submit QR</Button>
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
