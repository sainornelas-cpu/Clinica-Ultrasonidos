import Airtable from 'airtable';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || '';
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || '';

export function getAirtable() {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    throw new Error('AIRTABLE_API_KEY and AIRTABLE_BASE_ID are required');
  }
  return new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);
}

export interface Appointment {
  id?: string;
  phone: string;
  name: string;
  service: string;
  date: string;
  status: 'confirmed' | 'cancelled' | 'rescheduled';
  calendarEventId?: string;
  notes?: string;
}

// Tabla: Appointments
export const APPOINTMENTS_TABLE = 'Appointments';

export async function createAppointment(data: Appointment): Promise<Appointment> {
  const record = await getAirtable()(APPOINTMENTS_TABLE).create({
    Phone: data.phone,
    Name: data.name,
    Service: data.service,
    Date: data.date,
    Status: data.status,
    Notes: data.notes || ''
  });

  return {
    id: record.id,
    phone: record.fields.Phone as string,
    name: record.fields.Name as string,
    service: record.fields.Service as string,
    date: record.fields.Date as string,
    status: record.fields.Status as Appointment['status'],
    notes: record.fields.Notes as string
  };
}

export async function getAppointmentsByPhone(phone: string): Promise<Appointment[]> {
  const records = await getAirtable()(APPOINTMENTS_TABLE)
    .select({
      filterByFormula: `{Phone} = "${phone}"`,
      sort: [{ field: 'Date', direction: 'asc' }]
    })
    .all();

  return records.map((r: any) => ({
    id: r.id,
    phone: r.fields.Phone as string,
    name: r.fields.Name as string,
    service: r.fields.Service as string,
    date: r.fields.Date as string,
    status: r.fields.Status as Appointment['status'],
    calendarEventId: r.fields['Calendar Event ID'] as string | undefined
  }));
}

export async function updateAppointmentStatus(id: string, status: string): Promise<void> {
  await getAirtable()(APPOINTMENTS_TABLE).update(id, { Status: status });
}

export async function updateAppointmentDate(id: string, date: string): Promise<void> {
  await getAirtable()(APPOINTMENTS_TABLE).update(id, { Date: date });
}

export async function getOrCreateUser(phone: string, name?: string): Promise<{ id: string; name: string }> {
  return { id: phone, name: name || '' };
}