"use client";

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { CameraIcon, ScanLine } from 'lucide-react';

interface QrScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
}

export default function QrScanner({ onScanSuccess, onScanError }: QrScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId = "qr-reader";

  useEffect(() => {
    // Cleanup function for component unmount
    return () => {
      if (qrScannerRef.current && qrScannerRef.current.isScanning) {
        qrScannerRef.current.stop().catch(err => console.error("Error stopping scanner:", err));
      }
    };
  }, []);

  const startScanner = () => {
    if (!qrScannerRef.current) {
      qrScannerRef.current = new Html5Qrcode(scannerDivId);
    }

    // Improve configuration for better detection
    const config = { 
      fps: 15,  // Higher frames per second
      qrbox: { width: 200, height: 200 }, // Slightly smaller scan area for better focus
      aspectRatio: 1.0,
      formatsToSupport: [ Html5Qrcode.FORMATS.QR_CODE ],
      disableFlip: false,
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true
      }
    };

    setIsScanning(true);
    qrScannerRef.current.start(
      { facingMode: "environment" }, // Use back camera on mobile
      config,
      (decodedText) => {
        console.log("QR code detected:", decodedText);
        onScanSuccess(decodedText);
        stopScanner();
      },
      (errorMessage) => {
        // Only report non-detection errors to the user
        if (!errorMessage.includes("No MultiFormat Readers were able to detect")) {
          console.log("Scanner error:", errorMessage);
          if (onScanError) {
            onScanError(errorMessage);
          }
        }
      }
    ).catch(err => {
      console.error("Error starting scanner:", err);
      if (onScanError) {
        onScanError("Failed to start camera. Please ensure camera permissions are granted.");
      }
      setIsScanning(false);
    });
  };

  const stopScanner = () => {
    if (qrScannerRef.current && qrScannerRef.current.isScanning) {
      qrScannerRef.current.stop().then(() => {
        setIsScanning(false);
      }).catch(err => {
        console.error("Error stopping scanner:", err);
        setIsScanning(false);
      });
    }
  };

  return (
    <div className="space-y-4">
      <div id={scannerDivId} className="w-full max-w-sm mx-auto overflow-hidden rounded-lg border border-muted-foreground/20 bg-black/5"></div>
      
      {!isScanning ? (
        <Button 
          className="w-full" 
          onClick={startScanner}
        >
          <CameraIcon className="mr-2 h-4 w-4" /> Start Camera
        </Button>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-center text-muted-foreground animate-pulse flex items-center justify-center">
            <ScanLine className="mr-1 h-4 w-4" />
            Scanning for QR code... Position the code in the camera view
          </div>
          <Button 
            className="w-full" 
            variant="outline" 
            onClick={stopScanner}
          >
            Stop Camera
          </Button>
        </div>
      )}
    </div>
  );
} 