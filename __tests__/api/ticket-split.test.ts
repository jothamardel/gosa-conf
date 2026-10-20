import { NextRequest } from "next/server";
import { POST } from "@/app/api/v1/ticket/split/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ConventionRegistration } from "@/lib/schema/convention.schema";
import { DinnerReservation } from "@/lib/schema/dinner.schema";
import { Transaction } from "@/lib/schema/transaction.schema";
import { User } from "@/lib/schema/user.schema";
import { UserUtils } from "@/lib/utils/user.utils";
import { Wasender } from "@/lib/wasender-api";

// Mock dependencies
jest.mock("@/lib/mongodb", () => ({
  connectToDatabase: jest.fn().mockResolvedValue(true),
}));

jest.mock("@/lib/wasender-api", () => ({
  Wasender: {
    httpSenderMessage: jest.fn().mockResolvedValue({ success: true }),
  },
}));

jest.mock("@/lib/utils/user.utils", () => ({
  UserUtils: {
    findOrCreateUser: jest.fn(),
  },
}));

jest.mock("@/lib/schema/convention.schema", () => ({
  ConventionRegistration: {
    findById: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock("@/lib/schema/dinner.schema", () => ({
  DinnerReservation: {
    findById: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock("@/lib/schema/transaction.schema", () => ({
  Transaction: {
    findOne: jest.fn(),
  },
}));

jest.mock("@/lib/schema/user.schema", () => ({
  User: {
    findById: jest.fn(),
  },
}));

describe("POST /api/v1/ticket/split", () => {
  const createRequest = (body: any) => {
    return new NextRequest("http://localhost:3000/api/v1/ticket/split", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Validation Checks", () => {
    it("should return 400 when ticketId is missing", async () => {
      const req = createRequest({
        newOwner: { fullName: "Nansel Danboyi", phoneNumber: "08083501484" },
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toMatch(/Ticket ID is required/i);
    });

    it("should return 400 when new owner full name is missing", async () => {
      const req = createRequest({
        ticketId: "654321098765432109876543",
        newOwner: { fullName: "", phoneNumber: "08083501484" },
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toMatch(/Full Name and Phone Number are required/i);
    });

    it("should return 400 when new owner phone number is missing", async () => {
      const req = createRequest({
        ticketId: "654321098765432109876543",
        newOwner: { fullName: "Nansel Danboyi", phoneNumber: "" },
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toMatch(/Full Name and Phone Number are required/i);
    });
  });

  describe("Convention Registration Splitting", () => {
    const parentTicketId = "507f1f77bcf86cd799439011";
    const parentUserId = "507f191e810c19729de860ea";
    const newUserId = "507f191e810c19729de860eb";
    const newTicketId = "507f1f77bcf86cd799439099";

    it("should reject splitting if convention ticket only has 1 pass", async () => {
      (ConventionRegistration.findById as jest.Mock).mockResolvedValue({
        _id: parentTicketId,
        quantity: 1,
        amount: 25000,
        checkedIn: false,
      });

      const req = createRequest({
        ticketId: parentTicketId,
        serviceCategory: "convention",
        newOwner: { fullName: "Nansel Danboyi", phoneNumber: "08083501484" },
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toMatch(/only has 1 pass and cannot be divided further/i);
    });

    it("should reject splitting if ticket is already checked in at event", async () => {
      (ConventionRegistration.findById as jest.Mock).mockResolvedValue({
        _id: parentTicketId,
        quantity: 3,
        amount: 75000,
        checkedIn: true,
      });

      const req = createRequest({
        ticketId: parentTicketId,
        serviceCategory: "convention",
        newOwner: { fullName: "Nansel Danboyi", phoneNumber: "08083501484" },
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toMatch(/already been checked in/i);
    });

    it("should successfully split 1 pass from multi-pass convention registration and send WhatsApp notification", async () => {
      const mockParent = {
        _id: parentTicketId,
        userId: parentUserId,
        paymentReference: "PAY_GOSA_CONV_12345",
        quantity: 3,
        amount: 75000,
        checkedIn: false,
        persons: [
          { name: "Original Buyer", phone: "08011111111" },
          { name: "Delegate Two", phone: "08022222222" },
          { name: "Delegate Three", phone: "08083501484" },
        ],
      };

      (ConventionRegistration.findById as jest.Mock).mockResolvedValue(mockParent);
      (ConventionRegistration.findByIdAndUpdate as jest.Mock).mockResolvedValue(true);
      (UserUtils.findOrCreateUser as jest.Mock).mockResolvedValue({
        _id: newUserId,
        fullName: "Nansel Danboyi",
        phoneNumber: "08083501484",
      });
      (User.findById as jest.Mock).mockResolvedValue({
        _id: parentUserId,
        fullName: "Original Buyer",
      });
      (ConventionRegistration.create as jest.Mock).mockResolvedValue({
        _id: newTicketId,
        paymentReference: "PAY_GOSA_CONV_12345_split_123",
        quantity: 1,
        amount: 25000,
      });

      const req = createRequest({
        ticketId: parentTicketId,
        serviceCategory: "convention",
        newOwner: {
          fullName: "Nansel Danboyi",
          phoneNumber: "08083501484",
          email: "nansel@example.com",
          year: "1998",
        },
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.newTicketId).toBe(newTicketId);
      expect(data.data.remainingQuantity).toBe(2);
      expect(data.data.newTicketPassUrl).toContain(`/ticket?id=${newTicketId}`);

      // Verify parent was updated: quantity decremented to 2, amount decremented by 25000
      expect(ConventionRegistration.findByIdAndUpdate).toHaveBeenCalledWith(
        parentTicketId,
        expect.objectContaining({
          $set: expect.objectContaining({
            quantity: 2,
            amount: 50000,
          }),
        })
      );

      // Verify new ticket record was created with quantity 1
      expect(ConventionRegistration.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: newUserId,
          quantity: 1,
          amount: 25000,
          status: "confirmed",
          persons: [
            {
              name: "Nansel Danboyi",
              phone: "08083501484",
              email: "nansel@example.com",
            },
          ],
        })
      );

      // Verify WhatsApp automated notification was triggered
      expect(Wasender.httpSenderMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "2348083501484@s.whatsapp.net",
          text: expect.stringContaining("GOSA 2026 Annual National Convention Registration Ticket"),
        })
      );
    });
  });

  describe("Dinner Reservation Splitting", () => {
    const parentDinnerId = "507f1f77bcf86cd799439022";
    const newDinnerTicketId = "507f1f77bcf86cd799439088";
    const newUserId = "507f191e810c19729de860ec";

    it("should reject splitting if dinner reservation only has 1 guest", async () => {
      (DinnerReservation.findById as jest.Mock).mockResolvedValue({
        _id: parentDinnerId,
        numberOfGuests: 1,
        totalAmount: 15000,
        checkedIn: false,
      });

      const req = createRequest({
        ticketId: parentDinnerId,
        serviceCategory: "dinner",
        newOwner: { fullName: "Sarah Bulus", phoneNumber: "08099998877" },
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toMatch(/only has 1 guest pass and cannot be divided further/i);
    });

    it("should successfully split 1 pass from multi-guest dinner reservation", async () => {
      const mockDinner = {
        _id: parentDinnerId,
        userId: "507f191e810c19729de860ea",
        paymentReference: "PAY_GOSA_DINNER_99999",
        numberOfGuests: 2,
        totalAmount: 30000,
        checkedIn: false,
        guestDetails: [
          { name: "Host", phone: "08011111111" },
          { name: "Guest", phone: "08099998877" },
        ],
      };

      (DinnerReservation.findById as jest.Mock).mockResolvedValue(mockDinner);
      (DinnerReservation.findByIdAndUpdate as jest.Mock).mockResolvedValue(true);
      (UserUtils.findOrCreateUser as jest.Mock).mockResolvedValue({
        _id: newUserId,
        fullName: "Sarah Bulus",
        phoneNumber: "08099998877",
      });
      (User.findById as jest.Mock).mockResolvedValue({
        _id: "507f191e810c19729de860ea",
        fullName: "Host Alumnus",
      });
      (DinnerReservation.create as jest.Mock).mockResolvedValue({
        _id: newDinnerTicketId,
        paymentReference: "PAY_GOSA_DINNER_99999_split_123",
        numberOfGuests: 1,
        totalAmount: 15000,
      });

      const req = createRequest({
        ticketId: parentDinnerId,
        serviceCategory: "dinner",
        newOwner: {
          fullName: "Sarah Bulus",
          phoneNumber: "08099998877",
        },
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.newTicketId).toBe(newDinnerTicketId);
      expect(data.data.remainingQuantity).toBe(1);

      // Verify parent dinner reservation updated to 1 guest and half amount
      expect(DinnerReservation.findByIdAndUpdate).toHaveBeenCalledWith(
        parentDinnerId,
        expect.objectContaining({
          $set: expect.objectContaining({
            numberOfGuests: 1,
            totalAmount: 15000,
          }),
        })
      );

      // Verify WhatsApp automated notification was triggered
      expect(Wasender.httpSenderMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "2348099998877@s.whatsapp.net",
          text: expect.stringContaining("GOSA 2026 Convention Dinner Pass"),
        })
      );
    });
  });

  describe("Ticket Not Found", () => {
    it("should return 404 when ticket ID does not match any record", async () => {
      (ConventionRegistration.findById as jest.Mock).mockResolvedValue(null);
      (ConventionRegistration.findOne as jest.Mock).mockResolvedValue(null);
      (DinnerReservation.findById as jest.Mock).mockResolvedValue(null);
      (DinnerReservation.findOne as jest.Mock).mockResolvedValue(null);
      (Transaction.findOne as jest.Mock).mockResolvedValue(null);

      const req = createRequest({
        ticketId: "507f1f77bcf86cd799439000",
        newOwner: { fullName: "Unknown Person", phoneNumber: "08012345678" },
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.message).toMatch(/No dividable ticket or reservation could be matched/i);
    });
  });
});
