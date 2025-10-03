'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Camera,
  CameraOff,
  RotateCcw,
  Flashlight,
  FlashlightOff,
  QrCode
} from 'lucide-react';

interface QRScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
}

export default function QRScanner({ onScan, onError }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    checkCameraSupport();
    return () => {
      stopScanning();
    };
  }, []);

  const checkCameraSupport = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setHasCamera(videoDevices.length > 0);
    } catch (err) {
      setError('Camera access not supported');
      setHasCamera(false);
    }
  };

  const startScanning = async () => {
    try {
      setError(null);

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();

        videoRef.current.onloadedmetadata = () => {
          setIsScanning(true);
          startQRDetection();
        };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access camera';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);

    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startQRDetection = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    scanIntervalRef.current = setInterval(() => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const qrCode = detectQRCode(imageData);

        if (qrCode) {
          onScan(qrCode);
          stopScanning();
        }
      }
    }, 100);
  };

  // Simple QR code detection (in production, use a proper QR code library like jsQR)
  const detectQRCode = (imageData: ImageData): string | null => {
    try {
      // This is a placeholder - in production, use jsQR or similar library
      // For now, we'll simulate QR detection by looking for URL patterns in manual input
      return null;
    } catch (err) {
      return null;
    }
  };

  const toggleFlashlight = async () => {
    try {
      if (streamRef.current) {
        const track = streamRef.current.getVideoTracks()[0];
        const capabilities = track.getCapabilities();

        if (capabilities.torch) {
          await track.applyConstraints({
            advanced: [{ torch: !flashlightOn } as any]
          });
          setFlashlightOn(!flashlightOn);
        }
      }
    } catch (err) {
      console.error('Flashlight not supported:', err);
    }
  };

  const switchCamera = () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);

    if (isScanning) {
      stopScanning();
      setTimeout(() => startScanning(), 100);
    }
  };

  if (!hasCamera) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CameraOff className="h-5 w-5" />
            Camera Not Available
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Camera access is required to scan QR codes. Please ensure your device has a camera and grant permission when prompted.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          QR Code Scanner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="relative">
          <video
            ref={videoRef}
            className="w-full max-w-md mx-auto rounded-lg bg-black"
            style={{ aspectRatio: '4/3' }}
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />

          {isScanning && (
            <div className="absolute inset-0 border-2 border-green-500 rounded-lg pointer-events-none">
              <div className="absolute top-4 left-4 w-6 h-6 border-l-4 border-t-4 border-green-500"></div>
              <div className="absolute top-4 right-4 w-6 h-6 border-r-4 border-t-4 border-green-500"></div>
              <div className="absolute bottom-4 left-4 w-6 h-6 border-l-4 border-b-4 border-green-500"></div>
              <div className="absolute bottom-4 right-4 w-6 h-6 border-r-4 border-b-4 border-green-500"></div>
            </div>
          )}
        </div>

        <div className="flex justify-center gap-2">
          {!isScanning ? (
            <Button onClick={startScanning} className="bg-green-600 hover:bg-green-700">
              <Camera className="h-4 w-4 mr-2" />
              Start Scanning
            </Button>
          ) : (
            <Button onClick={stopScanning} variant="outline">
              <CameraOff className="h-4 w-4 mr-2" />
              Stop Scanning
            </Button>
          )}

          <Button onClick={switchCamera} variant="outline" size="icon">
            <RotateCcw className="h-4 w-4" />
          </Button>

          <Button onClick={toggleFlashlight} variant="outline" size="icon">
            {flashlightOn ? (
              <FlashlightOff className="h-4 w-4" />
            ) : (
              <Flashlight className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="text-center text-sm text-gray-600">
          <p>Position the QR code within the frame to scan</p>
          <p>Make sure the code is well-lit and clearly visible</p>
        </div>
      </CardContent>
    </Card>
  );
}