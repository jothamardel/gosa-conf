import { Agent } from '../../../lib/agent';

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
});
