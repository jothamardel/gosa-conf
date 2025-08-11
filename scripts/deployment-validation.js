#!/usr/bin/env node

/**
 * Deployment Validation Script
 * 
 * This script validates that all payment features are properly configured
 * and ready for production deployment.
 */

const fs = require('fs');
const path = require('path');

class DeploymentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.checks = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '✓',
      warn: '⚠',
      error: '✗'
    }[type];
    
    console.log(`${prefix} [${timestamp}] ${message}`);
    
    if (type === 'error') this.errors.push(message);
    if (type === 'warn') this.warnings.push(message);
    this.checks.push({ message, type, timestamp });
  }

  checkEnvironmentVariables() {
    this.log('Checking environment variables...', 'info');
    
    const requiredEnvVars = [
      'MONGODB_URI',
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL',
      'PAYSTACK_SECRET_KEY',
      'PAYSTACK_PUBLIC_KEY',
      'WASENDER_API_KEY',
      'WASENDER_BASE_URL',
      'VERCEL_BLOB_READ_WRITE_TOKEN'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      this.log(`Missing environment variables: ${missingVars.join(', ')}`, 'error');
    } else {
      this.log('All required environment variables are set', 'info');
    }

    // Check for development-specific values in production
    if (process.env.NODE_ENV === 'production') {
      if (process.env.NEXTAUTH_URL?.includes('localhost')) {
        this.log('NEXTAUTH_URL contains localhost in production', 'error');
      }
      if (process.env.MONGODB_URI?.includes('localhost')) {
        this.log('MONGODB_URI contains localhost in production', 'warn');
      }
    }
  }

  checkAPIEndpoints() {
    this.log('Checking API endpoint files...', 'info');
    
    const requiredEndpoints = [
      'app/api/v1/dinner/route.ts',
      'app/api/v1/accommodation/route.ts',
      'app/api/v1/brochure/route.ts',
      'app/api/v1/goodwill/route.ts',
      'app/api/v1/donation/route.ts',
      'app/api/v1/badge/generate/route.ts',
      'app/api/v1/admin/analytics/route.ts',
      'app/api/v1/admin/dashboard/route.ts',
      'app/api/webhook/paystack/route.ts'
    ];

    const missingEndpoints = requiredEndpoints.filter(endpoint => 
      !fs.existsSync(path.join(process.cwd(), endpoint))
    );

    if (missingEndpoints.length > 0) {
      this.log(`Missing API endpoints: ${missingEndpoints.join(', ')}`, 'error');
    } else {
      this.log('All required API endpoints exist', 'info');
    }
  }

  checkUtilityClasses() {
    this.log('Checking utility classes...', 'info');
    
    const requiredUtils = [
      'lib/utils/dinner.utils.ts',
      'lib/utils/accommodation.utils.ts',
      'lib/utils/brochure.utils.ts',
      'lib/utils/goodwill.utils.ts',
      'lib/utils/donation.utils.ts',
      'lib/utils/badge.utils.ts',
      'lib/utils/admin.utils.ts'
    ];

    const missingUtils = requiredUtils.filter(util => 
      !fs.existsSync(path.join(process.cwd(), util))
    );

    if (missingUtils.length > 0) {
      this.log(`Missing utility classes: ${missingUtils.join(', ')}`, 'error');
    } else {
      this.log('All required utility classes exist', 'info');
    }
  }

  checkDatabaseSchemas() {
    this.log('Checking database schemas...', 'info');
    
    const requiredSchemas = [
      'lib/schema/dinner.schema.ts',
      'lib/schema/accommodation.schema.ts',
      'lib/schema/brochure.schema.ts',
      'lib/schema/goodwill.schema.ts',
      'lib/schema/donation.schema.ts',
      'lib/schema/badge.schema.ts',
      'lib/schema/qr-history.schema.ts'
    ];

    const missingSchemas = requiredSchemas.filter(schema => 
      !fs.existsSync(path.join(process.cwd(), schema))
    );

    if (missingSchemas.length > 0) {
      this.log(`Missing database schemas: ${missingSchemas.join(', ')}`, 'error');
    } else {
      this.log('All required database schemas exist', 'info');
    }
  }

  checkServices() {
    this.log('Checking service classes...', 'info');
    
    const requiredServices = [
      'lib/services/notification.service.ts',
      'lib/services/qr-code.service.ts',
      'lib/services/vercel-blob.service.ts',
      'lib/services/analytics.service.ts'
    ];

    const missingServices = requiredServices.filter(service => 
      !fs.existsSync(path.join(process.cwd(), service))
    );

    if (missingServices.length > 0) {
      this.log(`Missing service classes: ${missingServices.join(', ')}`, 'error');
    } else {
      this.log('All required service classes exist', 'info');
    }
  }

  checkFormComponents() {
    this.log('Checking form components...', 'info');
    
    const requiredForms = [
      'components/forms/dinner.tsx',
      'components/forms/accommodation-form.tsx',
      'components/forms/convention-brochure.tsx',
      'components/forms/goodwill-message.tsx',
      'components/forms/donation-form.tsx'
    ];

    const missingForms = requiredForms.filter(form => 
      !fs.existsSync(path.join(process.cwd(), form))
    );

    if (missingForms.length > 0) {
      this.log(`Missing form components: ${missingForms.join(', ')}`, 'error');
    } else {
      this.log('All required form components exist', 'info');
    }
  }

  checkAdminComponents() {
    this.log('Checking admin components...', 'info');
    
    const requiredAdminComponents = [
      'components/admin/admin-dashboard.tsx',
      'components/admin/analytics-cards.tsx',
      'components/admin/attendee-table.tsx',
      'components/admin/payment-history.tsx',
      'components/admin/qr-code-manager.tsx'
    ];

    const missingComponents = requiredAdminComponents.filter(component => 
      !fs.existsSync(path.join(process.cwd(), component))
    );

    if (missingComponents.length > 0) {
      this.log(`Missing admin components: ${missingComponents.join(', ')}`, 'error');
    } else {
      this.log('All required admin components exist', 'info');
    }
  }

  checkBadgeComponents() {
    this.log('Checking badge components...', 'info');
    
    const requiredBadgeComponents = [
      'components/badge/badge-generator.tsx',
      'components/badge/badge-preview.tsx',
      'components/badge/badge-gallery.tsx',
      'components/badge/social-share-buttons.tsx'
    ];

    const missingComponents = requiredBadgeComponents.filter(component => 
      !fs.existsSync(path.join(process.cwd(), component))
    );

    if (missingComponents.length > 0) {
      this.log(`Missing badge components: ${missingComponents.join(', ')}`, 'error');
    } else {
      this.log('All required badge components exist', 'info');
    }
  }

  checkTestSuite() {
    this.log('Checking test suite...', 'info');
    
    const requiredTests = [
      '__tests__/utils/dinner.utils.test.ts',
      '__tests__/utils/accommodation.utils.test.ts',
      '__tests__/api/dinner.test.ts',
      '__tests__/api/accommodation.test.ts',
      '__tests__/integration/payment-flow.test.ts',
      '__tests__/components/dinner-form.test.tsx',
      '__tests__/services/notification.service.test.ts',
      '__tests__/e2e/payment-scenarios.test.ts'
    ];

    const missingTests = requiredTests.filter(test => 
      !fs.existsSync(path.join(process.cwd(), test))
    );

    if (missingTests.length > 0) {
      this.log(`Missing test files: ${missingTests.join(', ')}`, 'warn');
    } else {
      this.log('All test files exist', 'info');
    }

    // Check Jest configuration
    if (!fs.existsSync(path.join(process.cwd(), 'jest.config.js'))) {
      this.log('Missing Jest configuration file', 'warn');
    }

    if (!fs.existsSync(path.join(process.cwd(), 'jest.setup.js'))) {
      this.log('Missing Jest setup file', 'warn');
    }
  }

  checkPackageJson() {
    this.log('Checking package.json configuration...', 'info');
    
    try {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
      );

      const requiredDependencies = [
        '@hookform/resolvers',
        'axios',
        'framer-motion',
        'lucide-react',
        'mongoose',
        'next',
        'next-themes',
        'nextauth',
        'qrcode',
        'react',
        'react-hook-form',
        'sonner',
        'tailwindcss',
        'typescript',
        'zod'
      ];

      const missingDeps = requiredDependencies.filter(dep => 
        !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]
      );

      if (missingDeps.length > 0) {
        this.log(`Missing dependencies: ${missingDeps.join(', ')}`, 'error');
      } else {
        this.log('All required dependencies are installed', 'info');
      }

      // Check test scripts
      if (!packageJson.scripts?.test) {
        this.log('Missing test script in package.json', 'warn');
      }

      if (!packageJson.scripts?.['test:coverage']) {
        this.log('Missing test coverage script in package.json', 'warn');
      }

    } catch (error) {
      this.log(`Error reading package.json: ${error.message}`, 'error');
    }
  }

  checkSecurityConfiguration() {
    this.log('Checking security configuration...', 'info');
    
    // Check for sensitive data in code
    const sensitivePatterns = [
      /sk_test_[a-zA-Z0-9]+/g, // Paystack test keys
      /sk_live_[a-zA-Z0-9]+/g, // Paystack live keys
      /mongodb:\/\/.*:.*@/g,    // MongoDB connection strings with credentials
      /password\s*=\s*["'][^"']+["']/gi, // Hardcoded passwords
    ];

    const filesToCheck = [
      'lib/paystack-api',
      'lib/utils',
      'lib/services',
      'app/api'
    ];

    let securityIssuesFound = false;

    filesToCheck.forEach(dir => {
      const dirPath = path.join(process.cwd(), dir);
      if (fs.existsSync(dirPath)) {
        this.checkDirectoryForSensitiveData(dirPath, sensitivePatterns);
      }
    });

    if (!securityIssuesFound) {
      this.log('No obvious security issues found in code', 'info');
    }
  }

  checkDirectoryForSensitiveData(dirPath, patterns) {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    
    files.forEach(file => {
      if (file.isDirectory()) {
        this.checkDirectoryForSensitiveData(
          path.join(dirPath, file.name), 
          patterns
        );
      } else if (file.name.endsWith('.ts') || file.name.endsWith('.tsx')) {
        const filePath = path.join(dirPath, file.name);
        const content = fs.readFileSync(filePath, 'utf8');
        
        patterns.forEach(pattern => {
          if (pattern.test(content)) {
            this.log(`Potential sensitive data found in ${filePath}`, 'warn');
          }
        });
      }
    });
  }

  checkDeploymentReadiness() {
    this.log('Checking deployment readiness...', 'info');
    
    // Check build configuration
    if (!fs.existsSync(path.join(process.cwd(), 'next.config.js'))) {
      this.log('Missing Next.js configuration file', 'warn');
    }

    // Check TypeScript configuration
    if (!fs.existsSync(path.join(process.cwd(), 'tsconfig.json'))) {
      this.log('Missing TypeScript configuration file', 'error');
    }

    // Check Tailwind configuration
    if (!fs.existsSync(path.join(process.cwd(), 'tailwind.config.ts'))) {
      this.log('Missing Tailwind CSS configuration file', 'warn');
    }

    // Check for .env.example
    if (!fs.existsSync(path.join(process.cwd(), '.env.example'))) {
      this.log('Missing .env.example file for deployment reference', 'warn');
    }
  }

  generateReport() {
    this.log('\n=== DEPLOYMENT VALIDATION REPORT ===', 'info');
    this.log(`Total checks performed: ${this.checks.length}`, 'info');
    this.log(`Errors found: ${this.errors.length}`, this.errors.length > 0 ? 'error' : 'info');
    this.log(`Warnings found: ${this.warnings.length}`, this.warnings.length > 0 ? 'warn' : 'info');

    if (this.errors.length > 0) {
      this.log('\nERRORS (must be fixed before deployment):', 'error');
      this.errors.forEach(error => this.log(`  - ${error}`, 'error'));
    }

    if (this.warnings.length > 0) {
      this.log('\nWARNINGS (recommended to fix):', 'warn');
      this.warnings.forEach(warning => this.log(`  - ${warning}`, 'warn'));
    }

    const isReady = this.errors.length === 0;
    this.log(`\nDeployment readiness: ${isReady ? 'READY' : 'NOT READY'}`, 
             isReady ? 'info' : 'error');

    return {
      ready: isReady,
      errors: this.errors,
      warnings: this.warnings,
      checks: this.checks
    };
  }

  async run() {
    this.log('Starting deployment validation...', 'info');
    
    this.checkEnvironmentVariables();
    this.checkAPIEndpoints();
    this.checkUtilityClasses();
    this.checkDatabaseSchemas();
    this.checkServices();
    this.checkFormComponents();
    this.checkAdminComponents();
    this.checkBadgeComponents();
    this.checkTestSuite();
    this.checkPackageJson();
    this.checkSecurityConfiguration();
    this.checkDeploymentReadiness();
    
    return this.generateReport();
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new DeploymentValidator();
  validator.run().then(report => {
    process.exit(report.ready ? 0 : 1);
  }).catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

module.exports = DeploymentValidator;