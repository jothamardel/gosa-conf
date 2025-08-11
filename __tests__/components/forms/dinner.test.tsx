import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DinnerForm from '@/components/forms/dinner';

// Mock fetch
global.fetch = jest.fn();

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

describe('DinnerForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('should render dinner form with all required fields', () => {
    render(<DinnerForm />);

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/number of guests/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /book dinner tickets/i })).toBeInTheDocument();
  });

  it('should show guest details form when number of guests is selected', async () => {
    const user = userEvent.setup();
    render(<DinnerForm />);

    const guestSelect = screen.getByLabelText(/number of guests/i);
    await user.selectOptions(guestSelect, '2');

    await waitFor(() => {
      expect(screen.getByText(/guest 1 details/i)).toBeInTheDocument();
      expect(screen.getByText(/guest 2 details/i)).toBeInTheDocument();
    });
  });

  it('should calculate and display total amount correctly', async () => {
    const user = userEvent.setup();
    render(<DinnerForm />);

    const guestSelect = screen.getByLabelText(/number of guests/i);
    await user.selectOptions(guestSelect, '3');

    await waitFor(() => {
      expect(screen.getByText(/total: \$225/i)).toBeInTheDocument(); // 3 * $75
    });
  });

  it('should validate required fields before submission', async () => {
    const user = userEvent.setup();
    render(<DinnerForm />);

    const submitButton = screen.getByRole('button', { name: /book dinner tickets/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/full name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/phone number is required/i)).toBeInTheDocument();
    });
  });

  it('should validate email format', async () => {
    const user = userEvent.setup();
    render(<DinnerForm />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');

    const submitButton = screen.getByRole('button', { name: /book dinner tickets/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
    });
  });

  it('should validate phone number format', async () => {
    const user = userEvent.setup();
    render(<DinnerForm />);

    const phoneInput = screen.getByLabelText(/phone number/i);
    await user.type(phoneInput, '123');

    const submitButton = screen.getByRole('button', { name: /book dinner tickets/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid phone number/i)).toBeInTheDocument();
    });
  });

  it('should validate guest details when provided', async () => {
    const user = userEvent.setup();
    render(<DinnerForm />);

    // Fill basic form
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/phone number/i), '08012345678');
    
    // Select 2 guests
    const guestSelect = screen.getByLabelText(/number of guests/i);
    await user.selectOptions(guestSelect, '2');

    await waitFor(() => {
      expect(screen.getByText(/guest 1 details/i)).toBeInTheDocument();
    });

    // Leave guest name empty and submit
    const submitButton = screen.getByRole('button', { name: /book dinner tickets/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/guest name is required/i)).toBeInTheDocument();
    });
  });

  it('should submit form successfully with valid data', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      success: true,
      data: {
        paymentLink: 'https://checkout.paystack.com/xyz',
        totalAmount: 150
      }
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    // Mock window.location.href assignment
    delete (window as any).location;
    (window as any).location = { href: '' };

    render(<DinnerForm />);

    // Fill form with valid data
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/phone number/i), '08012345678');
    
    const guestSelect = screen.getByLabelText(/number of guests/i);
    await user.selectOptions(guestSelect, '2');

    await waitFor(() => {
      expect(screen.getByText(/guest 1 details/i)).toBeInTheDocument();
    });

    // Fill guest details
    const guestNameInputs = screen.getAllByLabelText(/guest name/i);
    await user.type(guestNameInputs[0], 'John Doe');
    await user.type(guestNameInputs[1], 'Jane Doe');

    const submitButton = screen.getByRole('button', { name: /book dinner tickets/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/dinner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'john@example.com',
          fullName: 'John Doe',
          phoneNumber: '08012345678',
          numberOfGuests: 2,
          guestDetails: [
            { name: 'John Doe', email: '', dietaryRequirements: '' },
            { name: 'Jane Doe', email: '', dietaryRequirements: '' }
          ],
          specialRequests: ''
        })
      });
    });

    // Should redirect to payment link
    expect(window.location.href).toBe('https://checkout.paystack.com/xyz');
  });

  it('should handle API errors gracefully', async () => {
    const user = userEvent.setup();
    const mockErrorResponse = {
      success: false,
      message: 'Payment initialization failed'
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => mockErrorResponse
    });

    render(<DinnerForm />);

    // Fill form with valid data
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/phone number/i), '08012345678');
    
    const guestSelect = screen.getByLabelText(/number of guests/i);
    await user.selectOptions(guestSelect, '1');

    await waitFor(() => {
      const guestNameInput = screen.getByLabelText(/guest name/i);
      user.type(guestNameInput, 'John Doe');
    });

    const submitButton = screen.getByRole('button', { name: /book dinner tickets/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/payment initialization failed/i)).toBeInTheDocument();
    });
  });

  it('should handle network errors', async () => {
    const user = userEvent.setup();

    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<DinnerForm />);

    // Fill form with minimal valid data
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/phone number/i), '08012345678');
    
    const guestSelect = screen.getByLabelText(/number of guests/i);
    await user.selectOptions(guestSelect, '1');

    await waitFor(() => {
      const guestNameInput = screen.getByLabelText(/guest name/i);
      user.type(guestNameInput, 'John Doe');
    });

    const submitButton = screen.getByRole('button', { name: /book dinner tickets/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  it('should show loading state during submission', async () => {
    const user = userEvent.setup();

    // Mock a delayed response
    (global.fetch as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true, data: { paymentLink: 'test' } })
      }), 100))
    );

    render(<DinnerForm />);

    // Fill form with minimal valid data
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/phone number/i), '08012345678');
    
    const guestSelect = screen.getByLabelText(/number of guests/i);
    await user.selectOptions(guestSelect, '1');

    await waitFor(() => {
      const guestNameInput = screen.getByLabelText(/guest name/i);
      user.type(guestNameInput, 'John Doe');
    });

    const submitButton = screen.getByRole('button', { name: /book dinner tickets/i });
    await user.click(submitButton);

    // Should show loading state
    expect(screen.getByText(/processing/i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('should allow adding dietary requirements and special requests', async () => {
    const user = userEvent.setup();
    render(<DinnerForm />);

    const guestSelect = screen.getByLabelText(/number of guests/i);
    await user.selectOptions(guestSelect, '1');

    await waitFor(() => {
      expect(screen.getByLabelText(/dietary requirements/i)).toBeInTheDocument();
    });

    const dietaryInput = screen.getByLabelText(/dietary requirements/i);
    await user.type(dietaryInput, 'Vegetarian');

    const specialRequestsInput = screen.getByLabelText(/special requests/i);
    await user.type(specialRequestsInput, 'Table near the window');

    expect(dietaryInput).toHaveValue('Vegetarian');
    expect(specialRequestsInput).toHaveValue('Table near the window');
  });
});