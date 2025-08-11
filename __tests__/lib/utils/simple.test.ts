// Simple test to verify Jest is working
describe('Simple Test Suite', () => {
  it('should pass basic arithmetic test', () => {
    expect(2 + 2).toBe(4);
  });

  it('should handle string operations', () => {
    const str = 'Hello World';
    expect(str.toLowerCase()).toBe('hello world');
    expect(str.includes('World')).toBe(true);
  });

  it('should handle array operations', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(arr.length).toBe(5);
    expect(arr.includes(3)).toBe(true);
    expect(arr.filter(x => x > 3)).toEqual([4, 5]);
  });

  it('should handle object operations', () => {
    const obj = { name: 'John', age: 30 };
    expect(obj.name).toBe('John');
    expect(Object.keys(obj)).toEqual(['name', 'age']);
  });

  it('should handle async operations', async () => {
    const promise = Promise.resolve('success');
    const result = await promise;
    expect(result).toBe('success');
  });
});

// Test utility functions that don't require complex dependencies
describe('Utility Functions', () => {
  describe('Payment Reference Generation', () => {
    it('should generate dinner payment reference', () => {
      const phone = '08012345678';
      const timestamp = Date.now();
      const reference = `DINNER_${timestamp}_${phone}`;
      
      expect(reference).toMatch(/^DINNER_\d+_08012345678$/);
    });

    it('should generate accommodation payment reference', () => {
      const phone = '08012345678';
      const timestamp = Date.now();
      const reference = `ACCOM_${timestamp}_${phone}`;
      
      expect(reference).toMatch(/^ACCOM_\d+_08012345678$/);
    });

    it('should generate brochure payment reference', () => {
      const phone = '08012345678';
      const timestamp = Date.now();
      const reference = `BROCH_${timestamp}_${phone}`;
      
      expect(reference).toMatch(/^BROCH_\d+_08012345678$/);
    });
  });

  describe('Amount Calculations', () => {
    it('should calculate dinner total correctly', () => {
      const pricePerPerson = 75;
      const numberOfGuests = 3;
      const total = pricePerPerson * numberOfGuests;
      
      expect(total).toBe(225);
    });

    it('should calculate accommodation total correctly', () => {
      const accommodationPrices = {
        standard: 100,
        premium: 200,
        luxury: 350
      };
      
      const nights = 2;
      const standardTotal = accommodationPrices.standard * nights;
      const premiumTotal = accommodationPrices.premium * nights;
      const luxuryTotal = accommodationPrices.luxury * nights;
      
      expect(standardTotal).toBe(200);
      expect(premiumTotal).toBe(400);
      expect(luxuryTotal).toBe(700);
    });

    it('should calculate brochure total with discounts', () => {
      const digitalPrice = 10;
      const physicalPrice = 20;
      
      // No discount for less than 5
      expect(digitalPrice * 3).toBe(30);
      expect(physicalPrice * 3).toBe(60);
      
      // 5% discount for 5-9 items
      const qty5 = 5;
      const base5 = physicalPrice * qty5;
      const discounted5 = base5 * 0.95;
      expect(discounted5).toBe(95);
      
      // 10% discount for 10+ items
      const qty10 = 10;
      const base10 = physicalPrice * qty10;
      const discounted10 = base10 * 0.9;
      expect(discounted10).toBe(180);
    });
  });

  describe('Validation Functions', () => {
    it('should validate email addresses', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      expect(emailRegex.test('john@example.com')).toBe(true);
      expect(emailRegex.test('jane.doe@company.co.uk')).toBe(true);
      expect(emailRegex.test('invalid-email')).toBe(false);
      expect(emailRegex.test('missing@domain')).toBe(false);
      expect(emailRegex.test('@missing-local.com')).toBe(false);
    });

    it('should validate phone numbers', () => {
      const phoneRegex = /^0[789][01]\d{8}$/;
      
      expect(phoneRegex.test('08012345678')).toBe(true);
      expect(phoneRegex.test('07012345678')).toBe(true);
      expect(phoneRegex.test('09012345678')).toBe(true);
      expect(phoneRegex.test('06012345678')).toBe(false);
      expect(phoneRegex.test('0801234567')).toBe(false); // too short
      expect(phoneRegex.test('080123456789')).toBe(false); // too long
    });

    it('should validate guest count', () => {
      const validateGuestCount = (count: number) => {
        return count >= 1 && count <= 10;
      };
      
      expect(validateGuestCount(1)).toBe(true);
      expect(validateGuestCount(5)).toBe(true);
      expect(validateGuestCount(10)).toBe(true);
      expect(validateGuestCount(0)).toBe(false);
      expect(validateGuestCount(11)).toBe(false);
      expect(validateGuestCount(-1)).toBe(false);
    });

    it('should validate donation amounts', () => {
      const validateDonationAmount = (amount: number, minAmount: number = 5) => {
        return amount >= minAmount && amount <= 100000 && !isNaN(amount);
      };
      
      expect(validateDonationAmount(10)).toBe(true);
      expect(validateDonationAmount(100)).toBe(true);
      expect(validateDonationAmount(4)).toBe(false); // below minimum
      expect(validateDonationAmount(100001)).toBe(false); // above maximum
      expect(validateDonationAmount(NaN)).toBe(false); // invalid number
    });
  });

  describe('Date Utilities', () => {
    it('should calculate nights between dates', () => {
      const checkIn = new Date('2024-03-15');
      const checkOut = new Date('2024-03-17');
      
      const timeDiff = checkOut.getTime() - checkIn.getTime();
      const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      expect(nights).toBe(2);
    });

    it('should validate date ranges', () => {
      const today = new Date();
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      
      // Check-in should be in the future
      expect(tomorrow > today).toBe(true);
      expect(yesterday > today).toBe(false);
      
      // Check-out should be after check-in
      const checkIn = new Date('2024-03-15');
      const checkOut = new Date('2024-03-17');
      const invalidCheckOut = new Date('2024-03-13');
      
      expect(checkOut > checkIn).toBe(true);
      expect(invalidCheckOut > checkIn).toBe(false);
    });
  });

  describe('String Utilities', () => {
    it('should generate confirmation codes', () => {
      const generateConfirmationCode = () => {
        return 'CONF' + Math.random().toString(36).substr(2, 6).toUpperCase();
      };
      
      const code1 = generateConfirmationCode();
      const code2 = generateConfirmationCode();
      
      expect(code1).toMatch(/^CONF[A-Z0-9]{6}$/);
      expect(code2).toMatch(/^CONF[A-Z0-9]{6}$/);
      expect(code1).not.toBe(code2); // Should be unique
    });

    it('should generate receipt numbers', async () => {
      const generateReceiptNumber = () => {
        return 'RCP' + Date.now().toString();
      };
      
      const receipt1 = generateReceiptNumber();
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
      const receipt2 = generateReceiptNumber();
      
      expect(receipt1).toMatch(/^RCP\d+$/);
      expect(receipt2).toMatch(/^RCP\d+$/);
      expect(receipt1).not.toBe(receipt2); // Should be unique
    });

    it('should format phone numbers', () => {
      const formatPhoneNumber = (phone: string) => {
        if (phone.startsWith('0')) {
          return '234' + phone.substring(1);
        }
        if (phone.startsWith('+234')) {
          return phone.substring(1);
        }
        if (phone.startsWith('234')) {
          return phone;
        }
        return phone;
      };
      
      expect(formatPhoneNumber('08012345678')).toBe('2348012345678');
      expect(formatPhoneNumber('+2348012345678')).toBe('2348012345678');
      expect(formatPhoneNumber('2348012345678')).toBe('2348012345678');
    });
  });
});