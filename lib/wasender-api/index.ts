import axios from "axios";

const WasenderAxiosInstance = axios.create({
  baseURL: process.env.WASENDER_BASE_URL,
  headers: {
    Authorization: `Bearer ${process.env.WASENDER_API_KEY}`,
    "Content-Type": "application/json",
  },
});

class Sender {
  httpSenderMessage = async (data: any) => {
    console.log("Whatsapp send: ", { data });
    try {
      const response = await WasenderAxiosInstance.post(`/send-message`, data);
      return response.data;
      // return {
      //   success: true,
      //   data: { msgId: 1174060, jid: data, status: 'in_progress' }
      // }
    } catch (err: any) {
      throw err?.response?.data;
    }
  };
}

export const Wasender = new Sender();
