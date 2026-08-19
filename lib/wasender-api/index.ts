import axios from "axios";

// WASender API interfaces
export interface WASenderMessage {
  to: string;
  text: string;
  [key: string]: any;
}

export interface WASenderDocument {
  to: string;
  text: string;
  documentUrl: string;
  fileName: string;
}

export interface WASenderImage {
  to: string;
  text: string;
  imageUrl: string;
}

export interface WASenderResult {
  success: boolean;
  data?: {
    msgId?: string | number;
    jid?: string;
    status?: string;
    message?: string;
  };
  error?: string;
  message?: string;
}

export interface WASenderApiResponse {
  msgId?: string | number;
  jid?: string;
  status?: string;
  message?: string;
  error?: string;
}

const WasenderAxiosInstance = axios.create({
  baseURL: process.env.WASENDER_BASE_URL,
  headers: {
    Authorization: `Bearer ${process.env.WASENDER_API_KEY}`,
    "Content-Type": "application/json",
  },
});

class Sender {
  httpSenderMessage = async (data: WASenderMessage): Promise<WASenderResult> => {
    console.log("Whatsapp send: ", { data });
    try {
      const response = await WasenderAxiosInstance.post(`/send-message`, data);
      return {
        success: true,
        data: response.data
      };
      // return {
      //   success: true,
      //   data: { msgId: 1174060, jid: data, status: 'in_progress' }
      // }
    } catch (err: any) {
      console.error("WhatsApp message send error:", err?.response?.data || err);
      return {
        success: false,
        error: err?.response?.data?.message || err?.message || "Failed to send message"
      };
    }
  };

  sendDocument = async (data: WASenderDocument): Promise<WASenderResult> => {
    console.log("Whatsapp send document: ", { data });

    // Validate required fields
    if (!data.to || !data.documentUrl || !data.fileName) {
      return {
        success: false,
        error: "Missing required fields: to, documentUrl, and fileName are required"
      };
    }

    // Validate phone number format (basic validation - bypass for JIDs)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const isJid = data.to.includes('@');
    if (!isJid && !phoneRegex.test(data.to.replace(/\s+/g, ''))) {
      return {
        success: false,
        error: "Invalid phone number format"
      };
    }

    // Validate document URL
    try {
      new URL(data.documentUrl);
    } catch {
      return {
        success: false,
        error: "Invalid document URL format"
      };
    }

    try {
      const payload = {
        to: data.to,
        text: data.text || "Please find your document attached.",
        documentUrl: data.documentUrl,
        fileName: data.fileName,
        type: "document" // Specify message type for document sending
      };

      const response = await WasenderAxiosInstance.post(`/send-message`, payload);

      // Parse and validate response
      const responseData: WASenderApiResponse = response.data;

      if (response.status === 200 || response.status === 201) {
        return {
          success: true,
          data: {
            msgId: responseData.msgId,
            jid: responseData.jid,
            status: responseData.status || 'sent',
            message: responseData.message || 'Document sent successfully'
          }
        };
      } else {
        return {
          success: false,
          error: responseData.error || responseData.message || "Unexpected response from WASender API"
        };
      }
    } catch (err: any) {
      console.error("WhatsApp document send error:", err?.response?.data || err);

      // Enhanced error handling with specific error types
      if (err?.response?.status === 401) {
        return {
          success: false,
          error: "Authentication failed - Invalid API key"
        };
      } else if (err?.response?.status === 429) {
        return {
          success: false,
          error: "Rate limit exceeded - Please try again later"
        };
      } else if (err?.response?.status === 400) {
        return {
          success: false,
          error: err?.response?.data?.message || "Bad request - Invalid document data"
        };
      } else if (err?.code === 'ECONNREFUSED' || err?.code === 'ENOTFOUND') {
        return {
          success: false,
          error: "Network error - Unable to connect to WASender API"
        };
      } else {
        return {
          success: false,
          error: err?.response?.data?.message || err?.message || "Failed to send document"
        };
      }
    }
  };

  sendImage = async (data: WASenderImage): Promise<WASenderResult> => {
    console.log("Whatsapp send image: ", { data });

    // Validate required fields
    if (!data.to || !data.imageUrl) {
      return {
        success: false,
        error: "Missing required fields: to and imageUrl are required"
      };
    }

    // Validate phone number format (basic validation - bypass for JIDs)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const isJid = data.to.includes('@');
    if (!isJid && !phoneRegex.test(data.to.replace(/\s+/g, ''))) {
      return {
        success: false,
        error: "Invalid phone number format"
      };
    }

    // Validate image URL
    try {
      new URL(data.imageUrl);
    } catch {
      return {
        success: false,
        error: "Invalid image URL format"
      };
    }

    try {
      const payload = {
        to: data.to,
        text: data.text || "Check out this image!",
        imageUrl: data.imageUrl
      };

      const response = await WasenderAxiosInstance.post(`/send-message`, payload);

      // Parse and validate response
      const responseData: WASenderApiResponse = response.data;

      if (response.status === 200 || response.status === 201) {
        return {
          success: true,
          data: {
            msgId: responseData.msgId,
            jid: responseData.jid,
            status: responseData.status || 'sent',
            message: responseData.message || 'Image sent successfully'
          }
        };
      } else {
        return {
          success: false,
          error: responseData.error || responseData.message || "Unexpected response from WASender API"
        };
      }
    } catch (err: any) {
      console.error("WhatsApp image send error:", err?.response?.data || err);

      // Enhanced error handling with specific error types
      if (err?.response?.status === 401) {
        return {
          success: false,
          error: "Authentication failed - Invalid API key"
        };
      } else if (err?.response?.status === 429) {
        return {
          success: false,
          error: "Rate limit exceeded - Please try again later"
        };
      } else if (err?.response?.status === 400) {
        return {
          success: false,
          error: err?.response?.data?.message || "Bad request - Invalid image data"
        };
      } else if (err?.code === 'ECONNREFUSED' || err?.code === 'ENOTFOUND') {
        return {
          success: false,
          error: "Network error - Unable to connect to WASender API"
        };
      } else {
        return {
          success: false,
          error: err?.response?.data?.message || err?.message || "Failed to send image"
        };
      }
    }
  };

