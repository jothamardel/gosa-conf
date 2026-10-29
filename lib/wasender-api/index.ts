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

// Primary WhatsApp Gateway: Agent-Service running Evolution API backend
const AGENT_GATEWAY_URL = (
  process.env.AGENT_SERVICE_URL ||
  process.env.AGENT_API_URL ||
  process.env.WA_GATEWAY_URL ||
  process.env.WHATSAPP_GATEWAY_URL ||
  "https://gosa-agent-production.up.railway.app"
).replace(/\/+$/, "");

const AgentGatewayAxios = axios.create({
  baseURL: AGENT_GATEWAY_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 45000,
});

const WasenderAxiosInstance = axios.create({
  baseURL: process.env.WASENDER_BASE_URL || "https://wasenderapi.com/api",
  headers: {
    Authorization: `Bearer ${process.env.WASENDER_API_KEY}`,
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

class Sender {
  httpSenderMessage = async (data: WASenderMessage): Promise<WASenderResult> => {
    console.log("WhatsApp send (Evolution API via Agent-Service):", { data });

    // 1. Primary Route: Evolution API via Agent-Service
    try {
      const response = await AgentGatewayAxios.post(`/api/v1/whatsapp/send-message`, data);
      if (response.data && response.data.success !== false) {
        return {
          success: true,
          data: response.data?.data || response.data,
        };
      }
      throw new Error(response.data?.error || "Agent-service returned unsuccessful response");
    } catch (gatewayErr: any) {
      console.warn(
        "Evolution API Gateway send warning:",
        gatewayErr?.response?.data || gatewayErr?.message
      );

      // 2. Fallback to WASender only if WASENDER_API_KEY is configured
      if (process.env.WASENDER_API_KEY) {
        try {
          const fallbackResponse = await WasenderAxiosInstance.post(`/send-message`, data);
          return {
            success: true,
            data: fallbackResponse.data,
          };
        } catch (wasenderErr: any) {
          console.error("WASender fallback also failed:", wasenderErr?.response?.data || wasenderErr?.message);
        }
      }

      return {
        success: false,
        error:
          gatewayErr?.response?.data?.error ||
          gatewayErr?.response?.data?.message ||
          gatewayErr?.message ||
          "Failed to send message via Evolution API",
      };
    }
  };

  sendDocument = async (data: WASenderDocument): Promise<WASenderResult> => {
    console.log("WhatsApp send document (Evolution API via Agent-Service):", { data });

    // Validate required fields
    if (!data.to || !data.documentUrl || !data.fileName) {
      return {
        success: false,
        error: "Missing required fields: to, documentUrl, and fileName are required",
      };
    }

    // Validate phone number format (basic validation - bypass for JIDs)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const isJid = data.to.includes('@');
    if (!isJid && !phoneRegex.test(data.to.replace(/\s+/g, ''))) {
      return {
        success: false,
        error: "Invalid phone number format",
      };
    }

    // Validate document URL
    try {
      new URL(data.documentUrl);
    } catch {
      return {
        success: false,
        error: "Invalid document URL format",
      };
    }

    const payload = {
      to: data.to,
      text: data.text || "Please find your document attached.",
      documentUrl: data.documentUrl,
      fileName: data.fileName,
      type: "document",
    };

    // 1. Primary Route: Evolution API via Agent-Service
    try {
      const response = await AgentGatewayAxios.post(`/api/v1/whatsapp/send-message`, payload);
      if (response.data && response.data.success !== false) {
        return {
          success: true,
          data: response.data?.data || response.data,
        };
      }
      throw new Error(response.data?.error || "Agent-service returned unsuccessful response");
    } catch (gatewayErr: any) {
      console.warn("Evolution API Gateway document send warning:", gatewayErr?.response?.data || gatewayErr?.message);

      // 2. Fallback to WASender if configured
      if (process.env.WASENDER_API_KEY) {
        try {
          const fallbackResponse = await WasenderAxiosInstance.post(`/send-message`, payload);
          return {
            success: true,
            data: fallbackResponse.data,
          };
        } catch (wasenderErr: any) {
          console.error("WASender fallback also failed:", wasenderErr?.response?.data || wasenderErr?.message);
        }
      }

      return {
        success: false,
        error:
          gatewayErr?.response?.data?.error ||
          gatewayErr?.response?.data?.message ||
          gatewayErr?.message ||
          "Failed to send document via Evolution API",
      };
    }
  };

  sendImage = async (data: WASenderImage): Promise<WASenderResult> => {
    console.log("WhatsApp send image (Evolution API via Agent-Service):", { data });

    // Validate required fields
    if (!data.to || !data.imageUrl) {
      return {
        success: false,
        error: "Missing required fields: to and imageUrl are required",
      };
    }

    // Validate phone number format (basic validation - bypass for JIDs)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const isJid = data.to.includes('@');
    if (!isJid && !phoneRegex.test(data.to.replace(/\s+/g, ''))) {
      return {
        success: false,
        error: "Invalid phone number format",
      };
    }

    // Validate image URL
    try {
      new URL(data.imageUrl);
    } catch {
      return {
        success: false,
        error: "Invalid image URL format",
      };
    }

    const payload = {
      to: data.to,
      text: data.text || "Check out this image!",
      imageUrl: data.imageUrl,
      type: "image",
    };

    // 1. Primary Route: Evolution API via Agent-Service
    try {
      const response = await AgentGatewayAxios.post(`/api/v1/whatsapp/send-message`, payload);
      if (response.data && response.data.success !== false) {
        return {
          success: true,
          data: response.data?.data || response.data,
        };
      }
      throw new Error(response.data?.error || "Agent-service returned unsuccessful response");
    } catch (gatewayErr: any) {
      console.warn("Evolution API Gateway image send warning:", gatewayErr?.response?.data || gatewayErr?.message);

      // 2. Fallback to WASender if configured
      if (process.env.WASENDER_API_KEY) {
        try {
          const fallbackResponse = await WasenderAxiosInstance.post(`/send-message`, payload);
          return {
            success: true,
            data: fallbackResponse.data,
          };
        } catch (wasenderErr: any) {
          console.error("WASender fallback also failed:", wasenderErr?.response?.data || wasenderErr?.message);
        }
      }

      return {
        success: false,
        error:
          gatewayErr?.response?.data?.error ||
          gatewayErr?.response?.data?.message ||
          gatewayErr?.message ||
          "Failed to send image via Evolution API",
      };
    }
  };

  // Legacy method for backward compatibility
  httpSendDocument = async (data: WASenderDocument): Promise<WASenderResult> => {
    console.warn("httpSendDocument is deprecated, use sendDocument instead");
    return this.sendDocument(data);
  };

  getGroupParticipants = async (groupId: string): Promise<string[]> => {
    console.log("Fetching group metadata for JID via Evolution Gateway:", groupId);
    try {
      const response = await AgentGatewayAxios.get(`/api/v1/whatsapp/groups/${groupId}/metadata`);
      const data = response.data?.data || response.data;
      if (data?.participants && Array.isArray(data.participants)) {
        return data.participants.map((p: any) => {
          const rawJid = typeof p === 'string' ? p : p.id || p.jid;
          return rawJid.includes('@') ? rawJid : `${rawJid}@s.whatsapp.net`;
        });
      }
    } catch (err: any) {
      console.warn("Gateway group metadata warning, checking fallback:", err?.response?.data || err?.message);
    }

    try {
      const response = await WasenderAxiosInstance.get(`/groups/${groupId}/metadata`);
      if (response.data?.success && response.data?.data?.participants) {
        const rawParticipants = response.data.data.participants;
        return rawParticipants.map((p: any) => {
          const rawJid = p.jid;
          return rawJid.includes('@') ? rawJid : `${rawJid}@s.whatsapp.net`;
        });
      }
      throw new Error("Invalid response format from WASender API");
    } catch (err: any) {
      console.warn("Failed to fetch group metadata from WASender API:", err?.response?.data || err?.message);
      return [];
    }
  };

  getGroups = async (): Promise<any[]> => {
    console.log("Fetching all WhatsApp groups via Evolution Gateway");
    try {
      const response = await AgentGatewayAxios.get('/api/v1/whatsapp/groups');
      if (response.data?.success && Array.isArray(response.data?.data)) {
        return response.data.data;
      }
    } catch (err: any) {
      console.warn("Agent-service groups fetch warning:", err?.response?.data || err?.message);
    }

    try {
      const response = await WasenderAxiosInstance.get('/groups');
      if (response.data?.success && Array.isArray(response.data?.data)) {
        return response.data.data;
      }
      return [];
    } catch (err: any) {
      console.warn("WASender groups fallback warning:", err?.response?.data || err?.message);
      return [];
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
