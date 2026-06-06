/** A single chat message in the OpenAI/Anthropic-style messages array. */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

/**
 * Parameters for a secure chat call. Mirrors the common shape of the OpenAI /
 * Anthropic messages APIs; any extra provider-specific fields are passed through
 * untouched to your backend (and therefore to the model).
 */
export interface SecureChatParams {
  messages: ChatMessage[];
  model?: string;
  [key: string]: unknown;
}
