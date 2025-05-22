import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import type { Class, AttendanceRecord } from '@/lib/types';
import { attendanceService } from '@/lib/services/attendance.service';
import QrScanner from './QrScanner';
import { MapPin, QrCode, Fingerprint, Camera, CreditCard } from 'lucide-react';
import LoadingSpinner from '@/components/core/LoadingSpinner';

interface AttendanceVerificationProps {
  classInstance: Class;
  studentId: string;
  onAttendanceMarked: (record: AttendanceRecord) => void;
}

export default function AttendanceVerification({ classInstance, studentId, onAttendanceMarked }: AttendanceVerificationProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('qr');

  const handleQrScan = async (decodedText: string) => {
    if (!classInstance.qrCodeValue || !classInstance.qrCodeExpiry) {
      toast({ title: 'QR Error', description: 'QR code not available for this class.', variant: 'destructive' });
      return;
    }

    if (Date.now() > classInstance.qrCodeExpiry) {
      toast({ title: 'QR Expired', description: 'The QR code for this class has expired.', variant: 'destructive' });
      return;
    }

    if (decodedText === classInstance.qrCodeValue) {
      try {
        setIsLoading(true);
        const newRecord: Omit<AttendanceRecord, 'id'> = {
          classId: classInstance.id,
          studentId,
          checkInTime: new Date().toISOString(),
          status: 'Present',
          verificationMethod: 'QR'
        };

        const savedRecord = await attendanceService.createAttendanceRecord(newRecord);
        if (savedRecord) {
          onAttendanceMarked(savedRecord);
          toast({ title: 'Success', description: 'Attendance marked successfully via QR code.' });
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to mark attendance',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      toast({ title: 'Invalid QR Code', description: 'The scanned QR code is incorrect.', variant: 'destructive' });
    }
  };

  const handleLocationVerification = async () => {
    try {
      setIsLoading(true);
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const currentLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      const result = await attendanceService.markAttendanceWithLocation(
        classInstance.id,
        studentId,
        currentLocation
      );

      if (result.success && result.record) {
        onAttendanceMarked(result.record);
        toast({ title: 'Success', description: 'Attendance marked successfully via location.' });
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Failed to mark attendance',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to get location',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricVerification = async () => {
    try {
      setIsLoading(true);
      // In a real implementation, you would get biometric data from the device
      const biometricData = 'sample_biometric_data';
      const result = await attendanceService.markAttendanceWithBiometric(
        classInstance.id,
        studentId,
        biometricData
      );

      if (result.success && result.record) {
        onAttendanceMarked(result.record);
        toast({ title: 'Success', description: 'Attendance marked successfully via biometric.' });
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Failed to mark attendance',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to verify biometrics',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacialVerification = async () => {
    try {
      setIsLoading(true);
      // In a real implementation, you would get facial data from the device camera
      const facialData = 'sample_facial_data';
      const result = await attendanceService.markAttendanceWithFacial(
        classInstance.id,
        studentId,
        facialData
      );

      if (result.success && result.record) {
        onAttendanceMarked(result.record);
        toast({ title: 'Success', description: 'Attendance marked successfully via facial recognition.' });
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Failed to mark attendance',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to verify face',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNFCVerification = async () => {
    try {
      setIsLoading(true);
      // In a real implementation, you would get NFC data from the device
      const nfcData = 'sample_nfc_data';
      const result = await attendanceService.markAttendanceWithNFC(
        classInstance.id,
        studentId,
        nfcData
      );

      if (result.success && result.record) {
        onAttendanceMarked(result.record);
        toast({ title: 'Success', description: 'Attendance marked successfully via NFC.' });
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Failed to mark attendance',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to verify NFC',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mark Attendance</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 gap-4">
            <TabsTrigger value="qr">
              <QrCode className="h-4 w-4 mr-2" />
              QR Code
            </TabsTrigger>
            <TabsTrigger value="location">
              <MapPin className="h-4 w-4 mr-2" />
              Location
            </TabsTrigger>
            <TabsTrigger value="biometric">
              <Fingerprint className="h-4 w-4 mr-2" />
              Biometric
            </TabsTrigger>
            <TabsTrigger value="facial">
              <Camera className="h-4 w-4 mr-2" />
              Facial
            </TabsTrigger>
            <TabsTrigger value="nfc">
              <CreditCard className="h-4 w-4 mr-2" />
              NFC
            </TabsTrigger>
          </TabsList>

          <TabsContent value="qr" className="mt-4">
            <QrScanner onScanSuccess={handleQrScan} onScanError={(error) => console.error(error)} />
          </TabsContent>

          <TabsContent value="location" className="mt-4">
            <Button
              onClick={handleLocationVerification}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? <LoadingSpinner /> : 'Verify Location'}
            </Button>
          </TabsContent>

          <TabsContent value="biometric" className="mt-4">
            <Button
              onClick={handleBiometricVerification}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? <LoadingSpinner /> : 'Verify Biometric'}
            </Button>
          </TabsContent>

          <TabsContent value="facial" className="mt-4">
            <Button
              onClick={handleFacialVerification}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? <LoadingSpinner /> : 'Verify Face'}
            </Button>
          </TabsContent>

          <TabsContent value="nfc" className="mt-4">
            <Button
              onClick={handleNFCVerification}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? <LoadingSpinner /> : 'Scan NFC'}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 