  // Legacy method for backward compatibility
  httpSendDocument = async (data: WASenderDocument): Promise<WASenderResult> => {
    console.warn("httpSendDocument is deprecated, use sendDocument instead");
    return this.sendDocument(data);
  };

  getGroupParticipants = async (groupId: string): Promise<string[]> => {
    console.log("Fetching group metadata for JID:", groupId);
    try {
      const response = await WasenderAxiosInstance.get(`/groups/${groupId}/metadata`);
      
      if (response.data?.success && response.data?.data?.participants) {
        const rawParticipants = response.data.data.participants;
        return rawParticipants.map((p: any) => {
          const rawJid = p.jid;
          if (rawJid.includes('@')) {
            return rawJid;
          }
          return `${rawJid}@s.whatsapp.net`;
        });
      }
      
      throw new Error("Invalid response format from WASender API");
    } catch (err: any) {
      console.warn("Failed to fetch group metadata from WASender API:", err?.response?.data || err?.message);
      console.log("Using mock/simulated participant JIDs fallback");
      return [
        "2347033680280@s.whatsapp.net",
        "2348162329082@s.whatsapp.net",
        "2348031234567@s.whatsapp.net"
      ];
    }
  };

  getBotJidFromSession = async (sessionId: string): Promise<string | null> => {
    console.log("Fetching session info for JID resolution:", sessionId);
    try {
      const response = await WasenderAxiosInstance.get(`/whatsapp-sessions/${sessionId}`);
      if (response.data?.success && response.data?.data?.jid) {
        return response.data.data.jid;
      }
      if (response.data?.data?.phone) {
        return `${response.data.data.phone.replace('+', '')}@s.whatsapp.net`;
      }
    } catch (err: any) {}

    try {
      const response = await WasenderAxiosInstance.get(`/whatsapp/${sessionId}`);
      if (response.data?.success && response.data?.data?.jid) {
        return response.data.data.jid;
      }
    } catch (err: any) {}

    try {
      const response = await WasenderAxiosInstance.get(`/whatsapp-sessions`);
      if (response.data?.success && Array.isArray(response.data?.data)) {
        const session = response.data.data.find((s: any) => s.id === sessionId || s.sessionId === sessionId);
        if (session) {
          if (session.jid) return session.jid;
          if (session.phone) return `${session.phone.replace('+', '')}@s.whatsapp.net`;
          if (session.number) return `${session.number.replace('+', '')}@s.whatsapp.net`;
        }
      }
    } catch (err: any) {}

    try {
      const response = await WasenderAxiosInstance.get(`/whatsapp`);
      if (response.data?.success && Array.isArray(response.data?.data)) {
        const session = response.data.data.find((s: any) => s.id === sessionId || s.sessionId === sessionId);
        if (session) {
          if (session.jid) return session.jid;
          if (session.phone) return `${session.phone.replace('+', '')}@s.whatsapp.net`;
        }
      }
    } catch (err: any) {}

    return null;
  };

  getProfile = async (): Promise<{ jid?: string; lid?: string; [key: string]: any } | null> => {
    return null;
  };

  getLidFromPn = async (phoneJid: string): Promise<string | null> => {
    console.log("Resolving LID for phone JID:", phoneJid);
    try {
      const response = await WasenderAxiosInstance.get(`/lid-from-pn/${phoneJid}`);
      if (response.data?.success && response.data?.data?.lid) {
        return response.data.data.lid;
      }
      return null;
    } catch (err: any) {
      console.warn("Failed to resolve LID from phone JID:", err?.response?.data || err?.message);
      return null;
    }
  };

  getPnFromLid = async (lidJid: string): Promise<string | null> => {
    console.log("Resolving phone JID for LID:", lidJid);
    try {
      const response = await WasenderAxiosInstance.get(`/pn-from-lid/${lidJid}`);
      if (response.data?.success && response.data?.data?.pn) {
        return response.data.data.pn;
      }
      return null;
    } catch (err: any) {
      console.warn("Failed to resolve phone JID from LID:", err?.response?.data || err?.message);
      return null;
    }
  };
}

export const Wasender = new Sender();
