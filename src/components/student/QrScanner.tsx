"use client";

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { CameraIcon, ScanLine, FlipHorizontal, AlertTriangle } from 'lucide-react';

interface QrScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
}

export default function QrScanner({ onScanSuccess, onScanError }: QrScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId = "qr-reader";
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  useEffect(() => {
    // Check camera permissions on component mount
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      // Check if running in secure context
      if (!window.isSecureContext) {
        setCameraError("Camera access requires a secure connection (HTTPS). Please try using another method.");
        if (onScanError) onScanError("Camera requires HTTPS");
        return;
      }
      
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          // Clean up the stream immediately as we just wanted to check permissions
          stream.getTracks().forEach(track => track.stop());
          setCameraError(null);
        })
        .catch(err => {
          console.error("Camera permission check failed:", err);
          let errorMessage;
          
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            errorMessage = "Camera access denied. Please enable camera permissions in your browser settings.";
          } else if (err.name === 'NotFoundError') {
            errorMessage = "No camera detected on this device.";
          } else if (err.name === 'NotSupportedError') {
            errorMessage = "Your browser doesn't fully support camera access. Please try Upload or Manual tab.";
          } else {
            errorMessage = "Camera not available. Please try another method.";
          }
          
          setCameraError(errorMessage);
          if (onScanError) onScanError(errorMessage);
        });
    } else {
      // More detailed error for unsupported browsers
      let errorMessage;
      if (typeof window !== 'undefined' && /android/i.test(window.navigator.userAgent)) {
        errorMessage = "Camera API not supported by this browser. Try using Chrome for Android instead.";
      } else {
        errorMessage = "Your browser doesn't support camera access. Please try the Upload or Manual tab.";
      }
      setCameraError(errorMessage);
      if (onScanError) onScanError("Camera API not supported by this browser");
    }

    // Cleanup function for component unmount
    return () => {
      if (qrScannerRef.current && qrScannerRef.current.isScanning) {
        qrScannerRef.current.stop().catch(err => console.error("Error stopping scanner:", err));
      }
    };
  }, [onScanError]);

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
    setCameraError(null);
    
    // First check if camera permission is granted
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: cameraFacing } })
        .then(stream => {
          // Clean up the stream as we just wanted to check permissions
          stream.getTracks().forEach(track => track.stop());
          
          // Now initialize the QR scanner
          initializeScanner(cameraFacing);
        })
        .catch(err => {
          console.error("Camera access error:", err);
          const errorMessage = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
            ? "Camera access denied. Please enable camera permissions in your browser settings."
            : "Failed to access camera. Please try another method.";
          setCameraError(errorMessage);
          if (onScanError) onScanError(errorMessage);
          setIsScanning(false);
        });
    } else {
      const errorMessage = "Your browser doesn't support camera access. Please try another method.";
      setCameraError(errorMessage);
      if (onScanError) onScanError(errorMessage);
      setIsScanning(false);
    }
  };

  const initializeScanner = (cameraFacing: "environment" | "user") => {
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
        let errorMessage = "Failed to start camera.";
        
        // More specific error messages
        if (err.toString().includes("permission")) {
          errorMessage = "Camera permission denied. Please enable it in your browser settings.";
        } else if (err.toString().includes("NotFoundError") || err.toString().includes("device")) {
          errorMessage = "No camera found or camera is already in use by another application.";
        } else if (err.toString().includes("streaming not supported")) {
          errorMessage = "Camera streaming not supported by this browser. Try uploading a QR image instead.";
        }
        
        setCameraError(errorMessage);
        if (onScanError) {
          onScanError(errorMessage);
        }
        setIsScanning(false);
      });
    } catch (error) {
      console.error("Scanner initialization error:", error);
      setCameraError("Failed to initialize QR scanner. Please try an image upload or manual entry.");
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
      
      {cameraError && (
        <div className="bg-red-50 p-3 rounded-md text-red-600 text-sm flex items-start">
          <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          <div>
            <p>{cameraError}</p>
            <p className="text-xs mt-1">Please use the Upload or Manual tab instead.</p>
          </div>
        </div>
      )}
      
      {!isScanning ? (
        <Button 
          className="w-full" 
          onClick={() => startScanner()}
          disabled={!!cameraError}
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