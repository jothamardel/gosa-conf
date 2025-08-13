#!/bin/bash

echo "Installing PDF generation and Vercel Blob dependencies..."

# Install Vercel Blob for file storage
npm install @vercel/blob

# Install Puppeteer for PDF generation
npm install puppeteer

# Install Puppeteer types for development
npm install --save-dev @types/puppeteer

echo "Dependencies installed successfully!"
echo ""
echo "Make sure to add the following environment variables to your .env file:"
echo "BLOB_READ_WRITE_TOKEN=your_vercel_blob_token"
echo ""
echo "You can get your Vercel Blob token from:"
echo "https://vercel.com/dashboard/stores"