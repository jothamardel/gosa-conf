"use client";

import { useState } from "react";
import { BadgeGenerator } from "@/components/badge/badge-generator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, Calendar, ImageIcon, MapPin, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

const DEMO_USER_ID = "";
const CONVENTION_YEAR = "2025";

export default function BadgePage() {
  const [previewData, setPreviewData] = useState({
    name: "",
    imageUrl: "",
    title: "ATTENDEE", // Default title
  });
  const [showPreview, setShowPreview] = useState(true); // New state to control preview visibility

  const now = new Date();
  const handleBadgeGenerated = (badge: any) => {
    setShowPreview(false); // Hide preview when badge is generated
    triggerDownload();
  };

  const handlePreviewUpdate = (name: string, imageUrl: string) => {
    setPreviewData((prev) => ({
      ...prev,
      name,
      imageUrl,
    }));
    setShowPreview(true); // Show preview when data is being updated
  };

  const triggerDownload = () => {
    if (!previewData.imageUrl || !previewData.name) return;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-green-50">
      {/* Header */}
      <header className="text-black">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-4 mb-4 md:mb-0">
              <Link href="/">
                <Image
                  src="/images/gosa.png"
                  alt="GOSA Logo"
                  width={48}
                  height={48}
                  className=" border-2 border-white"
                />
              </Link>
              <div>
                <h1 className="text-2xl font-bold">
                  GOSA Convention {CONVENTION_YEAR}
                </h1>
                <p className="text-yellow-800">Create Your Digital Badge</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="bg-white/10 hover:bg-white/20 hidden md-flex border-green-600"
            >
              <Badge className="mr-2 h-4 w-4" />
              My Badges
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left side - Form */}
          <div className={showPreview ? "lg:w-1/2" : "lg:w-full"}>
            <Card className="border-none shadow-none bg-transparent">
              <CardContent className="bg-white rounded-lg p-6 shadow-md">
                <BadgeGenerator
                  userId={DEMO_USER_ID}
                  onBadgeGenerated={handleBadgeGenerated}
                  onPreviewUpdate={handlePreviewUpdate}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right side - Preview - Only shown when showPreview is true */}
          {showPreview && (
            <div className="lg:w-1/2 sticky top-4 h-fit">
              <Card className="border border-gray-200 bg-white shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-gray-700 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-green-600" />
                    Badge Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center relative">
                    <div className="overflow-hidden w-full max-w-xs rounded-xl bg-gradient-to-b from-green-100 to-yellow-50 p-6 text-center border-2 border-green-200 shadow-inner">
                      {/* Badge Design */}
                      {/*<div
                          className="absolute bg-cover bg-center bg-no-repeat"
                          style={{
                            backgroundImage: "url('/images/gosa.png')", // Replace with your image path
                          }}
                          />*/}
                      <div className="mb-6">
                        <div className="flex flex-col  items-center justify-center mb-2">
                          <div className="w-18 h-18 object-contain rounded-full flex justify-center items-center">
                            <Image
                              src={"/images/gosa.png"}
                              alt="GOSA Logo"
                              width={48}
                              height={48}
                              className=" "
                            />
                          </div>
                          <p className="text-lg font-medium text-green-800">
                            GOSA Convention {now.getFullYear()}
                          </p>
                        </div>

                        <div className="h-1 bg-gradient-to-r from-green-500 to-yellow-500 w-16 mx-auto mb-2 rounded-full"></div>
                        <h3 className="text-sm font-semibold uppercase tracking-widest text-green-600">
                          {previewData.title}
                        </h3>
                      </div>

                      {/* Profile Image */}
                      <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-yellow-100 to-green-100 border-4 border-yellow-300 overflow-hidden mx-auto mb-4 shadow-md">
                        {previewData.imageUrl ? (
                          <img
                            src={previewData.imageUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Upload className="w-8 h-8" />
                          </div>
                        )}
                      </div>

                      {/* Name */}
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold text-green-900">
                          {previewData.name || "Your Name"}
                        </h2>
                        <p className="text-green-700 mt-2 font-medium">
                          WILL BE ATTENDING
                        </p>
                      </div>

                      {/* Convention Info */}
                      <div className="border-t border-green-200 pt-4 space-y-2">
                        <div className="flex items-center justify-center gap-2 text-green-800">
                          <Calendar className="w-4 h-4" />
                          <p className="text-sm font-medium">
                            23rd - 25th August {CONVENTION_YEAR}
                          </p>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-green-800">
                          <MapPin className="w-4 h-4" />
                          <p className="text-sm font-medium">
                            GOSA Convention Center
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
