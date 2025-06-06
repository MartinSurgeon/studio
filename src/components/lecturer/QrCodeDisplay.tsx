"use client";

import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Class } from '@/lib/types';
import { QR_CODE_EXPIRY_MS } from '@/config';
import { RefreshCw, QrCodeIcon, Clock, Copy } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface QrCodeDisplayProps {
  classInstance: Class;
  onUpdateClass: (updatedClass: Class) => void;
}

export default function QrCodeDisplay({ classInstance, onUpdateClass }: QrCodeDisplayProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const { toast } = useToast();
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  // Function to safely dispatch class updated event
  const dispatchClassUpdatedEvent = (updatedClass: Class) => {
    // Only run this on the client side
    if (typeof window !== 'undefined') {
      // Use requestAnimationFrame to ensure this runs after hydration
      requestAnimationFrame(() => {
        const classEvent = new CustomEvent('class-updated', {
          detail: {
            classId: updatedClass.id,
            active: updatedClass.active,
            qrUpdated: true
          }
        });
        window.dispatchEvent(classEvent);
        console.log('QrCodeDisplay: Dispatched class-updated event for', updatedClass.id);
      });
    }
  };

  const generateNewQrCode = useCallback(() => {
    // Ensure we have a valid class ID to work with - it should be a UUID
    // If it already looks like a QR code, extract the original ID
    let classId = classInstance.id;
    if (classId.startsWith('QRCODE_') && classId.includes('_')) {
      console.warn('Attempted to use QR code as class ID in QrCodeDisplay, extracting original ID');
      classId = classId.split('_')[1];
    }
    
    // Generate QR code with the extracted or original ID
    const newQrCodeValue = `QRCODE_${classId.substring(0, 8)}_${Math.floor(Date.now()/1000).toString(36)}`;
    const newQrCodeExpiry = Date.now() + QR_CODE_EXPIRY_MS;
    const updatedClass = { ...classInstance, qrCodeValue: newQrCodeValue, qrCodeExpiry: newQrCodeExpiry };
    onUpdateClass(updatedClass);
    toast({ title: "QR Code Refreshed", description: "A new QR code has been generated." });
    
    // Notify students about class update with new QR code
    dispatchClassUpdatedEvent(updatedClass);
  }, [classInstance, onUpdateClass, toast]);

  useEffect(() => {
    // Generate a new QR code if one doesn't exist or is expired
    if (!classInstance.qrCodeValue || !classInstance.qrCodeExpiry || classInstance.qrCodeExpiry <= Date.now()) {
      // Generate initial or if expired on load
      if (classInstance.active) { // Only generate if class is active
        console.log("QrCodeDisplay: Generating new QR code for active class");
        generateNewQrCode();
      }
    }
  }, [classInstance.active, classInstance.qrCodeValue, classInstance.qrCodeExpiry, generateNewQrCode]);

  // Always generate a new QR code when the class becomes active
  useEffect(() => {
    if (classInstance.active) {
      console.log("QrCodeDisplay: Class is active, ensuring QR code exists");
      if (!classInstance.qrCodeValue || !classInstance.qrCodeExpiry || classInstance.qrCodeExpiry <= Date.now()) {
        generateNewQrCode();
      }
    }
  }, [classInstance.active, generateNewQrCode, classInstance.qrCodeValue, classInstance.qrCodeExpiry]);

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

  const copyQrValue = () => {
    if (classInstance.qrCodeValue) {
      navigator.clipboard.writeText(classInstance.qrCodeValue);
      toast({ title: "Copied!", description: "QR code value copied to clipboard" });
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 2000);
    }
  };

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
  
  return (
    <Card className="w-full max-w-sm text-center shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-center"><QrCodeIcon className="mr-2 h-7 w-7 text-primary" /> QR Code Attendance</CardTitle>
        <CardDescription>Students can scan this code to mark attendance.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center items-center bg-white p-6 rounded-lg aspect-square w-full max-w-[250px] mx-auto border-2 border-primary/10">
          {classInstance.qrCodeValue ? (
            <QRCodeSVG
              value={classInstance.qrCodeValue}
              size={250}
              bgColor="#ffffff"
              fgColor="#000000"
              level="M"
              includeMargin={true}
            />
          ) : (
            <div className="w-[250px] h-[250px] flex items-center justify-center text-muted-foreground">
              <p>QR code will appear here.</p>
            </div>
          )}
        </div>

        {classInstance.qrCodeValue && (
          <div className="text-sm text-muted-foreground flex items-center justify-center cursor-pointer hover:text-foreground" onClick={copyQrValue}>
            <span className="font-mono truncate max-w-[200px]">{classInstance.qrCodeValue}</span>
            <Copy className="ml-2 h-4 w-4" />
          </div>
        )}

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
