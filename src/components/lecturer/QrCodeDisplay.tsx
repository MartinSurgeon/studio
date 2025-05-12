"use client";

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Class } from '@/lib/types';
import { QR_CODE_EXPIRY_MS } from '@/config';
import { RefreshCw, QrCodeIcon, Clock } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface QrCodeDisplayProps {
  classInstance: Class;
  onUpdateClass: (updatedClass: Class) => void;
}

export default function QrCodeDisplay({ classInstance, onUpdateClass }: QrCodeDisplayProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const { toast } = useToast();

  const generateNewQrCode = useCallback(() => {
    const newQrCodeValue = `geoattend_${classInstance.id}_${Date.now()}`;
    const newQrCodeExpiry = Date.now() + QR_CODE_EXPIRY_MS;
    onUpdateClass({ ...classInstance, qrCodeValue: newQrCodeValue, qrCodeExpiry: newQrCodeExpiry });
    toast({ title: "QR Code Refreshed", description: "A new QR code has been generated." });
  }, [classInstance, onUpdateClass, toast]);

  useEffect(() => {
    if (!classInstance.qrCodeValue || !classInstance.qrCodeExpiry || classInstance.qrCodeExpiry <= Date.now()) {
      // Generate initial or if expired on load
      if (classInstance.active) { // Only generate if class is active
         generateNewQrCode();
      }
    }
  }, [classInstance.active, classInstance.qrCodeValue, classInstance.qrCodeExpiry, generateNewQrCode]);


  useEffect(() => {
    if (!classInstance.qrCodeExpiry || !classInstance.active) {
      setTimeLeft(0);
      return;
    }

    const calculateTimeLeft = () => {
      const now = Date.now();
      const expiry = classInstance.qrCodeExpiry!;
      const remaining = Math.max(0, expiry - now);
      setTimeLeft(remaining);

      if (remaining === 0) {
        // Optionally auto-refresh or prompt lecturer
        // For now, just indicates expiry
        onUpdateClass({ ...classInstance, qrCodeValue: undefined, qrCodeExpiry: undefined }); // Clear expired QR
      }
    };

    calculateTimeLeft(); // Initial calculation
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [classInstance.qrCodeExpiry, classInstance.active, onUpdateClass]);


  const progressValue = (timeLeft / QR_CODE_EXPIRY_MS) * 100;
  const minutesLeft = Math.floor(timeLeft / 60000);
  const secondsLeft = Math.floor((timeLeft % 60000) / 1000);

  if (!classInstance.active) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><QrCodeIcon className="mr-2 h-6 w-6 text-primary" /> QR Code</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Class is not active. Start the class to generate a QR code.</p>
        </CardContent>
      </Card>
    );
  }
  
  const qrApiUrl = classInstance.qrCodeValue 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(classInstance.qrCodeValue)}&format=svg`
    : `https://picsum.photos/250/250?blur`; // Placeholder if no QR value

  return (
    <Card className="w-full max-w-sm text-center shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-center"><QrCodeIcon className="mr-2 h-7 w-7 text-primary" /> QR Code Attendance</CardTitle>
        <CardDescription>Students can scan this code to mark attendance.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center items-center bg-muted p-4 rounded-lg aspect-square w-full max-w-[250px] mx-auto">
          {classInstance.qrCodeValue ? (
             <Image 
                src={qrApiUrl} 
                alt="Attendance QR Code" 
                width={250} 
                height={250} 
                data-ai-hint="qr code"
                className="rounded-md"
                unoptimized={true} // Necessary for external SVG from qrserver
              />
          ) : (
            <div className="w-[250px] h-[250px] flex items-center justify-center text-muted-foreground">
              <p>QR code will appear here.</p>
            </div>
          )}
        </div>

        {classInstance.qrCodeValue && timeLeft > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-center text-sm text-muted-foreground">
              <Clock className="mr-1.5 h-4 w-4" />
              Expires in: {minutesLeft}m {secondsLeft}s
            </div>
            <Progress value={progressValue} className="w-full h-2" />
          </div>
        )}
        {(!classInstance.qrCodeValue || timeLeft === 0) && (
            <p className="text-destructive text-sm">QR Code expired or not generated.</p>
        )}

        <Button onClick={generateNewQrCode} className="w-full" disabled={!classInstance.active}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh QR Code
        </Button>
      </CardContent>
    </Card>
  );
}
