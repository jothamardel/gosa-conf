#!/usr/bin/env node

/**
 * Payment Flow Testing Script
 * 
 * This script tests all payment flows end-to-end to ensure they work correctly
 * before deployment.
 */

const axios = require('axios');

class PaymentFlowTester {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.testResults = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '✓',
      warn: '⚠',
      error: '✗',
      test: '🧪'
    }[type];
    
    console.log(`${prefix} [${timestamp}] ${message}`);
    
    this.testResults.push({ message, type, timestamp });
  }

  async testDinnerReservation() {
    this.log('Testing dinner reservation flow...', 'test');
    
    try {
      const reservationData = {
        email: 'test@example.com',
        fullName: 'Test User',
        phoneNumber: '+1234567890',
        numberOfGuests: 2,
        guestDetails: [
          { name: 'Test User', email: 'test@example.com', phone: '+1234567890' },
          { name: 'Guest Two', email: 'guest@example.com', phone: '+1987654321' }
        ],
        specialRequests: 'Test reservation'
      };

      const response = await axios.post(
        `${this.baseUrl}/api/v1/dinner`,
        reservationData,
        { timeout: 10000 }
      );

      if (response.data.success) {
        this.log('Dinner reservation API working correctly', 'info');
        
        // Verify response structure
        if (response.data.data.paymentLink) {
          this.log('Payment link generated successfully', 'info');
        } else {
          this.log('Payment link missing in response', 'warn');
        }
        
        return true;
      } else {
        this.log(`Dinner reservation failed: ${response.data.message}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`Dinner reservation error: ${error.message}`, 'error');
      return false;
    }
  }

  async testAccommodationBooking() {
    this.log('Testing accommodation booking flow...', 'test');
    
    try {
      const bookingData = {
        email: 'test@example.com',
        fullName: 'Test User',
        phoneNumber: '+1234567890',
        accommodationType: 'standard',
        checkInDate: '2025-12-01',
        checkOutDate: '2025-12-03',
        numberOfGuests: 1,
        guestDetails: [
          { name: 'Test User', email: 'test@example.com', phone: '+1234567890' }
        ],
        specialRequests: 'Test booking'
      };

      const response = await axios.post(
        `${this.baseUrl}/api/v1/accommodation`,
        bookingData,
        { timeout: 10000 }
      );

      if (response.data.success) {
        this.log('Accommodation booking API working correctly', 'info');
        return true;
      } else {
        this.log(`Accommodation booking failed: ${response.data.message}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`Accommodation booking error: ${error.message}`, 'error');
      return false;
    }
  }

  async testBrochureOrder() {
    this.log('Testing brochure order flow...', 'test');
    
    try {
      const orderData = {
        email: 'test@example.com',
        fullName: 'Test User',
        phoneNumber: '+1234567890',
        quantity: 1,
        brochureType: 'digital',
        recipientDetails: [
          { name: 'Test User', email: 'test@example.com', phone: '+1234567890' }
        ]
      };

      const response = await axios.post(
        `${this.baseUrl}/api/v1/brochure`,
        orderData,
        { timeout: 10000 }
      );

      if (response.data.success) {
        this.log('Brochure order API working correctly', 'info');
        return true;
      } else {
        this.log(`Brochure order failed: ${response.data.message}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`Brochure order error: ${error.message}`, 'error');
      return false;
    }
  }

  async testGoodwillMessage() {
    this.log('Testing goodwill message flow...', 'test');
    
    try {
      const messageData = {
        email: 'test@example.com',
        fullName: 'Test User',
        phoneNumber: '+1234567890',
        message: 'This is a test goodwill message',
        donationAmount: 25,
        attributionName: 'Test User',
        anonymous: false
      };

      const response = await axios.post(
        `${this.baseUrl}/api/v1/goodwill`,
        messageData,
        { timeout: 10000 }
      );

      if (response.data.success) {
        this.log('Goodwill message API working correctly', 'info');
        return true;
      } else {
        this.log(`Goodwill message failed: ${response.data.message}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`Goodwill message error: ${error.message}`, 'error');
      return false;
    }
  }

  async testDonation() {
    this.log('Testing donation flow...', 'test');
    
    try {
      const donationData = {
        email: 'test@example.com',
        fullName: 'Test User',
        phoneNumber: '+1234567890',
        amount: 50,
        donorName: 'Test User',
        donorEmail: 'test@example.com',
        donorPhone: '+1234567890',
        anonymous: false,
        onBehalfOf: ''
      };

      const response = await axios.post(
        `${this.baseUrl}/api/v1/donation`,
        donationData,
        { timeout: 10000 }
      );

      if (response.data.success) {
        this.log('Donation API working correctly', 'info');
        return true;
      } else {
        this.log(`Donation failed: ${response.data.message}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`Donation error: ${error.message}`, 'error');
      return false;
    }
  }

  async testAdminEndpoints() {
    this.log('Testing admin endpoints...', 'test');
    
    try {
      // Test analytics endpoint
      const analyticsResponse = await axios.get(
        `${this.baseUrl}/api/v1/admin/analytics`,
        { timeout: 10000 }
      );

      if (analyticsResponse.data.success) {
        this.log('Admin analytics API working correctly', 'info');
      } else {
        this.log('Admin analytics API failed', 'error');
        return false;
      }

      // Test dashboard endpoint
      const dashboardResponse = await axios.get(
        `${this.baseUrl}/api/v1/admin/dashboard`,
        { timeout: 10000 }
      );

      if (dashboardResponse.data.success) {
        this.log('Admin dashboard API working correctly', 'info');
      } else {
        this.log('Admin dashboard API failed', 'error');
        return false;
      }

      return true;
    } catch (error) {
      this.log(`Admin endpoints error: ${error.message}`, 'error');
      return false;
    }
  }

  async testBadgeGeneration() {
    this.log('Testing badge generation...', 'test');
    
    try {
      // Test badge gallery endpoint
      const galleryResponse = await axios.get(
        `${this.baseUrl}/api/v1/badge/gallery`,
        { timeout: 10000 }
      );

      if (galleryResponse.data.success) {
        this.log('Badge gallery API working correctly', 'info');
        return true;
      } else {
        this.log('Badge gallery API failed', 'error');
        return false;
      }
    } catch (error) {
      this.log(`Badge generation error: ${error.message}`, 'error');
      return false;
    }
  }

  async testWebhookEndpoint() {
    this.log('Testing webhook endpoint...', 'test');
    
    try {
      // Test webhook endpoint with a test payload
      const webhookPayload = {
        event: 'charge.success',
        data: {
          reference: 'test-reference-123',
          amount: 7500,
          status: 'success',
          metadata: {
            type: 'dinner',
            userId: 'test-user-id'
          }
        }
      };

      // Note: This will likely fail in testing due to signature verification
      // but we can check if the endpoint is accessible
      const response = await axios.post(
        `${this.baseUrl}/api/webhook/paystack`,
        webhookPayload,
        { 
          timeout: 10000,
          validateStatus: () => true // Accept any status code
        }
      );

      if (response.status === 200 || response.status === 400) {
        this.log('Webhook endpoint is accessible', 'info');
        return true;
      } else {
        this.log(`Webhook endpoint returned status: ${response.status}`, 'warn');
        return false;
      }
    } catch (error) {
      this.log(`Webhook endpoint error: ${error.message}`, 'error');
      return false;
    }
  }

  async testHealthCheck() {
    this.log('Testing application health...', 'test');
    
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/health`,
        { 
          timeout: 5000,
          validateStatus: () => true
        }
      );

      if (response.status === 200) {
        this.log('Application health check passed', 'info');
        return true;
      } else if (response.status === 404) {
        this.log('Health endpoint not found (this is optional)', 'warn');
        return true;
      } else {
        this.log(`Health check failed with status: ${response.status}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`Health check error: ${error.message}`, 'error');
      return false;
    }
  }

  async runAllTests() {
    this.log('Starting comprehensive payment flow testing...', 'info');
    
    const tests = [
      { name: 'Health Check', test: () => this.testHealthCheck() },
      { name: 'Dinner Reservation', test: () => this.testDinnerReservation() },
      { name: 'Accommodation Booking', test: () => this.testAccommodationBooking() },
      { name: 'Brochure Order', test: () => this.testBrochureOrder() },
      { name: 'Goodwill Message', test: () => this.testGoodwillMessage() },
      { name: 'Donation', test: () => this.testDonation() },
      { name: 'Admin Endpoints', test: () => this.testAdminEndpoints() },
      { name: 'Badge Generation', test: () => this.testBadgeGeneration() },
      { name: 'Webhook Endpoint', test: () => this.testWebhookEndpoint() }
    ];

    const results = [];
    
    for (const { name, test } of tests) {
      this.log(`Running ${name} test...`, 'test');
      try {
        const result = await test();
        results.push({ name, passed: result });
        
        if (result) {
          this.log(`${name} test PASSED`, 'info');
        } else {
          this.log(`${name} test FAILED`, 'error');
        }
      } catch (error) {
        this.log(`${name} test ERROR: ${error.message}`, 'error');
        results.push({ name, passed: false, error: error.message });
      }
      
      // Add delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return this.generateReport(results);
  }

  generateReport(results) {
    this.log('\n=== PAYMENT FLOW TESTING REPORT ===', 'info');
    
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;
    
    this.log(`Total tests: ${total}`, 'info');
    this.log(`Passed: ${passed}`, passed === total ? 'info' : 'warn');
    this.log(`Failed: ${failed}`, failed === 0 ? 'info' : 'error');
    
    if (failed > 0) {
      this.log('\nFAILED TESTS:', 'error');
      results.filter(r => !r.passed).forEach(result => {
        this.log(`  - ${result.name}${result.error ? ': ' + result.error : ''}`, 'error');
      });
    }

    const allPassed = failed === 0;
    this.log(`\nOverall result: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`, 
             allPassed ? 'info' : 'error');

    return {
      allPassed,
      passed,
      failed,
      total,
      results,
      testResults: this.testResults
    };
  }
}

// Run tests if called directly
if (require.main === module) {
  const baseUrl = process.argv[2] || 'http://localhost:3000';
  const tester = new PaymentFlowTester(baseUrl);
  
  tester.runAllTests().then(report => {
    process.exit(report.allPassed ? 0 : 1);
  }).catch(error => {
    console.error('Testing failed:', error);
    process.exit(1);
  });
}

module.exports = PaymentFlowTester;