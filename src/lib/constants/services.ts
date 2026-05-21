// Servicios disponibles para agendamiento
export const SERVICES: Record<string, { name: string; price: string; duration: number }> = {
  '1': { name: 'Consulta General', price: '$500', duration: 30 },
  '2': { name: 'Ultrasonido Ginecológico', price: '$1,200', duration: 45 },
  '3': { name: 'Control Prenatal', price: '$800', duration: 40 },
  '4': { name: 'Papanicolaou', price: '$450', duration: 30 },
  '5': { name: 'Consulta de Fertilidad', price: '$900', duration: 60 }
}

export const MENU_OPTIONS = {
  AGENDAR: '1',
  PRECIOS: '2',
  SERVICIOS: '3',
  UBICACION: '4',
  HORARIO: '5'
} as const

export const CLINIC_INFO = {
  name: 'Dr. Baltierres Ginecólogo Ultrasonido',
  address: 'Av. Principal #123, Colonia Centro\nCiudad de México, CP 00000',
  phone: '+52 555-123-4567',
  hours: '• Lunes a Viernes: 9:00 AM - 7:00 PM\n• Sábados: 9:00 AM - 2:00 PM\n• Domingos: Cerrado'
} as const

export const OWNER_ID = '00000000-0000-0000-0000-000000000001'