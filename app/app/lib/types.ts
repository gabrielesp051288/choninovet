export type PetSex = 'MALE' | 'FEMALE' | 'UNKNOWN';

export type Pet = {
  id: string;
  name: string;
  species: string;
  breed?: string | null;
  sex: PetSex;
  birthDate?: string | null;
  weightKg?: string | number | null;
  notes?: string | null;
  photoUrl?: string | null;
  owner?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  records?: MedicalRecord[];
};

export type VetProfile = {
  id: string;
  clinicName: string;
  managerName?: string | null;
  phone?: string | null;
  address?: string | null;
  description?: string | null;
};

export type AppointmentStatus = 'REQUESTED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export type Appointment = {
  id: string;
  scheduledAt: string;
  reason?: string | null;
  status: AppointmentStatus;
  pet: Pet;
  vet: VetProfile;
};

export type MedicalRecordType =
  | 'CONSULTATION'
  | 'VACCINE'
  | 'DEWORMING'
  | 'TREATMENT'
  | 'OBSERVATION';

export type MedicalRecord = {
  id: string;
  appointmentId?: string | null;
  type: MedicalRecordType;
  recordDate: string;
  title: string;
  description: string;
  consultationReason?: string | null;
  diagnosis?: string | null;
  treatment?: string | null;
  medication?: string | null;
  weightKg?: string | number | null;
  temperatureC?: string | number | null;
  ownerVisibleNotes?: string | null;
  privateNotes?: string | null;
  nextCheckAt?: string | null;
  vet?: VetProfile;
  appointment?: Appointment | null;
};

export type MedicalAttachmentType =
  | 'IMAGE'
  | 'PDF'
  | 'LAB_RESULT'
  | 'RADIOGRAPHY'
  | 'STUDY'
  | 'OTHER';

export type MedicalAttachment = {
  id: string;
  petId: string;
  medicalRecordId?: string | null;
  type: MedicalAttachmentType;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  medicalRecord?: {
    id: string;
    title: string;
    recordDate: string;
    type: MedicalRecordType;
  } | null;
};

export type VaccinationRecord = {
  id: string;
  petId: string;
  vetProfileId: string;
  vaccineName: string;
  brand?: string | null;
  batchNumber?: string | null;
  appliedAt: string;
  nextDueAt?: string | null;
  notes?: string | null;
  vet?: VetProfile;
};

export type ReminderType = 'VACCINE' | 'CHECKUP' | 'APPOINTMENT' | 'TREATMENT' | 'OTHER';
export type ReminderStatus = 'PENDING' | 'COMPLETED';

export type Reminder = {
  id: string;
  type: ReminderType;
  status: ReminderStatus;
  title: string;
  description?: string | null;
  dueAt: string;
  completedAt?: string | null;
  pet: Pet;
  vet?: VetProfile | null;
};

export type Message = {
  id: string;
  conversationId: string;
  body: string;
  createdAt: string;
  sender: {
    id: string;
    email: string;
    role: 'OWNER' | 'VET' | 'ADMIN';
  };
};

export type Conversation = {
  id: string;
  pet?: Pet | null;
  vet: VetProfile;
  messages?: Message[];
  updatedAt: string;
};
