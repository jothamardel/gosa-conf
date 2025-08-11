#!/usr/bin/env node

/**
 * Performance Check Script
 * Analyzes application performance and optimization opportunities
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class PerformanceChecker {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.optimizations = [];
    this.metrics = {};
  }

  async runCheck() {
    console.log('⚡ Starting Performance Check...\n');

    // Check bundle size
    await this.checkBundleSize();

    // Check database queries
    this.checkDatabaseQueries();

    // Check API response times
    this.checkAPIPerformance();

    // Check image optimization
    this.checkImageOptimization();

    // Check caching strategies
    this.checkCaching();

    // Check memory usage patterns
    this.checkMemoryUsage();

    // Check Next.js optimizations
    this.checkNextJSOptimizations();

    this.printReport();
  }

  async checkBundleSize() {
    console.log('📦 Checking Bundle Size...');

    try {
      // Check if .next directory exists
      const nextDir = path.join(process.cwd(), '.next');
      
      if (!fs.existsSync(nextDir)) {
        this.warnings.push('No build found - run "npm run build" first');
        return;
      }

      // Analyze bundle size
      const staticDir = path.join(nextDir, 'static');
      if (fs.existsSync(staticDir)) {
        const bundleSize = this.calculateDirectorySize(staticDir);
        this.metrics.bundleSize = bundleSize;

        if (bundleSize > 5 * 1024 * 1024) { // 5MB
          this.issues.push(`Bundle size is large: ${this.formatBytes(bundleSize)}`);
        } else if (bundleSize > 2 * 1024 * 1024) { // 2MB
          this.warnings.push(`Bundle size could be optimized: ${this.formatBytes(bundleSize)}`);
        } else {
          this.optimizations.push(`Good bundle size: ${this.formatBytes(bundleSize)}`);
        }
      }

      // Check for code splitting
      const chunksDir = path.join(nextDir, 'static', 'chunks');
      if (fs.existsSync(chunksDir)) {
        const chunks = fs.readdirSync(chunksDir).filter(f => f.endsWith('.js'));
        
        if (chunks.length < 5) {
          this.warnings.push('Limited code splitting detected - consider dynamic imports');
        } else {
          this.optimizations.push(`Good code splitting: ${chunks.length} chunks`);
        }
      }

    } catch (error) {
      this.warnings.push(`Bundle analysis failed: ${error.message}`);
    }
  }

  checkDatabaseQueries() {
    console.log('🗄️  Checking Database Queries...');

    const utilFiles = this.findFiles('*.ts', path.join(process.cwd(), 'lib', 'utils'));
    const schemaFiles = this.findFiles('*.ts', path.join(process.cwd(), 'lib', 'schema'));

    // Check for N+1 query patterns
    utilFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(process.cwd(), file);

      // Check for loops with database queries
      if (content.includes('for') && content.includes('await') && content.includes('find')) {
        this.warnings.push(`Potential N+1 query in ${relativePath}`);
      }

      // Check for missing pagination
      if (content.includes('find(') && !content.includes('limit') && !content.includes('skip')) {
        this.warnings.push(`Missing pagination in ${relativePath}`);
      }

      // Check for proper indexing hints
      if (content.includes('sort(') && !content.includes('index')) {
        this.warnings.push(`Consider adding database indexes for sorting in ${relativePath}`);
      }

      // Check for aggregation pipeline usage
      if (content.includes('aggregate(')) {
        this.optimizations.push(`Aggregation pipeline used in ${relativePath}`);
      }
    });

    // Check schema indexes
    schemaFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(process.cwd(), file);

      if (content.includes('Schema') && !content.includes('index')) {
        this.warnings.push(`No indexes defined in ${relativePath}`);
      }

      if (content.includes('unique: true')) {
        this.optimizations.push(`Unique constraints found in ${relativePath}`);
      }
    });
  }

  checkAPIPerformance() {
    console.log('🚀 Checking API Performance...');

    const apiFiles = this.findFiles('route.ts', path.join(process.cwd(), 'app', 'api'));

    apiFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(process.cwd(), file);

      // Check for response caching
      if (!content.includes('cache') && !content.includes('Cache-Control')) {
        this.warnings.push(`No caching headers in ${relativePath}`);
      }

      // Check for compression
      if (!content.includes('gzip') && !content.includes('compress')) {
        this.warnings.push(`No compression detected in ${relativePath}`);
      }

      // Check for async/await usage
      if (content.includes('async') && content.includes('await')) {
        this.optimizations.push(`Async operations properly handled in ${relativePath}`);
      }

      // Check for error handling
      if (!content.includes('try') || !content.includes('catch')) {
        this.warnings.push(`Missing error handling in ${relativePath}`);
      }

      // Check for input validation
      if (content.includes('POST') && !content.includes('validate')) {
        this.warnings.push(`Input validation may be missing in ${relativePath}`);
      }
    });
  }

  checkImageOptimization() {
    console.log('🖼️  Checking Image Optimization...');

    const publicDir = path.join(process.cwd(), 'public');
    
    if (!fs.existsSync(publicDir)) {
      this.warnings.push('No public directory found');
      return;
    }

    const imageFiles = this.findImageFiles(publicDir);
    let totalImageSize = 0;
    let unoptimizedImages = 0;

    imageFiles.forEach(file => {
      const stats = fs.statSync(file);
      totalImageSize += stats.size;

      // Check for large images
      if (stats.size > 1024 * 1024) { // 1MB
        unoptimizedImages++;
        this.warnings.push(`Large image file: ${path.relative(process.cwd(), file)} (${this.formatBytes(stats.size)})`);
      }
    });

    this.metrics.totalImageSize = totalImageSize;
    this.metrics.imageCount = imageFiles.length;

    if (unoptimizedImages > 0) {
      this.warnings.push(`${unoptimizedImages} images could be optimized`);
    }

    // Check for Next.js Image component usage
    const componentFiles = this.findFiles('*.tsx', path.join(process.cwd(), 'components'));
    let nextImageUsage = 0;

    componentFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('next/image')) {
        nextImageUsage++;
      }
    });

    if (nextImageUsage > 0) {
      this.optimizations.push(`Next.js Image component used in ${nextImageUsage} files`);
    } else {
      this.warnings.push('Consider using Next.js Image component for optimization');
    }
  }

  checkCaching() {
    console.log('💾 Checking Caching Strategies...');

    // Check for Redis or memory caching
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

      if (dependencies.redis || dependencies.ioredis) {
        this.optimizations.push('Redis caching available');
      } else {
        this.warnings.push('Consider implementing Redis for caching');
      }

      if (dependencies['node-cache'] || dependencies['memory-cache']) {
        this.optimizations.push('Memory caching implemented');
      }
    }

    // Check Next.js caching configuration
    const nextConfigPath = path.join(process.cwd(), 'next.config.js');
    
    if (fs.existsSync(nextConfigPath)) {
      const content = fs.readFileSync(nextConfigPath, 'utf8');
      
      if (content.includes('headers') && content.includes('Cache-Control')) {
        this.optimizations.push('Custom caching headers configured');
      }

      if (content.includes('revalidate')) {
        this.optimizations.push('ISR (Incremental Static Regeneration) configured');
      }
    }
  }

  checkMemoryUsage() {
    console.log('🧠 Checking Memory Usage Patterns...');

    const allFiles = [
      ...this.findFiles('*.ts', path.join(process.cwd(), 'lib')),
      ...this.findFiles('*.tsx', path.join(process.cwd(), 'components')),
      ...this.findFiles('*.ts', path.join(process.cwd(), 'app'))
    ];

    allFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(process.cwd(), file);

      // Check for memory leaks patterns
      if (content.includes('setInterval') && !content.includes('clearInterval')) {
        this.warnings.push(`Potential memory leak (uncleaned interval) in ${relativePath}`);
      }

      if (content.includes('addEventListener') && !content.includes('removeEventListener')) {
        this.warnings.push(`Potential memory leak (uncleaned event listener) in ${relativePath}`);
      }

      // Check for large object creation in loops
      if (content.includes('for') && content.includes('new ') && content.includes('Array')) {
        this.warnings.push(`Large object creation in loop detected in ${relativePath}`);
      }

      // Check for proper cleanup in useEffect
      if (content.includes('useEffect') && content.includes('return')) {
        this.optimizations.push(`Proper cleanup in useEffect found in ${relativePath}`);
      }
    });
  }

  checkNextJSOptimizations() {
    console.log('⚛️  Checking Next.js Optimizations...');

    const nextConfigPath = path.join(process.cwd(), 'next.config.js');
    
    if (fs.existsSync(nextConfigPath)) {
      const content = fs.readFileSync(nextConfigPath, 'utf8');

      // Check for image optimization
      if (content.includes('images')) {
        this.optimizations.push('Image optimization configured');
      }

      // Check for bundle analyzer
      if (content.includes('bundle-analyzer')) {
        this.optimizations.push('Bundle analyzer configured');
      }

      // Check for compression
      if (content.includes('compress')) {
        this.optimizations.push('Compression enabled');
      }

      // Check for experimental features
      if (content.includes('experimental')) {
        this.optimizations.push('Experimental features enabled');
      }
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

    if (dynamicImports > 0) {
      this.optimizations.push(`Dynamic imports used in ${dynamicImports} components`);
    } else {
      this.warnings.push('Consider using dynamic imports for code splitting');
    }

    // Check for static generation
    const pageFiles = this.findFiles('page.tsx', path.join(process.cwd(), 'app'));
    let staticGeneration = 0;

    pageFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('generateStaticParams') || content.includes('getStaticProps')) {
        staticGeneration++;
      }
    });

    if (staticGeneration > 0) {
      this.optimizations.push(`Static generation used in ${staticGeneration} pages`);
    }
  }

  calculateDirectorySize(dirPath) {
    let totalSize = 0;

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

  findImageFiles(dir) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const files = [];
    
    if (!fs.existsSync(dir)) {
      return files;
    }

    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory() && !item.name.startsWith('.')) {
        files.push(...this.findImageFiles(fullPath));
      } else if (item.isFile()) {
        const ext = path.extname(item.name).toLowerCase();
        if (imageExtensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
    
    return files;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  printReport() {
    console.log('\n⚡ Performance Check Report');
    console.log('=' .repeat(50));

    // Print metrics
    if (Object.keys(this.metrics).length > 0) {
      console.log('\n📊 Metrics:');
      Object.entries(this.metrics).forEach(([key, value]) => {
        if (key.includes('Size')) {
          console.log(`  ${key}: ${this.formatBytes(value)}`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      });
    }

    console.log(`\n✅ Optimizations Found: ${this.optimizations.length}`);
    this.optimizations.forEach(item => console.log(`  ✓ ${item}`));

    console.log(`\n⚠️  Performance Warnings: ${this.warnings.length}`);
    this.warnings.forEach(item => console.log(`  ⚠️  ${item}`));

    console.log(`\n❌ Performance Issues: ${this.issues.length}`);
    this.issues.forEach(item => console.log(`  ❌ ${item}`));

    const totalChecks = this.optimizations.length + this.warnings.length + this.issues.length;
    const score = totalChecks > 0 ? ((this.optimizations.length / totalChecks) * 100).toFixed(1) : 0;

    console.log(`\n📈 Performance Score: ${score}%`);

    if (this.issues.length > 0) {
      console.log('\n🚨 Performance issues found! Consider optimization before deployment.');
    } else if (this.warnings.length > 0) {
      console.log('\n⚠️  Performance warnings found. Consider optimization for better performance.');
    } else {
      console.log('\n🎉 No critical performance issues found!');
    }

    // Recommendations
    console.log('\n💡 Recommendations:');
    if (this.warnings.length > 0) {
      console.log('  • Address performance warnings for better user experience');
    }
    if (this.metrics.bundleSize && this.metrics.bundleSize > 1024 * 1024) {
      console.log('  • Consider code splitting and tree shaking to reduce bundle size');
    }
    console.log('  • Monitor performance metrics in production');
    console.log('  • Set up performance budgets in CI/CD pipeline');
    console.log('  • Use tools like Lighthouse for ongoing performance monitoring');
  }
}

// Run check if called directly
if (require.main === module) {
  const checker = new PerformanceChecker();
  checker.runCheck().catch(error => {
    console.error('Performance check failed:', error);
    process.exit(1);
  });
}

module.exports = PerformanceChecker;