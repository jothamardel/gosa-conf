import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DinnerPayment from '@/components/forms/dinner';
import { toast } from 'sonner';

// Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: '',
  },
  writable: true,
});

describe('DinnerPayment Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  it('should render dinner payment form', () => {
    render(<DinnerPayment />);
    
    expect(screen.getByText('Welcome Dinner')).toBeInTheDocument();
    expect(screen.getByText('Reserve Your Seat')).toBeInTheDocument();
    expect(screen.getByText('$75')).toBeInTheDocument();
    expect(screen.getByText('per person')).toBeInTheDocument();
  });

  it('should show form fields when dinner ticket is selected', async () => {
    const user = userEvent.setup();
    render(<DinnerPayment />);
    
    const checkbox = screen.getByRole('checkbox', { name: /reserve your seat/i });
    await user.click(checkbox);
    
    await waitFor(() => {
      expect(screen.getByText('Number of Guests')).toBeInTheDocument();
      expect(screen.getByText('Guest Details')).toBeInTheDocument();
      expect(screen.getByText('Special Requests')).toBeInTheDocument();
    });
  });

  it('should calculate total amount correctly', async () => {
    const user = userEvent.setup();
    render(<DinnerPayment />);
    
    const checkbox = screen.getByRole('checkbox', { name: /reserve your seat/i });
    await user.click(checkbox);
    
    // Increase guest count to 3
    const plusButton = screen.getByRole('button', { name: /\+/ });
    await user.click(plusButton);
    await user.click(plusButton);
    
    await waitFor(() => {
      expect(screen.getByText('$225')).toBeInTheDocument(); // 3 guests × $75
      expect(screen.getByText('3 guests × $75')).toBeInTheDocument();
    });
  });

  it('should add and remove guest details based on guest count', async () => {
    const user = userEvent.setup();
    render(<DinnerPayment />);
    
    const checkbox = screen.getByRole('checkbox', { name: /reserve your seat/i });
    await user.click(checkbox);
    
    // Initially should have 1 guest (primary)
    expect(screen.getByText('Primary Guest (You)')).toBeInTheDocument();
    
    // Add a guest
    const plusButton = screen.getByRole('button', { name: /\+/ });
    await user.click(plusButton);
    
    await waitFor(() => {
      expect(screen.getByText('Guest 2')).toBeInTheDocument();
    });
    
    // Remove a guest
    const minusButton = screen.getByRole('button', { name: /\-/ });
    await user.click(minusButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Guest 2')).not.toBeInTheDocument();
    });
  });

  it('should validate required fields', async () => {
    const user = userEvent.setup();
    render(<DinnerPayment />);
    
    const checkbox = screen.getByRole('checkbox', { name: /reserve your seat/i });
    await user.click(checkbox);
    
    // Clear the primary guest name (which should be disabled but let's test validation)
    const guestNameInputs = screen.getAllByPlaceholderText('Enter full name');
    
    // Add a second guest and leave name empty
    const plusButton = screen.getByRole('button', { name: /\+/ });
    await user.click(plusButton);
    
    // Try to submit without agreeing to terms
    const submitButton = screen.getByRole('button', { name: /confirm reservation/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('You must agree to the terms')).toBeInTheDocument();
    });
  });

  it('should submit form successfully', async () => {
    const user = userEvent.setup();
    
    const mockResponse = {
      success: true,
      data: {
        paymentLink: 'https://checkout.paystack.com/test',
        paymentReference: 'DINNER_123_+1234567890',
        totalAmount: 75
      }
    };
    
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });
    
    render(<DinnerPayment />);
    
    // Select dinner ticket
    const checkbox = screen.getByRole('checkbox', { name: /reserve your seat/i });
    await user.click(checkbox);
    
    // Agree to terms
    const termsCheckbox = screen.getByRole('checkbox', { name: /agree to the dinner reservation terms/i });
    await user.click(termsCheckbox);
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /confirm reservation/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/v1/dinner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'john.doe@example.com',
          fullName: 'John Doe',
          phoneNumber: '+1234567890',
          numberOfGuests: 1,
          guestDetails: [
            {
              name: 'John Doe',
              email: 'john.doe@example.com',
              phone: '+1234567890'
            }
          ],
          specialRequests: ''
        }),
      });
    });
    
    expect(window.location.href).toBe('https://checkout.paystack.com/test');
  });

  it('should handle API errors', async () => {
    const user = userEvent.setup();
    
    const mockErrorResponse = {
      success: false,
      error: 'Invalid guest details'
    };
    
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => mockErrorResponse,
    });
    
    render(<DinnerPayment />);
    
    // Select dinner ticket and agree to terms
    const checkbox = screen.getByRole('checkbox', { name: /reserve your seat/i });
    await user.click(checkbox);
    
    const termsCheckbox = screen.getByRole('checkbox', { name: /agree to the dinner reservation terms/i });
    await user.click(termsCheckbox);
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /confirm reservation/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Invalid guest details');
    });
  });

  it('should handle network errors', async () => {
    const user = userEvent.setup();
    
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    
    render(<DinnerPayment />);
    
    // Select dinner ticket and agree to terms
    const checkbox = screen.getByRole('checkbox', { name: /reserve your seat/i });
    await user.click(checkbox);
    
    const termsCheckbox = screen.getByRole('checkbox', { name: /agree to the dinner reservation terms/i });
    await user.click(termsCheckbox);
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /confirm reservation/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Payment failed. Please try again.');
    });
  });

  it('should update guest dietary requirements', async () => {
    const user = userEvent.setup();
    render(<DinnerPayment />);
    
    const checkbox = screen.getByRole('checkbox', { name: /reserve your seat/i });
    await user.click(checkbox);
    
    const dietarySelect = screen.getByDisplayValue('No special requirements');
    await user.selectOptions(dietarySelect, 'vegetarian');
    
    expect(screen.getByDisplayValue('Vegetarian')).toBeInTheDocument();
  });

  it('should update special requests', async () => {
    const user = userEvent.setup();
    render(<DinnerPayment />);
    
    const checkbox = screen.getByRole('checkbox', { name: /reserve your seat/i });
    await user.click(checkbox);
    
    const specialRequestsTextarea = screen.getByPlaceholderText(/any special requests/i);
    await user.type(specialRequestsTextarea, 'Window seat preferred');
    
    expect(specialRequestsTextarea).toHaveValue('Window seat preferred');
  });

  it('should disable submit button when form is invalid', async () => {
    const user = userEvent.setup();
    render(<DinnerPayment />);
    
    // Don't select dinner ticket
    const submitButton = screen.queryByRole('button', { name: /confirm reservation/i });
    expect(submitButton).not.toBeInTheDocument();
    
    // Select dinner ticket but don't agree to terms
    const checkbox = screen.getByRole('checkbox', { name: /reserve your seat/i });
    await user.click(checkbox);
    
    const submitButtonAfterSelection = screen.getByRole('button', { name: /confirm reservation/i });
    expect(submitButtonAfterSelection).toBeDisabled();
  });

  it('should show loading state during submission', async () => {
    const user = userEvent.setup();
    
    // Mock a delayed response
    (fetch as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({
          success: true,
          data: { paymentLink: 'https://test.com' }
        }),
      }), 100))
    );
    
    render(<DinnerPayment />);
    
    const checkbox = screen.getByRole('checkbox', { name: /reserve your seat/i });
    await user.click(checkbox);
    
    const termsCheckbox = screen.getByRole('checkbox', { name: /agree to the dinner reservation terms/i });
    await user.click(termsCheckbox);
    
    const submitButton = screen.getByRole('button', { name: /confirm reservation/i });
    await user.click(submitButton);
    
    // Should show loading state
    expect(screen.getByText('Processing Payment...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });
});