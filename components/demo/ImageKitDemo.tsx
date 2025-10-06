'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  CheckCircle,
  AlertCircle,
  Info,
  Image as ImageIcon,
  FileText,
  Settings
} from 'lucide-react';

interface UploadResult {
  success: boolean;
  url?: string;
  fileId?: string;
  fileName?: string;
  size?: number;
  error?: string;
}

export default function ImageKitDemo() {
  const [authParams, setAuthParams] = useState<any>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Get authentication parameters on component mount
  useEffect(() => {
    fetchAuthParams();
  }, []);

  const fetchAuthParams = async () => {
    try {
      const response = await fetch('/api/v1/imagekit/auth');
      const data = await response.json();
      if (data.success) {
        setAuthParams(data);
      }
    } catch (error) {
      console.error('Failed to fetch auth params:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadResult(null);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('fileName', selectedFile.name);
      formData.append('folder', '/gosa-convention/demo');
      formData.append('tags', 'demo,test,gosa-2025');
      formData.append('uploadType', 'general');

      const response = await fetch('/api/v1/imagekit/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setUploadResult({
          success: true,
          url: data.data.url,
          fileId: data.data.fileId,
          fileName: data.data.name,
          size: data.data.size,
        });
      } else {
        setUploadResult({
          success: false,
          error: data.error || 'Upload failed',
        });
      }
    } catch (error) {
      setUploadResult({
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSampleURL = () => {
    // Generate a sample URL with transformations using your ImageKit endpoint
    const baseURL = 'https://ik.imagekit.io/zy6mjyaq3';
    const samplePath = '/default-image.jpg';
    const transformations = 'tr:w-400,h-300,q-80,f-webp';

    return `${baseURL}${samplePath}?${transformations}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          ImageKit Integration Demo
        </h1>
        <p className="text-gray-600">
          Testing ImageKit integration with your GOSA Convention System
        </p>
      </div>

      {/* Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>ImageKit Public Key</span>
              <Badge variant="default">
                public_jsrzY4E4aieuqJC6kXRjFN4ThpM=
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>ImageKit URL Endpoint</span>
              <Badge variant="default">
                https://ik.imagekit.io/zy6mjyaq3
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Storage Provider</span>
              <Badge variant="default">
                ImageKit
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Authentication Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Authentication Test
          </CardTitle>
        </CardHeader>
        <CardContent>
          {authParams ? (
            <div className="space-y-2">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  ✅ Authentication successful! Token generated and ready for uploads.
                </AlertDescription>
              </Alert>
              <div className="text-sm text-gray-600">
                <p>Token: {authParams.token?.substring(0, 20)}...</p>
                <p>Expires: {new Date(authParams.expire * 1000).toLocaleString()}</p>
              </div>
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to generate authentication parameters. Check your ImageKit configuration.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* URL Generation Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            URL Generation Test
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Sample URL with transformations (400x300, quality 80, WebP format):
            </p>
            <div className="p-3 bg-gray-100 rounded-lg font-mono text-sm break-all">
              {generateSampleURL()}
            </div>
            <Button
              variant="outline"
              onClick={() => window.open(generateSampleURL(), '_blank')}
            >
              Test URL in New Tab
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* File Upload Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            File Upload Test
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <input
                type="file"
                onChange={handleFileSelect}
                accept="image/*,application/pdf,.txt"
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Select an image, PDF, or text file to test upload
              </p>
            </div>

            {selectedFile && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-gray-600">
                  {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type}
                </p>
              </div>
            )}

            <Button
              onClick={uploadFile}
              disabled={!selectedFile || loading}
              className="w-full"
            >
              {loading ? 'Uploading...' : 'Upload to ImageKit'}
            </Button>

            {uploadResult && (
              <div className="mt-4">
                {uploadResult.success ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p>✅ Upload successful!</p>
                        <div className="text-sm">
                          <p><strong>File:</strong> {uploadResult.fileName}</p>
                          <p><strong>Size:</strong> {uploadResult.size} bytes</p>
                          <p><strong>File ID:</strong> {uploadResult.fileId}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(uploadResult.url, '_blank')}
                        >
                          View Uploaded File
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      ❌ Upload failed: {uploadResult.error}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p><strong>Next Steps:</strong></p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Add your ImageKit private key to the .env file</li>
              <li>Test file uploads using the form above</li>
              <li>Check your ImageKit dashboard for uploaded files</li>
              <li>Integrate with your existing services</li>
            </ol>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}