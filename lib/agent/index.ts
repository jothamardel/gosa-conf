import OpenAI from "openai";

export interface AgentResponse {
  intent: 'buy_tickets' | 'buy_product' | 'donation' | 'view_history' | 'general_query' | 'checkout_cart' | 'list_groups' | 'send_group_message' | 'send_broadcast_message';
  data: {
    ticketType?: 'convention' | 'dinner';
    productType?: 'uniform' | 'emblem' | 'magazine' | 'brochure';
    quantity?: number;
    targets?: string[];
    amount?: number; // only for donation
    email?: string | null;
    items?: Array<{
      type: 'convention' | 'dinner' | 'brochure' | 'uniform' | 'emblem' | 'magazine' | 'donation';
      quantity: number;
      amount?: number;
      targets?: string[];
    }>;
    targetGroupId?: string;
    messageText?: string;
  };
  response: string;
}

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "buy_tickets",
      description: "Initialize a payment link to purchase GOSA convention or dinner tickets for oneself, specific users, or everyone in the group.",
      parameters: {
        type: "object",
        properties: {
          ticketType: {
            type: "string",
            enum: ["convention", "dinner"],
            description: "The type of ticket to buy."
          },
          quantity: {
            type: "number",
            minimum: 1,
            description: "Number of tickets to purchase. Defaults to 1."
          },
          targets: {
            type: "array",
            items: { type: "string" },
            description: "List of user mentions or names to buy tickets for, e.g. ['@john', '@mary']. Use ['@all'] to buy for everyone."
          }
        },
        required: ["ticketType"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "buy_product",
      description: "Initialize a payment link to buy GOSA merchandise like uniforms, emblems, magazines, or brochures.",
      parameters: {
        type: "object",
        properties: {
          productType: {
            type: "string",
            enum: ["uniform", "emblem", "magazine", "brochure"],
            description: "The product to purchase."
          },
          quantity: {
            type: "number",
            minimum: 1,
            description: "Number of items to purchase."
          }
        },
        required: ["productType", "quantity"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "donation",
      description: "Initialize a payment link for custom donations for oneself, other members, or the group.",
      parameters: {
        type: "object",
        properties: {
          amount: {
            type: "number",
            minimum: 5,
            description: "The amount to donate in Naira."
          },
          targets: {
            type: "array",
            items: { type: "string" },
            description: "List of user mentions or names to make the donation on behalf of, e.g. ['@john', '@mary']. Use ['@all'] for the group."
          }
        },
        required: ["amount"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "view_history",
      description: "Display transaction history and payment summaries for the user.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "checkout_cart",
      description: "Initialize a single Paystack checkout link for a combined cart of tickets, shop products, and/or donations for one or more people.",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            description: "The list of items in the cart.",
            items: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: ["convention", "dinner", "brochure", "uniform", "emblem", "magazine", "donation"],
                  description: "The type of service or product."
                },
                quantity: {
                  type: "integer",
                  description: "The quantity of this item. Defaults to 1."
                },
                amount: {
                  type: "number",
                  description: "The amount (only required for donation type)."
                },
                targets: {
                  type: "array",
                  description: "The list of member JIDs or names/mentions to purchase this item for.",
                  items: {
                    type: "string"
                  }
                }
              },
              required: ["type"]
            }
          }
        },
        required: ["items"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_groups",
      description: "List all WhatsApp groups the bot is registered in, showing their group names and JIDs.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_group_message",
      description: "Send a message to a specific WhatsApp group or to ALL WhatsApp groups. Requires the target group's JID (groupId) or 'all' to target all active groups, and the message content.",
      parameters: {
        type: "object",
        properties: {
          targetGroupId: {
            type: "string",
            description: "The group JID, e.g. '120363402321564330@g.us'. Pass 'all' if the user wants to send to all groups."
          },
          messageText: {
            type: "string",
            description: "The message text to send."
          }
        },
        required: ["targetGroupId", "messageText"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_broadcast_message",
      description: "Broadcast a direct message individually to each participant in a specific group or ALL active groups. Requires the target group's JID (groupId) or 'all' to target all active groups, and the message content.",
      parameters: {
        type: "object",
        properties: {
          targetGroupId: {
            type: "string",
            description: "The group JID, e.g. '120363402321564330@g.us'. Pass 'all' if the user wants to broadcast to all groups' participants."
          },
          messageText: {
            type: "string",
            description: "The message text to broadcast."
          }
        },
        required: ["targetGroupId", "messageText"]
      }
    }
  }
];

class AgentClass {
  private openAI: OpenAI;
  constructor() {
    this.openAI = new OpenAI();
  }

  async httpSendMessage(message: string, jid?: string, senderName?: string): Promise<AgentResponse> {
    try {
      const mongoose = (await import("mongoose")).default;
      const { ConversationHistory } = await import("../schema");

      const isDbConnected = mongoose.connection.readyState === 1;
      let historyMessages: any[] = [];
      let historyRecord: any = null;

      // Fetch conversation history if JID provided and DB is connected
      if (jid && isDbConnected) {
        try {
          historyRecord = await ConversationHistory.findOne({ jid });
          if (historyRecord) {
            historyMessages = historyRecord.messages || [];
          }
        } catch (dbErr) {
          console.warn("Failed to fetch conversation history:", dbErr);
        }
      }

      // Format history messages to match OpenAI schema: name must only contain a-zA-Z0-9_-
      const formattedHistory = historyMessages.map((m: any) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
        name: m.name ? m.name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64) : undefined,
      }));

      // Sanitize the current sender's name if provided
      const currentSenderName = senderName ? senderName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64) : undefined;

      // Prepare payload messages
      const apiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: `
            # GOSA – Gindiri Old Students Association: gosa bilkwas Assistant Context

            ## Chatbot Identity & Personality
            - **Name**: gosa bilkwas (meaning GOSA Bilkwas)
            - **Role**: Respectful junior boy who graduated from Gindiri schools (Boys Secondary School - BSS / Girls High School - GHS).
            - **Tone**: Extremely polite, respectful, and eager to serve. You should be welcoming and helpful in all your responses.
            - **Motto**: Rooted in GOSA's value of "Light and Truth".
            - Maintain WhatsApp formatting style (use *bold* using single asterisks for key terms, keep messages concise, use emojis).
            - **Proper Spacing**: Always use double newlines (\\n\\n) between paragraphs, instructions, list items, and sections to ensure the message is clean and easy to read. Do not bunch text together.

            ---

            ## About GOSA & Gindiri Schools (Scraped Knowledge Base)
            - **Gindiri Schools**: Located in Gindiri town, Mangu Local Government Area of Plateau State, Nigeria. They form a historic education hub affiliated with the Church of Christ in Nations (COCIN).
            - **Boys' Secondary School (BSS), Gindiri**: Established in 1950 by the Sudan United Mission (SUM) missionaries. Motto is *"For Light and Truth"*.
            - **Girls' High School (GHS), Gindiri**: Established in 1958, serving as the sister institution to BSS.
            - **GOSA Leadership**: The National President of the Gindiri Old Students Association (GOSA) is **Arc. Samuel Nanchang Jatau** (elected at the Jos national convention, GOSA BSS 1982 alumnus, currently Secretary to the Government of Plateau State).
            - **Prominent Alumni**: Includes late **Joseph D. Gomwalk** (first Governor of Benue-Plateau State).
            - **GOSA Mission**: Supporting the development of the "mother schools" by sponsoring laboratory materials, building/hostel renovations, teacher recruitment assistance, and mentoring current students.

            ---

            ## GOSA 2026 Convention Theme
            - **Theme**: "BUILDING BRIDGES, CONNECTING THE PAST WITH THE PRESENT."

            ---

            ## Rates & Prices for GOSA Services
            - **Convention Registration**: ₦1,000
            - **Dinner Ticket**: ₦2,500
            - **Convention Brochure**: ₦2,000
            - **GOSA Uniform**: ₦15,000
            - **Donation**: Any amount!

            ---

            ## Administrative & Broadcasting Commands
            - **List Groups**: The user might ask you to list all the groups. Call the 'list_groups' tool. Only call this when the user explicitly asks to list or show the groups.
            - **Send Message to Group**: The user might ask to send/post a message to a specific group chat or ALL groups. Call the 'send_group_message' tool with 'targetGroupId' (pass 'all' to target all registered groups) and 'messageText'. Do NOT list the groups first when the user asks you to send a message; call 'send_group_message' directly with 'all' as the targetGroupId.
            - **Send Message to Participants**: The user might ask to broadcast/send a direct message individually to each participant of a specific group or ALL groups. Call the 'send_broadcast_message' tool with 'targetGroupId' (pass 'all' to target all registered groups) and 'messageText'. Do NOT list the groups first when the user asks you to broadcast; call 'send_broadcast_message' directly with 'all' as the targetGroupId.

            ---

            ## Teaching Guide & Help Menu Rules
            - When the user asks for help, directions on how to use you, or lists commands (e.g. "help", "how to use you", "menu", "commands"), you MUST reply with a clean, well-spaced, structured guide in your respectful tone.
            - Provide clear, copy-pasteable examples for:
              1. **Convention Tickets:** e.g., \`GOSA buy ticket for myself\` or \`GOSA buy ticket for @John\`
              2. **Dinner Tickets:** e.g., \`GOSA buy Dinner for myself\`
              3. **Donations:** e.g., \`GOSA donate 5000 support BSS hostel renovation\`
              4. **Combined Checkout (Cart):** e.g., \`GOSA checkout: 1 ticket, 1 Dinner ticket\`
              5. **Adding the Bot to Groups:** Politely instruct that to add you to a new group, a group admin simply needs to add the bot's phone number as a participant directly to the group. Once added, you will automatically sync and register the group.
            - If a user's request is ambiguous or fails to match a valid command (e.g. they ask to buy something but omit critical parameters, or you cannot resolve their intent), do NOT just say you didn't understand. Instead, politely point out what is missing and show them the exact correct template/example they can use.

            ---

            ## Response Rules
            - Always maintain the respectful junior boy Gindiri alumnus personality.
            - **CRITICAL**: Never include or expose any raw WhatsApp JIDs, LIDs, or internal database IDs (like 234xxx@s.whatsapp.net, 123xxx@g.us, or @lid) in your response.
            - **CRITICAL**: Never expose, mention, or print any website links or URLs (including "gosanigeria.ng" or "v2.gosanigeria.ng") in your response.
          `,
        },
        ...formattedHistory,
        {
          role: "user",
          content: message,
          name: currentSenderName,
        },
      ];

      const response = await this.openAI.chat.completions.create({
        model: "gpt-4o-mini",
        messages: apiMessages,
        tools,
        max_tokens: 400,
      });

      const messageObj = response.choices[0]?.message;
      const toolCalls = messageObj?.tool_calls;

      let intentVal: 'buy_tickets' | 'buy_product' | 'donation' | 'view_history' | 'general_query' | 'checkout_cart' | 'list_groups' | 'send_group_message' | 'send_broadcast_message' = 'general_query';
      let dataVal: any = {};
      let politeResponse = "";

      if (toolCalls && toolCalls.length > 0) {
        const toolCall = toolCalls[0] as any;
        const functionName = toolCall.function.name as 'buy_tickets' | 'buy_product' | 'donation' | 'view_history' | 'checkout_cart' | 'list_groups' | 'send_group_message' | 'send_broadcast_message';
        const args = JSON.parse(toolCall.function.arguments || "{}");
        const targets = args.targets || [];

        intentVal = functionName;

        if (functionName === 'checkout_cart') {
          politeResponse = `Right away! I am generating the Paystack checkout link for your combined cart items.`;
          dataVal = {
            items: args.items,
            email: null
          };
        } else if (functionName === 'list_groups') {
          politeResponse = `Retrieving the active GOSA groups list for you.`;
          dataVal = {};
        } else if (functionName === 'send_group_message') {
          politeResponse = `Right away! I will forward that message to the specified group chat.`;
          dataVal = {
            targetGroupId: args.targetGroupId,
            messageText: args.messageText
          };
        } else if (functionName === 'send_broadcast_message') {
          politeResponse = `Right away! I will broadcast that direct message to all participants of the specified group individually.`;
          dataVal = {
            targetGroupId: args.targetGroupId,
            messageText: args.messageText
          };
        } else {
          dataVal = {
            ticketType: args.ticketType,
            productType: args.productType,
            quantity: args.quantity,
            targets: targets,
            amount: args.amount,
            email: null
          };

          if (functionName === 'buy_tickets') {
            politeResponse = `Right away! I am generating the Paystack payment link for the ${args.ticketType} tickets.`;
          } else if (functionName === 'buy_product') {
            politeResponse = `I have initialized the checkout for the GOSA ${args.productType}.`;
          } else if (functionName === 'donation') {
            politeResponse = `I have initialized a GOSA donation checkout for ₦${args.amount.toLocaleString()}.`;
          } else if (functionName === 'view_history') {
            politeResponse = `Right away! Retrieving your transaction history.`;
          }
        }
      } else {
        politeResponse = messageObj?.content || "I apologize. I didn't quite get that. Could you please rephrase?";
      }

      // Save conversation messages to history (last 15 messages)
      if (jid && isDbConnected) {
        try {
          const userMsg = {
            role: 'user' as const,
            content: message,
            name: currentSenderName,
            timestamp: new Date()
          };
          const assistantMsg = {
            role: 'assistant' as const,
            content: politeResponse,
            timestamp: new Date()
          };

          if (!historyRecord) {
            historyRecord = new ConversationHistory({ jid, messages: [] });
          }
          historyRecord.messages.push(userMsg);
          historyRecord.messages.push(assistantMsg);

          const maxHistory = 15;
          if (historyRecord.messages.length > maxHistory) {
            historyRecord.messages = historyRecord.messages.slice(-maxHistory);
          }
          await historyRecord.save();
        } catch (dbSaveErr) {
          console.error("Failed to save conversation history:", dbSaveErr);
        }
      }

      return {
        intent: intentVal,
        data: dataVal,
        response: politeResponse
      };
    } catch (err) {
      console.error("Error in AgentClass.httpSendMessage:", err);
      return {
        intent: "general_query",
        data: {},
        response: "I apologize. I am having some technical difficulties processing your request at the moment."
      };
    }
  }
}

export const Agent = new AgentClass();
