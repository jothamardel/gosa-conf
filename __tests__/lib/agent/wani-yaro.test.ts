import { Agent } from '../../../lib/agent';
import mongoose from 'mongoose';
import { ConversationHistory } from '../../../lib/schema';

// Mock mongoose to avoid loading raw database ESM files in Jest
jest.mock('mongoose', () => {
  return {
    __esModule: true,
    default: {
      connection: {
        readyState: 0
      }
    }
  };
});

// Mock schema module to return stubbed schema objects
jest.mock('../../../lib/schema', () => {
  return {
    ConversationHistory: {
      findOne: jest.fn()
    }
  };
});

// Mock OpenAI using global registry to avoid hoisting initialization order issues
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => {
    return {
      chat: {
        completions: {
          create: jest.fn().mockImplementation(async (params) => {
            if ((global as any).mockOpenAICreate) {
              return (global as any).mockOpenAICreate(params);
            }
            throw new Error('mockOpenAICreate not defined on global');
          })
        }
      }
    };
  });
});

describe('Wani Yaro Agent Integration', () => {
  let mockCreateFn: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateFn = jest.fn();
    (global as any).mockOpenAICreate = mockCreateFn;
  });

  afterAll(() => {
    delete (global as any).mockOpenAICreate;
  });

  it('should successfully handle general query requests with respectful responses', async () => {
    const mockLLMResponse = {
      choices: [
        {
          message: {
            content: 'Yes sir, the GOSA convention is scheduled for November 1–2, 2025, sir!'
          }
        }
      ]
    };

    mockCreateFn.mockResolvedValue(mockLLMResponse);

    const result = await Agent.httpSendMessage('when is the convention');

    expect(result.intent).toBe('general_query');
    expect(result.response).toContain('sir');
    expect(mockCreateFn).toHaveBeenCalled();
  });

  it('should parse ticket purchases for other members correctly', async () => {
    const mockLLMResponse = {
      choices: [
        {
          message: {
            tool_calls: [
              {
                function: {
                  name: 'buy_tickets',
                  arguments: JSON.stringify({
                    ticketType: 'convention',
                    targets: ['@john', '@mary']
                  })
                }
              }
            ]
          }
        }
      ]
    };

    mockCreateFn.mockResolvedValue(mockLLMResponse);

    const result = await Agent.httpSendMessage('wani yaro buy convention tickets for @john and @mary');

    expect(result.intent).toBe('buy_tickets');
    expect(result.data.ticketType).toBe('convention');
    expect(result.data.targets).toContain('@john');
    expect(result.data.targets).toContain('@mary');
    expect(result.response).toContain('sir');
  });

  it('should parse product purchases correctly', async () => {
    const mockLLMResponse = {
      choices: [
        {
          message: {
            tool_calls: [
              {
                function: {
                  name: 'buy_product',
                  arguments: JSON.stringify({
                    productType: 'uniform',
                    quantity: 2
                  })
                }
              }
            ]
          }
        }
      ]
    };

    mockCreateFn.mockResolvedValue(mockLLMResponse);

    const result = await Agent.httpSendMessage('buy 2 uniforms');

    expect(result.intent).toBe('buy_product');
    expect(result.data.productType).toBe('uniform');
    expect(result.data.quantity).toBe(2);
    expect(result.response).toContain('sir');
  });

  it('should parse donation requests correctly', async () => {
    const mockLLMResponse = {
      choices: [
        {
          message: {
            tool_calls: [
              {
                function: {
                  name: 'donation',
                  arguments: JSON.stringify({
                    amount: 5000,
                    targets: []
                  })
                }
              }
            ]
          }
        }
      ]
    };

    mockCreateFn.mockResolvedValue(mockLLMResponse);

    const result = await Agent.httpSendMessage('donate 5000');

    expect(result.intent).toBe('donation');
    expect(result.data.amount).toBe(5000);
    expect(result.response).toContain('sir');
  });

  it('should gracefully fall back in case of parsing or api errors', async () => {
    mockCreateFn.mockRejectedValue(new Error('OpenAI API Error'));

    const result = await Agent.httpSendMessage('hello');

    expect(result.intent).toBe('general_query');
    expect(result.response).toContain('sir');
    expect(result.response).toContain('apologize');
  });

  it('should include conversation history when loading context', async () => {
    // Mock DB connection state to be active
    const originalReadyState = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, 'readyState', { value: 1, writable: true });

    // Mock ConversationHistory findOne
    const mockFindOne = jest.spyOn(ConversationHistory, 'findOne').mockResolvedValue({
      jid: 'test-jid',
      messages: [
        { role: 'user', content: 'hello', name: 'User', timestamp: new Date() },
        { role: 'assistant', content: 'Yes sir, how can I help you, sir?', timestamp: new Date() }
      ],
      save: jest.fn().mockResolvedValue(true)
    } as any);

    const mockLLMResponse = {
      choices: [
        {
          message: {
            content: 'Hello again, sir!'
          }
        }
      ]
    };
    mockCreateFn.mockResolvedValue(mockLLMResponse);

    const result = await Agent.httpSendMessage('what did we talk about?', 'test-jid', 'User');

    expect(result.intent).toBe('general_query');
    expect(result.response).toBe('Hello again, sir!');
    expect(mockFindOne).toHaveBeenCalledWith({ jid: 'test-jid' });

    // Verify history messages were included in the OpenAI payload
    const callArgs = mockCreateFn.mock.calls[0][0];
    expect(callArgs.messages).toHaveLength(4); // system, user(hello), assistant(help), user(what did we talk about)
    expect(callArgs.messages[1]).toEqual({ role: 'user', content: 'hello', name: 'User' });
    expect(callArgs.messages[2]).toEqual({ role: 'assistant', content: 'Yes sir, how can I help you, sir?', name: undefined });

    // Restore mocks
    mockFindOne.mockRestore();
    Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, writable: true });
  });

  it('should parse combined cart purchases for multiple items/targets correctly', async () => {
    const mockLLMResponse = {
      choices: [
        {
          message: {
            tool_calls: [
              {
                function: {
                  name: 'checkout_cart',
                  arguments: JSON.stringify({
                    items: [
                      { type: 'convention', quantity: 1, targets: ['@john'] },
                      { type: 'dinner', quantity: 1, targets: ['@mary'] },
                      { type: 'uniform', quantity: 2 }
                    ]
                  })
                }
              }
            ]
          }
        }
      ]
    };

    mockCreateFn.mockResolvedValue(mockLLMResponse);

    const result = await Agent.httpSendMessage('buy convention ticket for @john, dinner ticket for @mary, and 2 uniforms');

    expect(result.intent).toBe('checkout_cart');
    expect(result.data.items).toHaveLength(3);
    expect(result.data.items![0]).toEqual({ type: 'convention', quantity: 1, targets: ['@john'] });
    expect(result.data.items![1]).toEqual({ type: 'dinner', quantity: 1, targets: ['@mary'] });
    expect(result.data.items![2]).toEqual({ type: 'uniform', quantity: 2 });
    expect(result.response).toContain('sir');
  });
});
