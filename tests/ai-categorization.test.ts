import { GeminiCategorizer } from '../src/services/ai/gemini-categorizer';

describe('GeminiCategorizer Unit Tests', () => {
  it('returns Uncategorized when GEMINI_API_KEY is missing', async () => {
    // Explicitly pass empty key to simulate missing configuration
    const categorizer = new GeminiCategorizer('');
    const result = await categorizer.categorize({
      subject: 'Inquiry',
      from: 'test@example.com',
      body: 'Can I get a demo?'
    });

    expect(result.category).toBe('Uncategorized');
    expect(result.confidence).toBe(0);
    expect(result.reasoning).toContain('not configured');
  });

  it('correctly handles and validates mocked Gemini JSON responses for all 5 categories', async () => {
    const mockResponses = [
      {
        expected: 'Interested',
        json: JSON.stringify({
          category: 'Interested',
          confidence: 0.95,
          reasoning: 'Customer asked for pricing and demo'
        })
      },
      {
        expected: 'Meeting Booked',
        json: JSON.stringify({
          category: 'Meeting Booked',
          confidence: 0.99,
          reasoning: 'Meeting scheduled for tomorrow at 2pm'
        })
      },
      {
        expected: 'Not Interested',
        json: JSON.stringify({
          category: 'Not Interested',
          confidence: 0.98,
          reasoning: 'Customer asked to be removed from list'
        })
      },
      {
        expected: 'Spam',
        json: JSON.stringify({
          category: 'Spam',
          confidence: 0.99,
          reasoning: 'Unsolicited promotional loan blast'
        })
      },
      {
        expected: 'Out of Office',
        json: JSON.stringify({
          category: 'Out of Office',
          confidence: 1.0,
          reasoning: 'Automated away responder'
        })
      }
    ];

    for (const testCase of mockResponses) {
      const categorizer = new GeminiCategorizer('dummy-key');
      // Mock generateContent
      (categorizer as any).client = {
        models: {
          generateContent: jest.fn().mockResolvedValue({
            text: testCase.json
          })
        }
      };

      const result = await categorizer.categorize({
        subject: 'Test Subject',
        from: 'sender@example.com',
        body: 'Sample body text'
      });

      expect(result.category).toBe(testCase.expected);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.reasoning.length).toBeGreaterThan(0);
    }
  });

  it('handles markdown codeblock wrapping around JSON response', async () => {
    const categorizer = new GeminiCategorizer('dummy-key');
    (categorizer as any).client = {
      models: {
        generateContent: jest.fn().mockResolvedValue({
          text: '```json\n{\n  "category": "Interested",\n  "confidence": 0.92,\n  "reasoning": "Valid interest"\n}\n```'
        })
      }
    };

    const result = await categorizer.categorize({
      subject: 'Demo inquiry',
      from: 'lead@test.com',
      body: 'We want a demo.'
    });

    expect(result.category).toBe('Interested');
    expect(result.confidence).toBe(0.92);
  });

  it('handles malformed non-JSON output gracefully with fallback to Uncategorized', async () => {
    const categorizer = new GeminiCategorizer('dummy-key');
    (categorizer as any).client = {
      models: {
        generateContent: jest.fn().mockResolvedValue({
          text: 'This is not valid JSON at all.'
        })
      }
    };

    const result = await categorizer.categorize({
      subject: 'Corrupted output',
      from: 'test@example.com',
      body: 'Some text'
    });

    expect(result.category).toBe('Uncategorized');
    expect(result.confidence).toBe(0);
    expect(result.reasoning).toContain('Classification error');
  });

  it('handles invalid category enum returned by model gracefully', async () => {
    const categorizer = new GeminiCategorizer('dummy-key');
    (categorizer as any).client = {
      models: {
        generateContent: jest.fn().mockResolvedValue({
          text: JSON.stringify({
            category: 'Curious', // Invalid category
            confidence: 0.8,
            reasoning: 'Not in enum'
          })
        })
      }
    };

    const result = await categorizer.categorize({
      subject: 'Invalid Category Subject',
      from: 'test@example.com',
      body: 'Some text'
    });

    expect(result.category).toBe('Uncategorized');
    expect(result.confidence).toBe(0);
  });

  it('handles out-of-range confidence gracefully', async () => {
    const categorizer = new GeminiCategorizer('dummy-key');
    (categorizer as any).client = {
      models: {
        generateContent: jest.fn().mockResolvedValue({
          text: JSON.stringify({
            category: 'Interested',
            confidence: 1.5, // > 1.0 is invalid
            reasoning: 'Excessive confidence'
          })
        })
      }
    };

    const result = await categorizer.categorize({
      subject: 'Subject',
      from: 'test@example.com',
      body: 'Some text'
    });

    expect(result.category).toBe('Uncategorized');
  });

  it('handles provider API network error without throwing', async () => {
    const categorizer = new GeminiCategorizer('dummy-key');
    (categorizer as any).client = {
      models: {
        generateContent: jest.fn().mockRejectedValue(new Error('Rate limit exceeded (429)'))
      }
    };

    const result = await categorizer.categorize({
      subject: 'Subject',
      from: 'test@example.com',
      body: 'Some text'
    });

    expect(result.category).toBe('Uncategorized');
    expect(result.reasoning).toContain('Rate limit exceeded');
  });

  it('truncates oversized email bodies safely', async () => {
    const categorizer = new GeminiCategorizer('dummy-key');
    const mockGenerate = jest.fn().mockResolvedValue({
      text: JSON.stringify({
        category: 'Spam',
        confidence: 0.99,
        reasoning: 'Oversized junk'
      })
    });

    (categorizer as any).client = {
      models: {
        generateContent: mockGenerate
      }
    };

    const hugeBody = 'A'.repeat(50000); // 50,000 characters
    await categorizer.categorize({
      subject: 'Huge email',
      from: 'huge@example.com',
      body: hugeBody
    });

    expect(mockGenerate).toHaveBeenCalled();
    const promptArg = mockGenerate.mock.calls[0][0].contents;
    expect(promptArg.length).toBeLessThan(10000); // Truncated to safe length
    expect(promptArg).toContain('[truncated]');
  });
});
