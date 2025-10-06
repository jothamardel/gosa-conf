'use client';

import React, { useState, useEffect } from 'react';
import AdminWrapper from '@/components/admin/admin-wrapper';

function ImageKitDemoContent() {
  const [status, setStatus] = useState<string>('Loading...');
  const [authParams, setAuthParams] = useState<any>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    testAuth();
  }, []);

  const testAuth = async () => {
    try {
      const response = await fetch('/api/v1/imagekit/auth');
      const data = await response.json();
      if (data.success) {
        setAuthParams(data);
        setStatus('✅ ImageKit authentication successful!');
      } else {
        setStatus('❌ Authentication failed: ' + data.error);
      }
    } catch (error) {
      setStatus('❌ Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
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

      const response = await fetch('/api/v1/imagekit/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setUploadResult(data);
    } catch (error) {
      setUploadResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">ImageKit Integration Demo</h1>
        <p className="text-gray-600">Testing ImageKit with GOSA Convention System</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Configuration Status</h2>
        <div className="space-y-2">
          <p><strong>Public Key:</strong> public_jsrzY4E4aieuqJC6kXRjFN4ThpM=</p>
          <p><strong>URL Endpoint:</strong> https://ik.imagekit.io/zy6mjyaq3</p>
          <p><strong>Status:</strong> {status}</p>
        </div>
      </div>

      {authParams && (
        <div className="bg-green-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Authentication Details</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Token:</strong> {authParams.token?.substring(0, 20)}...</p>
            <p><strong>Expires:</strong> {new Date(authParams.expire * 1000).toLocaleString()}</p>
            <p><strong>Signature:</strong> {authParams.signature?.substring(0, 20)}...</p>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">File Upload Test</h2>
        <div className="space-y-4">
          <input
            type="file"
            onChange={handleFileSelect}
            accept="image/*,application/pdf,.txt"
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />

          {selectedFile && (
            <div className="p-3 bg-gray-50 rounded">
              <p><strong>Selected:</strong> {selectedFile.name}</p>
              <p><strong>Size:</strong> {(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
          )}

          <button
            onClick={uploadFile}
            disabled={!selectedFile || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Uploading...' : 'Upload to ImageKit'}
          </button>

          {uploadResult && (
            <div className={`p-4 rounded ${uploadResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
              {uploadResult.success ? (
                <div>
                  <p className="text-green-800 font-semibold">✅ Upload Successful!</p>
                  <p><strong>File:</strong> {uploadResult.data?.fileName}</p>
                  <p><strong>Size:</strong> {uploadResult.data?.size} bytes</p>
                  <p><strong>URL:</strong> <a href={uploadResult.data?.url} target="_blank" className="text-blue-600 underline">View File</a></p>
                </div>
              ) : (
                <div>
                  <p className="text-red-800 font-semibold">❌ Upload Failed</p>
                  <p>{uploadResult.error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Next Steps</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>Add your ImageKit private key to the .env file</li>
          <li>Test file uploads using the form above</li>
          <li>Check your ImageKit dashboard for uploaded files</li>
          <li>Integrate with your existing services</li>
        </ol>
      </div>
    </div>
  );
}

export default function ImageKitDemoPage() {
  return (
    <AdminWrapper>
      <ImageKitDemoContent />
    </AdminWrapper>
  );
}