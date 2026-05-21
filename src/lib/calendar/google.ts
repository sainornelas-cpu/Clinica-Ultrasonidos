import { google } from 'googleapis';

const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';
const CREDENTIALS = {
  client_email: process.env.GOOGLE_CLIENT_EMAIL || '',
  private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
};

const auth = new google.auth.JWT(
  CREDENTIALS.client_email,
  undefined,
  CREDENTIALS.private_key,
  ['https://www.googleapis.com/auth/calendar']
);

const calendar = google.calendar({ version: 'v3', auth });

export async function checkAvailability(
  startTime: Date,
  endTime: Date
): Promise<boolean> {
  try {
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        items: [{ id: GOOGLE_CALENDAR_ID }]
      }
    });

    const busy = response.data.calendars?.[GOOGLE_CALENDAR_ID]?.busy || [];
    return busy.length === 0;
  } catch (error) {
    console.error('Calendar check error:', error);
    return true; // Fallback: permitir si falla
  }
}

export async function createEvent(
  summary: string,
  description: string,
  startTime: Date,
  endTime: Date
): Promise<string> {
  const response = await calendar.events.insert({
    calendarId: GOOGLE_CALENDAR_ID,
    requestBody: {
      summary,
      description,
      start: { dateTime: startTime.toISOString() },
      end: { dateTime: endTime.toISOString() }
    }
  });

  return response.data.id || '';
}

export async function updateEvent(
  eventId: string,
  startTime: Date,
  endTime: Date
): Promise<void> {
  await calendar.events.update({
    calendarId: GOOGLE_CALENDAR_ID,
    eventId,
    requestBody: {
      start: { dateTime: startTime.toISOString() },
      end: { dateTime: endTime.toISOString() }
    }
  });
}

export async function deleteEvent(eventId: string): Promise<void> {
  await calendar.events.delete({
    calendarId: GOOGLE_CALENDAR_ID,
    eventId
  });
}

export async function getAvailableSlots(
  date: Date,
  durationMinutes: number
): Promise<string[]> {
  const dayStart = new Date(date);
  dayStart.setHours(9, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(19, 0, 0, 0);

  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0) return []; // Domingo cerrado
  if (dayOfWeek === 6) dayEnd.setHours(14, 0, 0, 0); // Sábado hasta 2pm

  const slots: string[] = [];
  const slotInterval = 30; // minutos

  let current = new Date(dayStart);
  while (current.getTime() + durationMinutes * 60000 <= dayEnd.getTime()) {
    const slotEnd = new Date(current.getTime() + durationMinutes * 60000);
    const available = await checkAvailability(current, slotEnd);

    if (available) {
      const time = current.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit'
      });
      slots.push(`${time} - ${new Date(slotEnd.getTime()).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`);
    }

    current = new Date(current.getTime() + slotInterval * 60000);
  }

  return slots.slice(0, 5);
}