"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  QrCode,
  Camera,
  CheckCircle,
  XCircle,
  User,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface CheckInResult {
  success: boolean;
  attendee?: {
    id: string;
    name: string;
    email: string;
    ticketType: string;
    registrationDate: string;
  };
  message: string;
  timestamp?: string;
  alreadyCheckedIn?: boolean;
}

export function CheckInScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [lastResult, setLastResult] = useState<CheckInResult | null>(null);
  const [recentCheckIns, setRecentCheckIns] = useState<CheckInResult[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);
      }
    } catch (error) {
      toast.error("Unable to access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const processQRCode = async (qrCode: string) => {
    try {
      // Simulate QR code validation
      // In a real implementation, this would call your backend API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock response based on QR code format
      const mockAttendee = {
        id: qrCode.substring(0, 8),
        name: "John Doe",
        email: "john.doe@example.com",
        ticketType: "Full Access + Dinner",
        registrationDate: "2025-10-15",
      };

      // Simulate different scenarios
      const scenarios = ["success", "already-checked", "invalid"];
      const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

      let result: CheckInResult;

      if (scenario === "success") {
        result = {
          success: true,
          attendee: mockAttendee,
          message: "Check-in successful!",
          timestamp: new Date().toISOString(),
        };
        toast.success("Attendee checked in successfully!");
      } else if (scenario === "already-checked") {
        result = {
          success: false,
          attendee: mockAttendee,
          message: "This attendee has already been checked in.",
          alreadyCheckedIn: true,
          timestamp: "2025-11-15T09:30:00Z",
        };
        toast.error("Attendee already checked in");
      } else {
        result = {
          success: false,
          message: "Invalid QR code or attendee not found.",
        };
        toast.error("Invalid QR code");
      }

      setLastResult(result);
      if (result.success) {
        setRecentCheckIns((prev) => [result, ...prev.slice(0, 4)]);
      }
    } catch (error) {
      toast.error("Error processing QR code");
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      await processQRCode(manualCode.trim());
      setManualCode("");
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Scanner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Camera Scanner */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Camera className="w-5 h-5 text-primary-600" />
              <span>Camera Scanner</span>
            </CardTitle>
            <CardDescription>
              Use your device camera to scan QR codes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              {isScanning ? (
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-64 bg-black rounded-lg object-cover"
                  />
                  <div className="absolute inset-0 border-2 border-primary-600 rounded-lg opacity-50">
                    <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-primary-600"></div>
                    <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-primary-600"></div>
                    <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-primary-600"></div>
                    <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-primary-600"></div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black/50 text-white px-4 py-2 rounded-lg">
                      Position QR code within the frame
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Camera not active</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex space-x-2">
              {!isScanning ? (
                <Button
                  onClick={startCamera}
                  className="flex-1 bg-gradient-to-r from-primary-600 to-secondary-500"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Start Camera
                </Button>
              ) : (
                <Button
                  onClick={stopCamera}
                  variant="outline"
                  className="flex-1"
                >
                  Stop Camera
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Manual Entry */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <QrCode className="w-5 h-5 text-secondary-600" />
              <span>Manual Entry</span>
            </CardTitle>
            <CardDescription>
              Manually enter QR code if camera scanning isn&apos;t available
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <Label htmlFor="manualCode">QR Code</Label>
                <Input
                  id="manualCode"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Enter QR code manually"
                  className="mt-1"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-secondary-600 to-primary-500"
                disabled={!manualCode.trim()}
              >
                Process Check-In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Last Result */}
      {lastResult && (
        <Card
          className={`glass-card border-l-4 ${lastResult.success ? "border-l-green-500" : "border-l-red-500"
            }`}
        >
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {lastResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <span>Check-In Result</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastResult.success && lastResult.attendee ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-lg">
                      {lastResult.attendee.name}
                    </h4>
                    <p className="text-gray-600">{lastResult.attendee.email}</p>
                  </div>
                  <Badge
                    variant="default"
                    className="bg-green-100 text-green-800"
                  >
                    Checked In
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Ticket Type:</span>
                    <p className="text-gray-600">
                      {lastResult.attendee.ticketType}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Registered:</span>
                    <p className="text-gray-600">
                      {new Date(
                        lastResult.attendee.registrationDate,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ) : lastResult.alreadyCheckedIn && lastResult.attendee ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-lg">
                      {lastResult.attendee.name}
                    </h4>
                    <p className="text-gray-600">{lastResult.attendee.email}</p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="bg-yellow-100 text-yellow-800"
                  >
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Already Checked In
                  </Badge>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Previous Check-in:</span>
                  <p className="text-gray-600">
                    {new Date(lastResult.timestamp!).toLocaleString()}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="text-red-600">{lastResult.message}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Check-ins */}
      {recentCheckIns.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-primary-600" />
              <span>Recent Check-ins</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentCheckIns.map((checkIn, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <User className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="font-medium">{checkIn.attendee?.name}</p>
                      <p className="text-sm text-gray-600">
                        {checkIn.attendee?.email}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant="default"
                      className="bg-green-100 text-green-800"
                    >
                      Checked In
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(checkIn.timestamp!).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
