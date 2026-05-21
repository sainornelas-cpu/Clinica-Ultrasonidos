// Constantes para estados de conversación
export const CONVERSATION_STATES = {
  IDLE: 'idle',
  PROCESSING: 'processing',
  BOOKING_NAME: 'booking_name',
  BOOKING_SERVICE: 'booking_service',
  BOOKING_DATE: 'booking_date'
} as const;

export type ConversationState = typeof CONVERSATION_STATES[keyof typeof CONVERSATION_STATES];

// Detectar estado de conversación basado en la respuesta del bot
export function detectStateFromResponse(response: string): ConversationState {
  if (response.includes('nombre completo')) {
    return CONVERSATION_STATES.BOOKING_NAME;
  }
  if (response.includes('Selecciona el servicio')) {
    return CONVERSATION_STATES.BOOKING_SERVICE;
  }
  if (response.includes('fecha y hora') && response.includes('indica')) {
    return CONVERSATION_STATES.BOOKING_DATE;
  }
  return CONVERSATION_STATES.IDLE;
}
