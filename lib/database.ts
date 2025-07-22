// Mock database functions - In production, replace with actual database calls

import { Registration, User, CheckInLog, GoodwillMessage, Donation } from './types';

// Mock data store
const mockDatabase = {
  users: new Map<string, User>(),
  registrations: new Map<string, Registration>(),
  checkInLogs: new Map<string, CheckInLog>(),
  goodwillMessages: new Map<string, GoodwillMessage>(),
  donations: new Map<string, Donation>(),
};

// User Functions
export async function createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
  const user: User = {
    ...userData,
    id: Math.random().toString(36).substr(2, 9),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  mockDatabase.users.set(user.id, user);
  return user;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  for (const user of mockDatabase.users.values()) {
    if (user.email === email) {
      return user;
    }
  }
  return null;
}

export async function getUserById(id: string): Promise<User | null> {
  return mockDatabase.users.get(id) || null;
}

// Registration Functions
export async function createRegistration(
  registrationData: Omit<Registration, 'id' | 'createdAt' | 'updatedAt' | 'qrCode' | 'qrCodeGenerated' | 'checkedIn'>
): Promise<Registration> {
  const registration: Registration = {
    ...registrationData,
    id: Math.random().toString(36).substr(2, 9),
    qrCode: `QR_${Math.random().toString(36).toUpperCase().substr(2, 12)}`,
    qrCodeGenerated: true,
    checkedIn: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  mockDatabase.registrations.set(registration.id, registration);
  return registration;
}

export async function getRegistrationById(id: string): Promise<Registration | null> {
  return mockDatabase.registrations.get(id) || null;
}

export async function getRegistrationByQRCode(qrCode: string): Promise<Registration | null> {
  for (const registration of mockDatabase.registrations.values()) {
    if (registration.qrCode === qrCode) {
      return registration;
    }
  }
  return null;
}

export async function updateRegistration(id: string, updates: Partial<Registration>): Promise<Registration | null> {
  const registration = mockDatabase.registrations.get(id);
  if (!registration) return null;
  
  const updated = {
    ...registration,
    ...updates,
    updatedAt: new Date(),
  };
  
  mockDatabase.registrations.set(id, updated);
  return updated;
}

export async function getAllRegistrations(): Promise<Registration[]> {
  return Array.from(mockDatabase.registrations.values());
}

export async function getRegistrationsByStatus(paymentStatus: Registration['paymentStatus']): Promise<Registration[]> {
  return Array.from(mockDatabase.registrations.values()).filter(
    reg => reg.paymentStatus === paymentStatus
  );
}

export async function getCheckedInRegistrations(): Promise<Registration[]> {
  return Array.from(mockDatabase.registrations.values()).filter(
    reg => reg.checkedIn === true
  );
}

// Check-in Functions
export async function createCheckInLog(logData: Omit<CheckInLog, 'id'>): Promise<CheckInLog> {
  const log: CheckInLog = {
    ...logData,
    id: Math.random().toString(36).substr(2, 9),
  };
  
  mockDatabase.checkInLogs.set(log.id, log);
  return log;
}

export async function getCheckInLogs(): Promise<CheckInLog[]> {
  return Array.from(mockDatabase.checkInLogs.values());
}

export async function processCheckIn(qrCode: string, checkedInBy: string): Promise<{
  success: boolean;
  registration?: Registration;
  message: string;
}> {
  const registration = await getRegistrationByQRCode(qrCode);
  
  if (!registration) {
    await createCheckInLog({
      registrationId: '',
      qrCode,
      checkedInBy,
      timestamp: new Date(),
      successful: false,
      reason: 'Invalid QR code',
    });
    
    return {
      success: false,
      message: 'Invalid QR code or registration not found',
    };
  }
  
  if (registration.checkedIn) {
    await createCheckInLog({
      registrationId: registration.id,
      qrCode,
      checkedInBy,
      timestamp: new Date(),
      successful: false,
      reason: 'Already checked in',
    });
    
    return {
      success: false,
      registration,
      message: 'This attendee has already been checked in',
    };
  }
  
  // Update registration
  const updatedRegistration = await updateRegistration(registration.id, {
    checkedIn: true,
    checkInTime: new Date(),
    checkInBy: checkedInBy,
  });
  
  // Log successful check-in
  await createCheckInLog({
    registrationId: registration.id,
    qrCode,
    checkedInBy,
    timestamp: new Date(),
    successful: true,
  });
  
  return {
    success: true,
    registration: updatedRegistration!,
    message: 'Check-in successful',
  };
}

// Goodwill Message Functions
export async function createGoodwillMessage(
  messageData: Omit<GoodwillMessage, 'id' | 'createdAt' | 'approved'>
): Promise<GoodwillMessage> {
  const message: GoodwillMessage = {
    ...messageData,
    id: Math.random().toString(36).substr(2, 9),
    approved: false,
    createdAt: new Date(),
  };
  
  mockDatabase.goodwillMessages.set(message.id, message);
  return message;
}

export async function getGoodwillMessages(): Promise<GoodwillMessage[]> {
  return Array.from(mockDatabase.goodwillMessages.values());
}

export async function approveGoodwillMessage(id: string, approvedBy: string): Promise<GoodwillMessage | null> {
  const message = mockDatabase.goodwillMessages.get(id);
  if (!message) return null;
  
  const updated = {
    ...message,
    approved: true,
    approvedBy,
    approvedAt: new Date(),
  };
  
  mockDatabase.goodwillMessages.set(id, updated);
  return updated;
}

// Donation Functions
export async function createDonation(donationData: Omit<Donation, 'id' | 'createdAt'>): Promise<Donation> {
  const donation: Donation = {
    ...donationData,
    id: Math.random().toString(36).substr(2, 9),
    createdAt: new Date(),
  };
  
  mockDatabase.donations.set(donation.id, donation);
  return donation;
}

export async function getDonations(): Promise<Donation[]> {
  return Array.from(mockDatabase.donations.values());
}

export async function getTotalDonations(): Promise<number> {
  const donations = await getDonations();
  return donations.reduce((total, donation) => total + donation.amount, 0);
}

// Analytics Functions
export async function getRegistrationStats(): Promise<{
  total: number;
  paid: number;
  pending: number;
  checkedIn: number;
  dinnerTickets: number;
  accommodation: number;
}> {
  const registrations = await getAllRegistrations();
  
  return {
    total: registrations.length,
    paid: registrations.filter(r => r.paymentStatus === 'completed').length,
    pending: registrations.filter(r => r.paymentStatus === 'pending').length,
    checkedIn: registrations.filter(r => r.checkedIn).length,
    dinnerTickets: registrations.filter(r => r.dinnerTicket).length,
    accommodation: registrations.filter(r => r.accommodationNeeded).length,
  };
}

export async function getRevenueStats(): Promise<{
  totalRevenue: number;
  registrationRevenue: number;
  dinnerRevenue: number;
  accommodationRevenue: number;
  goodwillRevenue: number;
  donationRevenue: number;
}> {
  const registrations = await getAllRegistrations();
  const donations = await getDonations();
  
  const totalRevenue = registrations
    .filter(r => r.paymentStatus === 'completed')
    .reduce((total, r) => total + r.totalAmount, 0);
  
  const registrationRevenue = registrations
    .filter(r => r.paymentStatus === 'completed')
    .reduce((total, r) => total + 50, 0); // Base registration fee
  
  const dinnerRevenue = registrations
    .filter(r => r.paymentStatus === 'completed' && r.dinnerTicket)
    .reduce((total, r) => total + 75, 0);
  
  const accommodationRevenue = registrations
    .filter(r => r.paymentStatus === 'completed' && r.accommodationNeeded)
    .reduce((total, r) => {
      const rates = { standard: 100, premium: 200, luxury: 350 };
      return total + (rates[r.accommodationType as keyof typeof rates] || 0);
    }, 0);
  
  const goodwillRevenue = registrations
    .filter(r => r.paymentStatus === 'completed' && r.goodwillAmount)
    .reduce((total, r) => total + (r.goodwillAmount || 0), 0);
  
  const donationRevenue = donations.reduce((total, d) => total + d.amount, 0);
  
  return {
    totalRevenue,
    registrationRevenue,
    dinnerRevenue,
    accommodationRevenue,
    goodwillRevenue,
    donationRevenue,
  };
}