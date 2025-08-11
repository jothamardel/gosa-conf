#!/usr/bin/env node

/**
 * Security Audit Script
 * Performs security checks on the application
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SecurityAuditor {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.passed = [];
  }

  async runAudit() {
    console.log('🔒 Starting Security Audit...\n');

    // Check environment variables
    this.checkEnvironmentVariables();

    // Check API endpoints security
    this.checkAPIEndpointSecurity();

    // Check payment handling security
    this.checkPaymentSecurity();

    // Check data validation
    this.checkDataValidation();

    // Check authentication and authorization
    this.checkAuthSecurity();

    // Check file permissions
    this.checkFilePermissions();

    // Check dependencies
    await this.checkDependencies();

    this.printReport();
  }

  checkEnvironmentVariables() {
    console.log('🔍 Checking Environment Variables...');

    const requiredEnvVars = [
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL',
      'MONGODB_URI',
      'PAYSTACK_SECRET_KEY',
      'WASENDER_API_KEY'
    ];

    const sensitiveEnvVars = [
      'PAYSTACK_SECRET_KEY',
      'NEXTAUTH_SECRET',
      'WASENDER_API_KEY'
    ];

    // Check required variables
    requiredEnvVars.forEach(envVar => {
      if (!process.env[envVar]) {
        this.issues.push(`Missing required environment variable: ${envVar}`);
      } else {
        this.passed.push(`Environment variable ${envVar} is set`);
      }
    });

    // Check sensitive variable strength
    sensitiveEnvVars.forEach(envVar => {
      const value = process.env[envVar];
      if (value) {
        if (value.length < 32) {
          this.warnings.push(`${envVar} should be at least 32 characters long`);
        }
        if (value === 'test-secret' || value === 'development') {
          this.issues.push(`${envVar} appears to be using a default/test value`);
        }
      }
    });

    // Check for .env files in production
    if (process.env.NODE_ENV === 'production') {
      if (fs.existsSync('.env') || fs.existsSync('.env.local')) {
        this.warnings.push('Environment files found in production build');
      }
    }
  }

  checkAPIEndpointSecurity() {
    console.log('🔍 Checking API Endpoint Security...');

    const apiDir = path.join(process.cwd(), 'app', 'api');
    
    if (!fs.existsSync(apiDir)) {
      this.issues.push('API directory not found');
      return;
    }

    // Check for rate limiting
    this.checkRateLimiting();

    // Check for input validation
    this.checkInputValidation();

    // Check for CORS configuration
    this.checkCORSConfiguration();

    // Check webhook security
    this.checkWebhookSecurity();
  }

  checkRateLimiting() {
    // Check if rate limiting is implemented
    const middlewareFiles = this.findFiles('middleware.ts', process.cwd());
    
    if (middlewareFiles.length === 0) {
      this.warnings.push('No middleware.ts found - consider implementing rate limiting');
    } else {
      middlewareFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        if (!content.includes('rateLimit') && !content.includes('throttle')) {
          this.warnings.push('Rate limiting not detected in middleware');
        } else {
          this.passed.push('Rate limiting appears to be implemented');
        }
      });
    }
  }

  checkInputValidation() {
    const apiFiles = this.findFiles('route.ts', path.join(process.cwd(), 'app', 'api'));
    
    apiFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(process.cwd(), file);
      
      // Check for Zod validation
      if (!content.includes('zod') && !content.includes('validate')) {
        this.warnings.push(`Input validation not detected in ${relativePath}`);
      }

      // Check for SQL injection protection
      if (content.includes('$where') || content.includes('eval(')) {
        this.issues.push(`Potential NoSQL injection vulnerability in ${relativePath}`);
      }

      // Check for XSS protection
      if (content.includes('innerHTML') || content.includes('dangerouslySetInnerHTML')) {
        this.warnings.push(`Potential XSS vulnerability in ${relativePath}`);
      }
    });
  }

  checkCORSConfiguration() {
    const nextConfigPath = path.join(process.cwd(), 'next.config.js');
    
    if (fs.existsSync(nextConfigPath)) {
      const content = fs.readFileSync(nextConfigPath, 'utf8');
      
      if (content.includes('cors') || content.includes('headers')) {
        this.passed.push('CORS configuration found in next.config.js');
      } else {
        this.warnings.push('CORS configuration not found - ensure proper origin restrictions');
      }
    }
  }

  checkWebhookSecurity() {
    const webhookFiles = this.findFiles('route.ts', path.join(process.cwd(), 'app', 'api', 'webhook'));
    
    webhookFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(process.cwd(), file);
      
      // Check for signature verification
      if (!content.includes('signature') && !content.includes('verify')) {
        this.issues.push(`Webhook signature verification missing in ${relativePath}`);
      } else {
        this.passed.push(`Webhook signature verification found in ${relativePath}`);
      }

      // Check for HMAC verification
      if (!content.includes('hmac') && !content.includes('createHmac')) {
        this.warnings.push(`HMAC verification not detected in ${relativePath}`);
      }
    });
  }

  checkPaymentSecurity() {
    console.log('🔍 Checking Payment Security...');

    // Check for PCI compliance patterns
    const paymentFiles = this.findFiles('*.ts', path.join(process.cwd(), 'lib', 'paystack-api'));
    
    paymentFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(process.cwd(), file);
      
      // Check for sensitive data logging
      if (content.includes('console.log') && content.includes('card')) {
        this.issues.push(`Potential card data logging in ${relativePath}`);
      }

      // Check for HTTPS enforcement
      if (content.includes('http://') && !content.includes('localhost')) {
        this.issues.push(`HTTP URLs found in payment code: ${relativePath}`);
      }

      // Check for amount validation
      if (!content.includes('amount') || !content.includes('validate')) {
        this.warnings.push(`Amount validation not clearly implemented in ${relativePath}`);
      }
    });

    // Check for secure payment reference generation
    this.checkPaymentReferences();
  }

  checkPaymentReferences() {
    const utilFiles = this.findFiles('*.ts', path.join(process.cwd(), 'lib', 'utils'));
    
    utilFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      
      if (content.includes('paymentReference') || content.includes('DINNER_') || content.includes('ACCOM_')) {
        // Check for timestamp usage (good)
        if (content.includes('Date.now()') || content.includes('timestamp')) {
          this.passed.push('Payment references use timestamps');
        }

        // Check for phone number inclusion (potential privacy issue)
        if (content.includes('phoneNumber') && content.includes('paymentReference')) {
          this.warnings.push('Payment references include phone numbers - consider privacy implications');
        }
      }
    });
  }

  checkDataValidation() {
    console.log('🔍 Checking Data Validation...');

    const schemaFiles = this.findFiles('*.ts', path.join(process.cwd(), 'lib', 'schema'));
    
    if (schemaFiles.length === 0) {
      this.warnings.push('No schema files found - ensure data validation is implemented');
      return;
    }

    schemaFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(process.cwd(), file);
      
      // Check for Zod or Mongoose validation
      if (content.includes('z.') || content.includes('Schema') || content.includes('validate')) {
        this.passed.push(`Data validation found in ${relativePath}`);
      } else {
        this.warnings.push(`Data validation not clearly implemented in ${relativePath}`);
      }

      // Check for email validation
      if (content.includes('email') && !content.includes('email()')) {
        this.warnings.push(`Email validation may be missing in ${relativePath}`);
      }

      // Check for phone validation
      if (content.includes('phone') && !content.includes('regex') && !content.includes('pattern')) {
        this.warnings.push(`Phone validation may be missing in ${relativePath}`);
      }
    });
  }

  checkAuthSecurity() {
    console.log('🔍 Checking Authentication Security...');

    // Check NextAuth configuration
    const authFiles = this.findFiles('*auth*', process.cwd());
    
    if (authFiles.length === 0) {
      this.warnings.push('No authentication files found');
      return;
    }

    authFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for secure session configuration
      if (content.includes('session') && content.includes('jwt')) {
        this.passed.push('JWT session configuration found');
      }

      // Check for CSRF protection
      if (content.includes('csrf') || content.includes('csrfToken')) {
        this.passed.push('CSRF protection appears to be configured');
      }
    });

    // Check for admin route protection
    const adminFiles = this.findFiles('route.ts', path.join(process.cwd(), 'app', 'api', 'v1', 'admin'));
    
    adminFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(process.cwd(), file);
      
      if (!content.includes('auth') && !content.includes('session') && !content.includes('token')) {
        this.issues.push(`Admin route may lack authentication: ${relativePath}`);
      } else {
        this.passed.push(`Authentication check found in ${relativePath}`);
      }
    });
  }

  checkFilePermissions() {
    console.log('🔍 Checking File Permissions...');

    const sensitiveFiles = [
      '.env',
      '.env.local',
      '.env.production',
      'package.json',
      'next.config.js'
    ];

    sensitiveFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      
      if (fs.existsSync(filePath)) {
        try {
          const stats = fs.statSync(filePath);
          const mode = stats.mode & parseInt('777', 8);
          
          if (mode & parseInt('044', 8)) { // World readable
            this.warnings.push(`${file} is world-readable`);
          }
          
          if (mode & parseInt('022', 8)) { // Group writable
            this.warnings.push(`${file} is group-writable`);
          }
        } catch (error) {
          this.warnings.push(`Could not check permissions for ${file}`);
        }
      }
    });
  }

  async checkDependencies() {
    console.log('🔍 Checking Dependencies...');

    const packageJsonPath = path.join(process.cwd(), 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      this.issues.push('package.json not found');
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

    // Check for known vulnerable packages
    const vulnerablePackages = [
      'lodash', // Check for old versions
      'moment', // Deprecated
      'request' // Deprecated
    ];

    vulnerablePackages.forEach(pkg => {
      if (dependencies[pkg]) {
        this.warnings.push(`Consider updating or replacing ${pkg} - may have security issues`);
      }
    });

    // Check for security-focused packages
    const securityPackages = ['helmet', 'cors', 'express-rate-limit'];
    const missingSecurityPackages = securityPackages.filter(pkg => !dependencies[pkg]);
    
    if (missingSecurityPackages.length > 0) {
      this.warnings.push(`Consider adding security packages: ${missingSecurityPackages.join(', ')}`);
    }

    this.passed.push('Dependency check completed');
  }

  findFiles(pattern, dir) {
    const files = [];
    
    if (!fs.existsSync(dir)) {
      return files;
    }

    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
        files.push(...this.findFiles(pattern, fullPath));
      } else if (item.isFile()) {
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'));
          if (regex.test(item.name)) {
            files.push(fullPath);
          }
        } else if (item.name === pattern) {
          files.push(fullPath);
        }
      }
    }
    
    return files;
  }

  printReport() {
    console.log('\n🔒 Security Audit Report');
    console.log('=' .repeat(50));

    console.log(`\n✅ Passed Checks: ${this.passed.length}`);
    this.passed.forEach(item => console.log(`  ✓ ${item}`));

    console.log(`\n⚠️  Warnings: ${this.warnings.length}`);
    this.warnings.forEach(item => console.log(`  ⚠️  ${item}`));

    console.log(`\n❌ Critical Issues: ${this.issues.length}`);
    this.issues.forEach(item => console.log(`  ❌ ${item}`));

    const totalChecks = this.passed.length + this.warnings.length + this.issues.length;
    const score = totalChecks > 0 ? ((this.passed.length / totalChecks) * 100).toFixed(1) : 0;

    console.log(`\n📊 Security Score: ${score}%`);

    if (this.issues.length > 0) {
      console.log('\n🚨 Critical issues found! Please address before deployment.');
      process.exit(1);
    } else if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings found. Consider addressing for better security.');
    } else {
      console.log('\n🎉 No critical security issues found!');
    }
  }
}

// Run audit if called directly
if (require.main === module) {
  const auditor = new SecurityAuditor();
  auditor.runAudit().catch(error => {
    console.error('Security audit failed:', error);
    process.exit(1);
  });
}

module.exports = SecurityAuditor;