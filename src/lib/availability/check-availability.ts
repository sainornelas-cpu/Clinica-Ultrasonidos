import { createServerClient } from '@/lib/supabase/client'
import { SERVICES } from '@/lib/constants/services'

export interface AvailabilityResult {
  available: boolean;
  message?: string;
  suggestedSlots?: string[];
  parsedDate?: Date;
}

export interface Slot {
  startTime: Date;
  endTime: Date;
  label: string;
}

// Horarios de la clínica
const CLINIC_HOURS = {
  weekdays: { start: 9, end: 19 },
  saturday: { start: 9, end: 14 },
  sunday: null
};

export async function checkAvailability(
  dateText: string,
  serviceDuration: number,
  timezone: string = 'America/Mexico_City'
): Promise<AvailabilityResult> {
  const supabase = createServerClient();
  const now = new Date();

  // 1. Parsear fecha
  const parsedDate = parseHumanDate(dateText, now, timezone);
  if (!parsedDate) {
    return {
      available: false,
      message: 'No pude entender la fecha. Por favor usa un formato como "Mañana a las 10am" o "Viernes 25 de mayo a las 3pm"'
    };
  }

  // 2. Validar fecha futura (OBLIGATORIO)
  if (parsedDate.getTime() <= now.getTime()) {
    const suggestedSlots = generateNextAvailableSlots(serviceDuration, timezone);
    return {
      available: false,
      message: '❌ Esa fecha/hora ya pasó o es el día de hoy.\n\nPor favor selecciona una fecha futura. Estos son los horarios disponibles:',
      suggestedSlots
    };
  }

  // 3. Validar que no sea domingo
  const dayOfWeek = parsedDate.getDay();
  if (dayOfWeek === 0) {
    const suggestedSlots = generateNextAvailableSlots(serviceDuration, timezone);
    return {
      available: false,
      message: '❌ El día domingo estamos cerrados.\n\n¿Te gustaría agendar para otro día?',
      suggestedSlots
    };
  }

  // 4. Validar horario de clínica
  const hours = dayOfWeek === 6 ? CLINIC_HOURS.saturday : CLINIC_HOURS.weekdays;
  const requestHour = parsedDate.getHours();
  const requestMinute = parsedDate.getMinutes();

  if (requestHour < hours.start || (requestHour === hours.end && requestMinute > 0) || requestHour >= hours.end) {
    const suggestedSlots = generateNextAvailableSlots(serviceDuration, timezone);
    return {
      available: false,
      message: `❌ Nuestro horario es de ${formatHour(hours.start)}:00 - ${formatHour(hours.end)}:00.\n\nPor favor selecciona un horario dentro de nuestro horario:`,
      suggestedSlots
    };
  }

  // 5. Consultar citas existentes en esa fecha
  const dayStart = new Date(parsedDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setHours(23, 59, 59, 999);

  const { data: existingAppointments } = await supabase
    .from('appointments')
    .select('start_time,end_time')
    .eq('status', 'confirmed')
    .gte('start_time', dayStart.toISOString())
    .lte('start_time', dayEnd.toISOString());

  const appointments = existingAppointments || [];

  // 6. Verificar solapamiento
  const requestedEnd = new Date(parsedDate.getTime() + serviceDuration * 60000);

  const hasOverlap = appointments.some((apt: any) => {
    const aptStart = new Date(apt.start_time);
    const aptEnd = new Date(apt.end_time);
    return requestedEnd > aptStart && parsedDate < aptEnd;
  });

  if (hasOverlap) {
    const availableSlots = generateAvailableSlotsForDay(parsedDate, serviceDuration, appointments);

    if (availableSlots.length > 0) {
      return {
        available: false,
        message: '❌ Ese horario no está disponible.\n\nEstos son los horarios disponibles para esa fecha:',
        suggestedSlots: availableSlots.map(s => s.label)
      };
    } else {
      const nextDaySlots = generateNextAvailableSlots(serviceDuration, timezone);
      return {
        available: false,
        message: '❌ No hay más horarios disponibles para esa fecha.\n\n¿Te gustaría agendar otro día?',
        suggestedSlots: nextDaySlots
      };
    }
  }

  return { available: true, parsedDate };
}

function parseHumanDate(text: string, now: Date, timezone: string): Date | null {
  const lower = text.trim().toLowerCase();

  const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  let hours = 10;
  let minutes = 0;

  if (timeMatch) {
    hours = parseInt(timeMatch[1]);
    minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const period = timeMatch[3]?.toLowerCase();

    if (period === 'pm' && hours !== 12) {
      hours += 12;
    } else if (period === 'am' && hours === 12) {
      hours = 0;
    }
  } else {
    hours = 9;
    minutes = 0;
  }

  let daysToAdd = 0;

  if (lower.includes('hoy')) {
    daysToAdd = 0;
  } else if (lower.includes('mañana') || lower.includes('manana')) {
    daysToAdd = 1;
  } else if (lower.includes('pasado mañana') || lower.includes('pasado manana')) {
    daysToAdd = 2;
  } else {
    const dateMatch = text.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
    if (dateMatch) {
      const [_, day, month, year] = dateMatch;
      const y = year.length === 2 ? 2000 + parseInt(year) : parseInt(year);
      const m = parseInt(month) - 1;
      const d = parseInt(day);
      const parsed = new Date(y, m, d, hours, minutes);

      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    daysToAdd = 1;
  }

  const result = new Date(now);
  result.setDate(result.getDate() + daysToAdd);
  result.setHours(hours, minutes, 0, 0);

  return result;
}

function generateAvailableSlotsForDay(
  date: Date,
  duration: number,
  existingAppointments: any[]
): Slot[] {
  const dayOfWeek = date.getDay();
  const hours = dayOfWeek === 6 ? CLINIC_HOURS.saturday : CLINIC_HOURS.weekdays;

  if (!hours) {
    return [];
  }

  const slots: Slot[] = [];
  const dayStart = new Date(date);
  dayStart.setHours(hours.start, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(hours.end, 0, 0, 0);

  const slotDuration = 30;
  let currentTime = new Date(dayStart);

  while (currentTime.getTime() + duration * 60000 <= dayEnd.getTime()) {
    const slotEnd = new Date(currentTime.getTime() + duration * 60000);

    const hasOverlap = existingAppointments.some((apt: any) => {
      const aptStart = new Date(apt.start_time);
      const aptEnd = new Date(apt.end_time);
      return slotEnd > aptStart && currentTime < aptEnd;
    });

    if (!hasOverlap) {
      const label = formatTime(currentTime);
      slots.push({
        startTime: new Date(currentTime),
        endTime: new Date(slotEnd),
        label
      });
    }

    currentTime = new Date(currentTime.getTime() + slotDuration * 60000);
  }

  return slots.slice(0, 5);
}

function generateNextAvailableSlots(
  duration: number,
  timezone: string,
  maxDays: number = 7
): string[] {
  const slots: string[] = [];
  const now = new Date();
  let dayOffset = 1;

  while (slots.length < 3 && dayOffset <= maxDays) {
    const testDate = new Date(now);
    testDate.setDate(testDate.getDate() + dayOffset);
    testDate.setHours(9, 0, 0, 0);

    if (testDate.getDay() === 0) {
      dayOffset++;
      continue;
    }

    const daySlots = generateAvailableSlotsForDay(testDate, duration, []);
    slots.push(...daySlots.slice(0, 2 - slots.length).map(s => {
      const dayName = getDayName(testDate);
      return `• ${dayName} ${s.label}`;
    }));

    dayOffset++;
  }

  return slots;
}

function formatHour(hour: number): string {
  if (hour === 0) return '12';
  if (hour > 12) return String(hour - 12);
  return String(hour);
}

function formatTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const displayMinutes = minutes.toString().padStart(2, '0');
  return `${displayHours}:${displayMinutes} ${period}`;
}

function getDayName(date: Date): string {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[date.getDay()];
}