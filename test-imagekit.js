/**
 * Simple test script to verify ImageKit integration
 * Run with: node test-imagekit.js
 */

const ImageKit = require('imagekit');

// Your ImageKit configuration
const imagekit = new ImageKit({
  publicKey: 'public_jsrzY4E4aieuqJC6kXRjFN4ThpM=',
  privateKey: 'private_xxxxxxxxxx', // You'll need to add your private key
  urlEndpoint: 'https://ik.imagekit.io/zy6mjyaq3'
});

async function testImageKit() {
  console.log('🧪 Testing ImageKit Integration...\n');

  try {
    // Test 1: Generate authentication parameters
    console.log('1️⃣ Testing authentication parameter generation...');
    const authParams = imagekit.getAuthenticationParameters();
    console.log('✅ Auth params generated:', {
      token: authParams.token.substring(0, 10) + '...',
      expire: authParams.expire,
      signature: authParams.signature.substring(0, 10) + '...'
    });

    // Test 2: Generate URL with transformations
    console.log('\n2️⃣ Testing URL generation with transformations...');
    const imageURL = imagekit.url({
      path: '/default-image.jpg',
      transformation: [{
        height: '300',
        width: '400',
        quality: '80'
      }]
    });
    console.log('✅ Generated URL:', imageURL);

    // Test 3: Test file upload (with a simple text file)
    console.log('\n3️⃣ Testing file upload...');
    const testContent = 'Hello from GOSA Convention System - ' + new Date().toISOString();
    
    const uploadResult = await imagekit.upload({
      file: Buffer.from(testContent, 'utf-8'),
      fileName: 'gosa-test-' + Date.now() + '.txt',
      folder: '/gosa-convention/test',
      tags: ['test', 'gosa', 'convention']
    });

    console.log('✅ File uploaded successfully:', {
      fileId: uploadResult.fileId,
      name: uploadResult.name,
      url: uploadResult.url,
      size: uploadResult.size
    });

    // Test 4: List files
    console.log('\n4️⃣ Testing file listing...');
    const filesList = await imagekit.listFiles({
      path: '/gosa-convention',
      limit: 5
    });
    console.log('✅ Files found:', filesList.length);
    filesList.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.name} (${file.size} bytes)`);
    });

    // Test 5: Get usage statistics
    console.log('\n5️⃣ Testing usage statistics...');
    const usage = await imagekit.getUsage();
    console.log('✅ Usage stats:', {
      plan: usage.plan,
      storage: usage.storage,
      bandwidth: usage.bandwidth
    });

    console.log('\n🎉 All tests passed! ImageKit integration is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('private key')) {
      console.log('\n💡 Note: You need to add your ImageKit private key to the .env file');
      console.log('   Get it from: https://imagekit.io/dashboard/developer/api-keys');
    }
  }
}

// Run the test
testImageKit();