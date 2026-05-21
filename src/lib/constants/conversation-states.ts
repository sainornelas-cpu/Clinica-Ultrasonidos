// Constantes para estados de conversación
export const CONVERSATION_STATES = {
  IDLE: 'idle',
  PROCESSING: 'processing',
  BOOKING_NAME: 'booking_name',
  BOOKING_SERVICE: 'booking_service',
  BOOKING_DATE: 'booking_date'
} as const;

export type ConversationState = typeof CONVERSATION_STATES[keyof typeof CONVERSATION_STATES];