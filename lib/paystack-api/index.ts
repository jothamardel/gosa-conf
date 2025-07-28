import axios from "axios";

const PaystackAxiosInstance = axios.create({
  baseURL: process.env.PAYSTACK_BASE_URL,
  headers: {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
});
// /transaction/initialize

class PaystackPayment {
  httpInitializePayment = async (data: any) => {
    try {
      const response = await PaystackAxiosInstance.post(
        "/transaction/initialize",
        { ...data, amount: data?.amount * 100 },
      );
      return response?.data;
    } catch (err: any) {
      throw err?.response?.data;
    }
  };
}

export const Payment = new PaystackPayment();
