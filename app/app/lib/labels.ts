import type {
  AppointmentStatus,
  MedicalRecordType,
  PetSex,
  ReminderStatus,
  ReminderType,
} from './types';

const petSexLabels: Record<PetSex, string> = {
  MALE: 'Macho',
  FEMALE: 'Hembra',
  UNKNOWN: 'Sin dato',
};

const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  REQUESTED: 'Solicitado',
  CONFIRMED: 'Confirmado',
  CANCELLED: 'Cancelado',
  COMPLETED: 'Completado',
};

const medicalRecordTypeLabels: Record<MedicalRecordType, string> = {
  CONSULTATION: 'Consulta',
  VACCINE: 'Vacuna',
  DEWORMING: 'Desparasitacion',
  TREATMENT: 'Tratamiento',
  OBSERVATION: 'Observacion',
};

const reminderTypeLabels: Record<ReminderType, string> = {
  VACCINE: 'Vacuna',
  CHECKUP: 'Control',
  APPOINTMENT: 'Turno',
  TREATMENT: 'Tratamiento',
  OTHER: 'Otro',
};

const reminderStatusLabels: Record<ReminderStatus, string> = {
  PENDING: 'Pendiente',
  COMPLETED: 'Completado',
};

export function petSexLabel(value: PetSex) {
  return petSexLabels[value] ?? value;
}

export function appointmentStatusLabel(value: AppointmentStatus) {
  return appointmentStatusLabels[value] ?? value;
}

export function medicalRecordTypeLabel(value: MedicalRecordType) {
  return medicalRecordTypeLabels[value] ?? value;
}

export function reminderTypeLabel(value: ReminderType) {
  return reminderTypeLabels[value] ?? value;
}

export function reminderStatusLabel(value: ReminderStatus) {
  return reminderStatusLabels[value] ?? value;
}
