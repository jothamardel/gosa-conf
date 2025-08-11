#!/usr/bin/env node

/**
 * Integration Test Script
 * Tests complete end-to-end flows for all payment types
 */

const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || 'test-secret';

// Test data
const testUser = {
  fullName: 'Test User',
  email: 'test@example.com',
  phoneNumber: '08012345678'
};

const testCases = [
  {
    name: 'Dinner Reservation Flow',
    endpoint: '/api/v1/dinner',
    data: {
      ...testUser,
      numberOfGuests: 2,
      guestDetails: [
        { name: 'Test User', email: 'test@example.com', dietaryRequirements: 'None' },
        { name: 'Guest User', email: 'guest@example.com', dietaryRequirements: 'Vegetarian' }
      ],
      specialRequests: 'Table near window'
    },
    expectedAmount: 150 // 2 * $75
  },
  {
    name: 'Accommodation Booking Flow',
    endpoint: '/api/v1/accommodation',
    data: {
      ...testUser,
      accommodationType: 'premium',
      checkInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      checkOutDate: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString(), // 32 days from now
      numberOfGuests: 2,
      guestDetails: [
        { name: 'Test User', email: 'test@example.com' },
        { name: 'Guest User', email: 'guest@example.com' }
      ],
      specialRequests: 'Late check-in'
    },
    expectedAmount: 400 // 2 nights * $200
  },
  {
    name: 'Brochure Order Flow',
    endpoint: '/api/v1/brochure',
    data: {
      ...testUser,
      quantity: 5,
      brochureType: 'physical',
      recipientDetails: [
        { name: 'Test User', email: 'test@example.com' }
      ]
    },
    expectedAmount: 95 // 5 * $20 with 5% discount
  },
  {
    name: 'Goodwill Message Flow',
    endpoint: '/api/v1/goodwill',
    data: {
      ...testUser,
      message: 'Wishing you all the best for this wonderful convention!',
      donationAmount: 50,
      attributionName: 'Test User',
      anonymous: false
    },
    expectedAmount: 50
  },
  {
    name: 'Donation Flow',
    endpoint: '/api/v1/donation',
    data: {
      ...testUser,
      amount: 100,
      donorName: 'Test User',
      donorEmail: 'test@example.com',
      donorPhone: '08012345678',
      anonymous: false
    },
    expectedAmount: 100
  }
];

class IntegrationTester {
  constructor() {
    this.results = [];
    this.paymentReferences = [];
  }

  async runAllTests() {
    console.log('🚀 Starting Integration Tests...\n');

    for (const testCase of testCases) {
      try {
        console.log(`📋 Testing: ${testCase.name}`);
        const result = await this.testPaymentFlow(testCase);
        this.results.push({ ...testCase, result, status: 'PASSED' });
        console.log(`✅ ${testCase.name} - PASSED\n`);
      } catch (error) {
        console.error(`❌ ${testCase.name} - FAILED:`, error.message);
        this.results.push({ ...testCase, error: error.message, status: 'FAILED' });
      }
    }

    // Test webhook handling
    await this.testWebhookHandling();

    // Test admin endpoints
    await this.testAdminEndpoints();

    this.printSummary();
  }

  async testPaymentFlow(testCase) {
    // Step 1: Initialize payment
    const response = await axios.post(`${BASE_URL}${testCase.endpoint}`, testCase.data, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.data.success) {
      throw new Error(`Payment initialization failed: ${response.data.message}`);
    }

    const { paymentLink, paymentReference, totalAmount } = response.data.data;

    // Validate response structure
    if (!paymentLink || !paymentReference || totalAmount === undefined) {
      throw new Error('Invalid payment response structure');
    }

    // Validate amount calculation
    if (totalAmount !== testCase.expectedAmount) {
      throw new Error(`Amount mismatch: expected ${testCase.expectedAmount}, got ${totalAmount}`);
    }

    // Store payment reference for webhook testing
    this.paymentReferences.push({
      reference: paymentReference,
      type: testCase.name,
      amount: totalAmount
    });

    return {
      paymentLink,
      paymentReference,
      totalAmount,
      responseTime: response.headers['x-response-time'] || 'N/A'
    };
  }

  async testWebhookHandling() {
    console.log('🔗 Testing Webhook Handling...');

    for (const payment of this.paymentReferences) {
      try {
        const webhookPayload = {
          event: 'charge.success',
          data: {
            reference: payment.reference,
            status: 'success',
            amount: payment.amount * 100, // Convert to kobo
            metadata: {
              type: payment.type.toLowerCase().split(' ')[0],
              userId: 'test-user-id'
            }
          }
        };

        const signature = crypto
          .createHmac('sha512', PAYSTACK_SECRET)
          .update(JSON.stringify(webhookPayload))
          .digest('hex');

        const response = await axios.post(`${BASE_URL}/api/webhook/paystack`, webhookPayload, {
          headers: {
            'x-paystack-signature': signature,
            'Content-Type': 'application/json'
          }
        });

        if (response.status !== 200) {
          throw new Error(`Webhook failed for ${payment.type}: ${response.status}`);
        }

        console.log(`✅ Webhook processed for ${payment.type}`);
      } catch (error) {
        console.error(`❌ Webhook failed for ${payment.type}:`, error.message);
      }
    }
  }

  async testAdminEndpoints() {
    console.log('👑 Testing Admin Endpoints...');

    const adminEndpoints = [
      '/api/v1/admin/analytics',
      '/api/v1/admin/dashboard',
      '/api/v1/admin/attendees',
      '/api/v1/admin/payments'
    ];

    for (const endpoint of adminEndpoints) {
      try {
        const response = await axios.get(`${BASE_URL}${endpoint}`);
        
        if (!response.data.success) {
          throw new Error(`Admin endpoint failed: ${response.data.message}`);
        }

        console.log(`✅ Admin endpoint ${endpoint} - OK`);
      } catch (error) {
        console.error(`❌ Admin endpoint ${endpoint} - FAILED:`, error.message);
      }
    }
  }

  printSummary() {
    console.log('\n📊 Integration Test Summary');
    console.log('=' .repeat(50));

    const passed = this.results.filter(r => r.status === 'PASSED').length;
    const failed = this.results.filter(r => r.status === 'FAILED').length;

    console.log(`Total Tests: ${this.results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => r.status === 'FAILED')
        .forEach(r => console.log(`  - ${r.name}: ${r.error}`));
    }

    console.log('\n🎯 Payment References Generated:');
    this.paymentReferences.forEach(p => {
      console.log(`  - ${p.type}: ${p.reference} ($${p.amount})`);
    });

    process.exit(failed > 0 ? 1 : 0);
  }
}

// Performance monitoring
function measurePerformance(testName, fn) {
  return async (...args) => {
    const start = Date.now();
    const result = await fn(...args);
    const duration = Date.now() - start;
    console.log(`⏱️  ${testName} completed in ${duration}ms`);
    return result;
  };
}

// Run tests if called directly
if (require.main === module) {
  const tester = new IntegrationTester();
  tester.runAllTests().catch(error => {
    console.error('Integration tests failed:', error);
    process.exit(1);
  });
}

module.exports = IntegrationTester;