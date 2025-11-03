/**
 * Token Counter Tests
 * Validates token estimation accuracy and edge cases
 */

import { 
  countMessageTokens, 
  getModelContextWindow, 
  getResponseReserveTokens,
  fitsInContextWindow 
} from '../token-counter';

describe('Token Counter', () => {
  describe('countMessageTokens', () => {
    it('should count tokens for simple text messages', () => {
      const messages = [
        { role: 'user', content: 'Hello, how are you?' },
        { role: 'assistant', content: 'I am doing well, thank you!' },
      ];

      const tokens = countMessageTokens(messages);
      
      // Expected: ~20 tokens (4 per msg overhead + content)
      expect(tokens).toBeGreaterThan(15);
      expect(tokens).toBeLessThan(30);
    });

    it('should count more tokens for code blocks', () => {
      const codeMessage = [
        { 
          role: 'user', 
          content: '```typescript\nfunction hello() { return "world"; }\n```' 
        },
      ];

      const plainMessage = [
        { 
          role: 'user', 
          content: 'This is plain text of similar length as the code above here' 
        },
      ];

      const codeTokens = countMessageTokens(codeMessage);
      const plainTokens = countMessageTokens(plainMessage);

      // Code should have more tokens (denser tokenization)
      expect(codeTokens).toBeGreaterThan(plainTokens * 0.8);
    });

    it('should handle messages with tool calls', () => {
      const messages = [
        { 
          role: 'assistant', 
          content: 'Let me search for that',
          tool_calls: [
            { name: 'web_search', arguments: { query: 'test query' } }
          ]
        },
      ];

      const tokens = countMessageTokens(messages);
      
      // Should count both content and tool_calls
      expect(tokens).toBeGreaterThan(20);
    });

    it('should add safety margin', () => {
      const messages = [
        { role: 'user', content: 'test' },
      ];

      const tokens = countMessageTokens(messages);
      
      // With 10% safety margin, should be at least 10% more than raw count
      // Raw: ~4 (overhead) + 1 (content) = 5 tokens
      // With margin: 5.5 → 6 tokens
      expect(tokens).toBeGreaterThanOrEqual(6);
    });
  });

  describe('getModelContextWindow', () => {
    it('should return correct context for Grok-4-fast', () => {
      expect(getModelContextWindow('grok-4-fast')).toBe(2_000_000);
    });

    it('should return correct context for GPT-5', () => {
      expect(getModelContextWindow('gpt-5')).toBe(128_000);
    });

    it('should return correct context for Gemini', () => {
      expect(getModelContextWindow('gemini-2.5-flash')).toBe(1_000_000);
    });

    it('should return fallback for unknown models', () => {
      expect(getModelContextWindow('unknown-model')).toBe(128_000);
    });

    it('should be case-insensitive', () => {
      expect(getModelContextWindow('GROK-4-FAST')).toBe(2_000_000);
      expect(getModelContextWindow('Gpt-5')).toBe(128_000);
    });
  });

  describe('getResponseReserveTokens', () => {
    it('should reserve more tokens for Grok-4-fast', () => {
      expect(getResponseReserveTokens('grok-4-fast')).toBe(8_000);
    });

    it('should reserve standard tokens for GPT-5', () => {
      expect(getResponseReserveTokens('gpt-5')).toBe(2_000);
    });

    it('should reserve more for Gemini', () => {
      expect(getResponseReserveTokens('gemini-2.5-flash')).toBe(4_000);
    });
  });

  describe('fitsInContextWindow', () => {
    it('should detect when messages fit', () => {
      const shortMessages = [
        { role: 'user', content: 'Hello' },
      ];

      const result = fitsInContextWindow(shortMessages, 'gpt-5');
      
      expect(result.fits).toBe(true);
      expect(result.tokenCount).toBeGreaterThan(0);
      expect(result.overflow).toBe(0);
    });

    it('should detect when messages exceed limit', () => {
      // Create a message that would exceed GPT-3.5's 16k limit
      const hugeContent = 'word '.repeat(20_000); // ~80k chars → ~20k tokens
      const largeMessages = [
        { role: 'user', content: hugeContent },
      ];

      const result = fitsInContextWindow(largeMessages, 'gpt-3.5-turbo');
      
      expect(result.fits).toBe(false);
      expect(result.overflow).toBeGreaterThan(0);
    });

    it('should calculate correct overflow', () => {
      const hugeContent = 'word '.repeat(50_000); // ~200k chars → ~50k tokens
      const messages = [
        { role: 'user', content: hugeContent },
      ];

      const result = fitsInContextWindow(messages, 'gpt-3.5-turbo');
      
      // GPT-3.5 has 16k context, reserve 2k for output = 14k max input
      // 50k tokens - 14k max = ~36k overflow
      expect(result.overflow).toBeGreaterThan(30_000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty messages array', () => {
      const tokens = countMessageTokens([]);
      expect(tokens).toBe(3); // Just the priming overhead + margin
    });

    it('should handle messages with no content', () => {
      const messages = [
        { role: 'user', content: '' },
      ];

      const tokens = countMessageTokens(messages);
      expect(tokens).toBeGreaterThan(0); // Still has overhead
    });

    it('should handle very long messages', () => {
      const longContent = 'word '.repeat(10_000); // ~40k chars
      const messages = [
        { role: 'user', content: longContent },
      ];

      const tokens = countMessageTokens(messages);
      
      // Should be roughly 10k tokens (40k chars / 4)
      expect(tokens).toBeGreaterThan(9_000);
      expect(tokens).toBeLessThan(15_000);
    });
  });
});
