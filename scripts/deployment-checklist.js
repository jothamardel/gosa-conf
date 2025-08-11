#!/usr/bin/env node

/**
 * Deployment Checklist Script
 * Comprehensive pre-deployment verification
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DeploymentChecker {
  constructor() {
    this.checklist = [];
    this.passed = 0;
    this.failed = 0;
    this.warnings = 0;
  }

  async runChecklist() {
    console.log('🚀 Running Deployment Checklist...\n');

    // Environment and Configuration
    this.checkEnvironmentVariables();
    this.checkConfiguration();
    
    // Code Quality and Security
    this.checkCodeQuality();
    this.checkSecurity();
    
    // Build and Dependencies
    await this.checkBuild();
    this.checkDependencies();
    
    // Database and External Services
    this.checkDatabaseConnection();
    this.checkExternalServices();
    
    // Performance and Monitoring
    this.checkPerformance();
    this.checkMonitoring();
    
    // Documentation and Deployment
    this.checkDocumentation();
    this.checkDeploymentConfig();

    this.printSummary();
  }

  checkItem(name, condition, type = 'error', details = '') {
    const status = condition ? 'PASS' : 'FAIL';
    const icon = condition ? '✅' : (type === 'warning' ? '⚠️' : '❌');
    
    this.checklist.push({
      name,
      status,
      type: condition ? 'pass' : type,
      details,
      icon
    });

    if (condition) {
      this.passed++;
    } else if (type === 'warning') {
      this.warnings++;
    } else {
      this.failed++;
    }

    console.log(`${icon} ${name}${details ? ` - ${details}` : ''}`);
  }

  checkEnvironmentVariables() {
    console.log('🔧 Environment Variables');
    console.log('-'.repeat(30));

    const requiredEnvVars = [
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL',
      'MONGODB_URI',
      'PAYSTACK_SECRET_KEY',
      'WASENDER_API_KEY'
    ];

    const productionEnvVars = [
      'NODE_ENV',
      'VERCEL_URL',
      'DATABASE_URL'
    ];

    // Check required variables
    requiredEnvVars.forEach(envVar => {
      const exists = !!process.env[envVar];
      this.checkItem(
        `${envVar} is set`,
        exists,
        'error',
        exists ? 'Set' : 'Missing'
      );
    });

    // Check production-specific variables
    if (process.env.NODE_ENV === 'production') {
      productionEnvVars.forEach(envVar => {
        const exists = !!process.env[envVar];
        this.checkItem(
          `Production ${envVar} is set`,
          exists,
          'warning',
          exists ? 'Set' : 'Missing'
        );
      });
    }

    // Check for test/development values in production
    if (process.env.NODE_ENV === 'production') {
      const testValues = ['test', 'development', 'localhost', 'example.com'];
      
      requiredEnvVars.forEach(envVar => {
        const value = process.env[envVar];
        if (value) {
          const hasTestValue = testValues.some(test => 
            value.toLowerCase().includes(test)
          );
          
          this.checkItem(
            `${envVar} is not using test values`,
            !hasTestValue,
            'error',
            hasTestValue ? 'Contains test values' : 'Production ready'
          );
        }
      });
    }

    console.log();
  }

  checkConfiguration() {
    console.log('⚙️  Configuration Files');
    console.log('-'.repeat(30));

    // Check Next.js config
    const nextConfigPath = path.join(process.cwd(), 'next.config.js');
    const nextConfigExists = fs.existsSync(nextConfigPath);
    
    this.checkItem(
      'next.config.js exists',
      nextConfigExists,
      'warning'
    );

    if (nextConfigExists) {
      const content = fs.readFileSync(nextConfigPath, 'utf8');
      
      this.checkItem(
        'Image optimization configured',
        content.includes('images'),
        'warning'
      );

      this.checkItem(
        'Security headers configured',
        content.includes('headers'),
        'warning'
      );
    }

    // Check package.json
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJsonExists = fs.existsSync(packageJsonPath);
    
    this.checkItem(
      'package.json exists',
      packageJsonExists,
      'error'
    );

    if (packageJsonExists) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      this.checkItem(
        'Build script defined',
        !!packageJson.scripts?.build,
        'error'
      );

      this.checkItem(
        'Start script defined',
        !!packageJson.scripts?.start,
        'error'
      );

      this.checkItem(
        'Test script defined',
        !!packageJson.scripts?.test,
        'warning'
      );
    }

    // Check TypeScript config
    const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
    this.checkItem(
      'tsconfig.json exists',
      fs.existsSync(tsconfigPath),
      'warning'
    );

    console.log();
  }

  checkCodeQuality() {
    console.log('📝 Code Quality');
    console.log('-'.repeat(30));

    // Check for linting
    const eslintConfigExists = fs.existsSync(path.join(process.cwd(), '.eslintrc.json')) ||
                              fs.existsSync(path.join(process.cwd(), '.eslintrc.js'));
    
    this.checkItem(
      'ESLint configuration exists',
      eslintConfigExists,
      'warning'
    );

    // Check for TypeScript
    const hasTypeScript = fs.existsSync(path.join(process.cwd(), 'tsconfig.json'));
    this.checkItem(
      'TypeScript configured',
      hasTypeScript,
      'warning'
    );

    // Check for tests
    const testDir = path.join(process.cwd(), '__tests__');
    const hasTests = fs.existsSync(testDir);
    
    this.checkItem(
      'Test directory exists',
      hasTests,
      'warning'
    );

    if (hasTests) {
      const testFiles = this.findFiles('*.test.*', testDir);
      this.checkItem(
        'Test files exist',
        testFiles.length > 0,
        'warning',
        `${testFiles.length} test files found`
      );
    }

    // Check for proper error handling
    const apiFiles = this.findFiles('route.ts', path.join(process.cwd(), 'app', 'api'));
    let errorHandlingCount = 0;

    apiFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('try') && content.includes('catch')) {
        errorHandlingCount++;
      }
    });

    this.checkItem(
      'API routes have error handling',
      errorHandlingCount === apiFiles.length,
      'warning',
      `${errorHandlingCount}/${apiFiles.length} routes`
    );

    console.log();
  }

  checkSecurity() {
    console.log('🔒 Security');
    console.log('-'.repeat(30));

    // Check for HTTPS enforcement
    const nextConfigPath = path.join(process.cwd(), 'next.config.js');
    if (fs.existsSync(nextConfigPath)) {
      const content = fs.readFileSync(nextConfigPath, 'utf8');
      
      this.checkItem(
        'Security headers configured',
        content.includes('X-Frame-Options') || content.includes('helmet'),
        'warning'
      );
    }

    // Check for sensitive files
    const sensitiveFiles = ['.env', '.env.local', '.env.production'];
    const exposedFiles = sensitiveFiles.filter(file => 
      fs.existsSync(path.join(process.cwd(), file))
    );

    this.checkItem(
      'No sensitive files in repository',
      exposedFiles.length === 0,
      'error',
      exposedFiles.length > 0 ? `Found: ${exposedFiles.join(', ')}` : 'Clean'
    );

    // Check gitignore
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const content = fs.readFileSync(gitignorePath, 'utf8');
      
      this.checkItem(
        '.env files in .gitignore',
        content.includes('.env'),
        'error'
      );

      this.checkItem(
        'node_modules in .gitignore',
        content.includes('node_modules'),
        'error'
      );
    }

    // Check for webhook signature verification
    const webhookFiles = this.findFiles('route.ts', path.join(process.cwd(), 'app', 'api', 'webhook'));
    let secureWebhooks = 0;

    webhookFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('signature') && content.includes('verify')) {
        secureWebhooks++;
      }
    });

    this.checkItem(
      'Webhook signature verification',
      secureWebhooks === webhookFiles.length,
      'error',
      `${secureWebhooks}/${webhookFiles.length} webhooks secured`
    );

    console.log();
  }

  async checkBuild() {
    console.log('🏗️  Build Process');
    console.log('-'.repeat(30));

    try {
      // Check if build directory exists
      const buildDir = path.join(process.cwd(), '.next');
      const buildExists = fs.existsSync(buildDir);
      
      this.checkItem(
        'Build directory exists',
        buildExists,
        'warning',
        buildExists ? 'Found' : 'Run npm run build'
      );

      // Try to run build (if not in CI)
      if (!process.env.CI) {
        try {
          console.log('  Running build test...');
          execSync('npm run build', { stdio: 'pipe', timeout: 60000 });
          
          this.checkItem(
            'Build completes successfully',
            true,
            'error'
          );
        } catch (error) {
          this.checkItem(
            'Build completes successfully',
            false,
            'error',
            'Build failed'
          );
        }
      }

      // Check build size
      if (buildExists) {
        const staticDir = path.join(buildDir, 'static');
        if (fs.existsSync(staticDir)) {
          const buildSize = this.calculateDirectorySize(staticDir);
          
          this.checkItem(
            'Build size is reasonable',
            buildSize < 10 * 1024 * 1024, // 10MB
            'warning',
            this.formatBytes(buildSize)
          );
        }
      }

    } catch (error) {
      this.checkItem(
        'Build process check',
        false,
        'error',
        error.message
      );
    }

    console.log();
  }

  checkDependencies() {
    console.log('📦 Dependencies');
    console.log('-'.repeat(30));

    const packageJsonPath = path.join(process.cwd(), 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Check for package-lock.json
      const lockFileExists = fs.existsSync(path.join(process.cwd(), 'package-lock.json'));
      
      this.checkItem(
        'Lock file exists',
        lockFileExists,
        'warning',
        lockFileExists ? 'package-lock.json found' : 'Missing lock file'
      );

      // Check for known vulnerable packages
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      const vulnerablePackages = ['lodash', 'moment', 'request'];
      const foundVulnerable = vulnerablePackages.filter(pkg => dependencies[pkg]);

      this.checkItem(
        'No known vulnerable packages',
        foundVulnerable.length === 0,
        'warning',
        foundVulnerable.length > 0 ? `Found: ${foundVulnerable.join(', ')}` : 'Clean'
      );

      // Check for production dependencies
      const prodDeps = Object.keys(packageJson.dependencies || {});
      
      this.checkItem(
        'Production dependencies exist',
        prodDeps.length > 0,
        'error',
        `${prodDeps.length} dependencies`
      );

      // Check for essential packages
      const essentialPackages = ['next', 'react', 'react-dom'];
      const missingEssential = essentialPackages.filter(pkg => !dependencies[pkg]);

      this.checkItem(
        'Essential packages installed',
        missingEssential.length === 0,
        'error',
        missingEssential.length > 0 ? `Missing: ${missingEssential.join(', ')}` : 'All present'
      );
    }

    console.log();
  }

  checkDatabaseConnection() {
    console.log('🗄️  Database');
    console.log('-'.repeat(30));

    // Check MongoDB URI format
    const mongoUri = process.env.MONGODB_URI;
    
    this.checkItem(
      'MongoDB URI is set',
      !!mongoUri,
      'error'
    );

    if (mongoUri) {
      this.checkItem(
        'MongoDB URI format is valid',
        mongoUri.startsWith('mongodb://') || mongoUri.startsWith('mongodb+srv://'),
        'error'
      );

      this.checkItem(
        'MongoDB URI is not localhost in production',
        process.env.NODE_ENV !== 'production' || !mongoUri.includes('localhost'),
        'error'
      );
    }

    // Check for database schemas
    const schemaDir = path.join(process.cwd(), 'lib', 'schema');
    const schemaExists = fs.existsSync(schemaDir);
    
    this.checkItem(
      'Database schemas exist',
      schemaExists,
      'warning'
    );

    if (schemaExists) {
      const schemaFiles = this.findFiles('*.ts', schemaDir);
      
      this.checkItem(
        'Schema files found',
        schemaFiles.length > 0,
        'warning',
        `${schemaFiles.length} schema files`
      );
    }

    console.log();
  }

  checkExternalServices() {
    console.log('🌐 External Services');
    console.log('-'.repeat(30));

    // Check Paystack configuration
    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    
    this.checkItem(
      'Paystack secret key is set',
      !!paystackKey,
      'error'
    );

    if (paystackKey) {
      this.checkItem(
        'Paystack key format is valid',
        paystackKey.startsWith('sk_'),
        'error'
      );

      this.checkItem(
        'Paystack key is not test key in production',
        process.env.NODE_ENV !== 'production' || !paystackKey.includes('test'),
        'error'
      );
    }

    // Check WASender API
    const wasenderKey = process.env.WASENDER_API_KEY;
    
    this.checkItem(
      'WASender API key is set',
      !!wasenderKey,
      'error'
    );

    // Check NextAuth configuration
    const nextAuthSecret = process.env.NEXTAUTH_SECRET;
    const nextAuthUrl = process.env.NEXTAUTH_URL;
    
    this.checkItem(
      'NextAuth secret is set',
      !!nextAuthSecret,
      'error'
    );

    this.checkItem(
      'NextAuth URL is set',
      !!nextAuthUrl,
      'error'
    );

    if (nextAuthUrl) {
      this.checkItem(
        'NextAuth URL is HTTPS in production',
        process.env.NODE_ENV !== 'production' || nextAuthUrl.startsWith('https://'),
        'error'
      );
    }

    console.log();
  }

  checkPerformance() {
    console.log('⚡ Performance');
    console.log('-'.repeat(30));

    // Check for image optimization
    const nextConfigPath = path.join(process.cwd(), 'next.config.js');
    if (fs.existsSync(nextConfigPath)) {
      const content = fs.readFileSync(nextConfigPath, 'utf8');
      
      this.checkItem(
        'Image optimization enabled',
        !content.includes('unoptimized: true'),
        'warning'
      );
    }

    // Check for dynamic imports
    const componentFiles = this.findFiles('*.tsx', path.join(process.cwd(), 'components'));
    let dynamicImports = 0;

    componentFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('dynamic(') || content.includes('lazy(')) {
        dynamicImports++;
      }
    });

    this.checkItem(
      'Dynamic imports used',
      dynamicImports > 0,
      'warning',
      `${dynamicImports} components use dynamic imports`
    );

    // Check bundle size
    const buildDir = path.join(process.cwd(), '.next');
    if (fs.existsSync(buildDir)) {
      const staticDir = path.join(buildDir, 'static');
      if (fs.existsSync(staticDir)) {
        const bundleSize = this.calculateDirectorySize(staticDir);
        
        this.checkItem(
          'Bundle size is optimized',
          bundleSize < 5 * 1024 * 1024, // 5MB
          'warning',
          this.formatBytes(bundleSize)
        );
      }
    }

    console.log();
  }

  checkMonitoring() {
    console.log('📊 Monitoring');
    console.log('-'.repeat(30));

    // Check for error tracking
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

      const monitoringTools = ['@sentry/nextjs', 'winston', 'pino'];
      const hasMonitoring = monitoringTools.some(tool => dependencies[tool]);

      this.checkItem(
        'Error tracking configured',
        hasMonitoring,
        'warning',
        hasMonitoring ? 'Found monitoring tools' : 'Consider adding error tracking'
      );
    }

    // Check for logging
    const apiFiles = this.findFiles('route.ts', path.join(process.cwd(), 'app', 'api'));
    let loggingCount = 0;

    apiFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('console.log') || content.includes('logger')) {
        loggingCount++;
      }
    });

    this.checkItem(
      'API routes have logging',
      loggingCount > 0,
      'warning',
      `${loggingCount}/${apiFiles.length} routes have logging`
    );

    console.log();
  }

  checkDocumentation() {
    console.log('📚 Documentation');
    console.log('-'.repeat(30));

    // Check for README
    const readmeExists = fs.existsSync(path.join(process.cwd(), 'README.md'));
    
    this.checkItem(
      'README.md exists',
      readmeExists,
      'warning'
    );

    // Check for API documentation
    const apiDocsExist = fs.existsSync(path.join(process.cwd(), 'docs')) ||
                        fs.existsSync(path.join(process.cwd(), 'API.md'));
    
    this.checkItem(
      'API documentation exists',
      apiDocsExist,
      'warning'
    );

    // Check for deployment guide
    const deploymentDocsExist = fs.existsSync(path.join(process.cwd(), 'DEPLOYMENT.md')) ||
                               fs.existsSync(path.join(process.cwd(), 'docs', 'deployment.md'));
    
    this.checkItem(
      'Deployment documentation exists',
      deploymentDocsExist,
      'warning'
    );

    console.log();
  }

  checkDeploymentConfig() {
    console.log('🚀 Deployment Configuration');
    console.log('-'.repeat(30));

    // Check for Vercel config
    const vercelConfigExists = fs.existsSync(path.join(process.cwd(), 'vercel.json'));
    
    this.checkItem(
      'Vercel configuration exists',
      vercelConfigExists,
      'warning'
    );

    // Check for Docker config
    const dockerfileExists = fs.existsSync(path.join(process.cwd(), 'Dockerfile'));
    
    this.checkItem(
      'Dockerfile exists (if using Docker)',
      dockerfileExists,
      'warning'
    );

    // Check for CI/CD config
    const ciConfigExists = fs.existsSync(path.join(process.cwd(), '.github', 'workflows')) ||
                          fs.existsSync(path.join(process.cwd(), '.gitlab-ci.yml')) ||
                          fs.existsSync(path.join(process.cwd(), 'azure-pipelines.yml'));
    
    this.checkItem(
      'CI/CD configuration exists',
      ciConfigExists,
      'warning'
    );

    console.log();
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

  calculateDirectorySize(dirPath) {
    let totalSize = 0;

    if (!fs.existsSync(dirPath)) {
      return 0;
    }

    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      
      if (item.isDirectory()) {
        totalSize += this.calculateDirectorySize(fullPath);
      } else {
        totalSize += fs.statSync(fullPath).size;
      }
    }

    return totalSize;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  printSummary() {
    console.log('\n🚀 Deployment Readiness Summary');
    console.log('=' .repeat(50));

    const total = this.passed + this.failed + this.warnings;
    const passRate = total > 0 ? ((this.passed / total) * 100).toFixed(1) : 0;

    console.log(`\n📊 Results:`);
    console.log(`  ✅ Passed: ${this.passed}`);
    console.log(`  ⚠️  Warnings: ${this.warnings}`);
    console.log(`  ❌ Failed: ${this.failed}`);
    console.log(`  📈 Pass Rate: ${passRate}%`);

    // Critical failures
    const criticalFailures = this.checklist.filter(item => 
      item.status === 'FAIL' && item.type === 'error'
    );

    if (criticalFailures.length > 0) {
      console.log(`\n🚨 Critical Issues (${criticalFailures.length}):`);
      criticalFailures.forEach(item => {
        console.log(`  ❌ ${item.name}${item.details ? ` - ${item.details}` : ''}`);
      });
      console.log('\n❌ DEPLOYMENT NOT RECOMMENDED - Fix critical issues first!');
      process.exit(1);
    }

    // Warnings
    const warnings = this.checklist.filter(item => 
      item.status === 'FAIL' && item.type === 'warning'
    );

    if (warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${warnings.length}):`);
      warnings.forEach(item => {
        console.log(`  ⚠️  ${item.name}${item.details ? ` - ${item.details}` : ''}`);
      });
    }

    // Deployment readiness
    if (criticalFailures.length === 0) {
      if (warnings.length === 0) {
        console.log('\n🎉 READY FOR DEPLOYMENT!');
        console.log('All checks passed. Your application is ready for production.');
      } else {
        console.log('\n✅ DEPLOYMENT APPROVED WITH WARNINGS');
        console.log('Consider addressing warnings for optimal production experience.');
      }
    }

    // Next steps
    console.log('\n📋 Next Steps:');
    if (criticalFailures.length > 0) {
      console.log('  1. Fix all critical issues listed above');
      console.log('  2. Re-run this checklist');
    } else {
      console.log('  1. Review and address any warnings');
      console.log('  2. Run final tests in staging environment');
      console.log('  3. Deploy to production');
      console.log('  4. Monitor application performance and errors');
    }
  }
}

// Run checklist if called directly
if (require.main === module) {
  const checker = new DeploymentChecker();
  checker.runChecklist().catch(error => {
    console.error('Deployment checklist failed:', error);
    process.exit(1);
  });
}

module.exports = DeploymentChecker;