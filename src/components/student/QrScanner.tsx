"use client";

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { CameraIcon, ScanLine, FlipHorizontal } from 'lucide-react';

interface QrScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
}

export default function QrScanner({ onScanSuccess, onScanError }: QrScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId = "qr-reader";
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  useEffect(() => {
    // Cleanup function for component unmount
    return () => {
      if (qrScannerRef.current && qrScannerRef.current.isScanning) {
        qrScannerRef.current.stop().catch(err => console.error("Error stopping scanner:", err));
      }
    };
  }, []);

  const toggleCamera = () => {
    if (isScanning && qrScannerRef.current) {
      // Stop current scanner
      stopScanner();
      
      // Toggle camera facing mode
      setFacingMode(facingMode === "environment" ? "user" : "environment");
      
      // Short delay before restarting to allow camera to fully stop
      setTimeout(() => {
        startScanner(facingMode === "environment" ? "user" : "environment");
      }, 300);
    }
  };

  const startScanner = (cameraFacing: "environment" | "user" = facingMode) => {
    try {
      if (!qrScannerRef.current) {
        qrScannerRef.current = new Html5Qrcode(scannerDivId);
      }

      // Improve configuration for better detection
      const config = { 
        fps: 15,  // Higher frames per second
        qrbox: { width: 200, height: 200 }, // Slightly smaller scan area for better focus
        aspectRatio: 1.0,
        disableFlip: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      };

      setIsScanning(true);
      qrScannerRef.current.start(
        { facingMode: cameraFacing },
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
    } catch (error) {
      console.error("Scanner initialization error:", error);
      if (onScanError) {
        onScanError("Failed to initialize QR scanner. Please try an image upload or manual entry.");
      }
      setIsScanning(false);
    }
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
          onClick={() => startScanner()}
        >
          <CameraIcon className="mr-2 h-4 w-4" /> Start Camera
        </Button>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-center text-muted-foreground animate-pulse flex items-center justify-center">
            <ScanLine className="mr-1 h-4 w-4" />
            Scanning for QR code... Position the code in the camera view
          </div>
          <div className="flex gap-2">
            <Button 
              className="flex-1" 
              variant="outline" 
              onClick={stopScanner}
            >
              Stop Camera
            </Button>
            <Button
              className="w-12"
              size="icon"
              variant="ghost"
              onClick={toggleCamera}
              title={`Switch to ${facingMode === "environment" ? "front" : "back"} camera`}
            >
              <FlipHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 