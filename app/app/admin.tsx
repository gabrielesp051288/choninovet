import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import {
  Bell,
  CalendarDays,
  CheckCircle,
  ChartColumn,
  ChevronLeft,
  ChevronRight,
  Clock,
  Database,
  Eye,
  History,
  PawPrint,
  RefreshCcw,
  ServerCog,
  ShieldCheck,
  Stethoscope,
  TriangleAlert,
  UserPlus,
  UsersRound,
  XCircle,
} from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Badge, Card, Muted, Screen, SectionTitle, SessionMenu } from './components';
import { apiRequest, apiUploadRequest } from './lib/api';
import { formatDateOnly } from './lib/dates';
import {
  defaultSchedule,
  scheduleScopeLabels,
  useSchedule,
  useUpdateSchedule,
  type ScheduleSetting,
} from './hooks/use-schedule';
import { useRequireRole } from './lib/auth-routing';
import {
  appointmentStatusLabel,
  medicalRecordTypeLabel,
  petSexLabel,
  reminderStatusLabel,
  reminderTypeLabel,
} from './lib/labels';
import type { AppointmentStatus, MedicalRecordType, PetSex, ReminderStatus, ReminderType } from './lib/types';
import { useApiConfigStore } from './stores/api-config-store';
import { useAuthStore } from './stores/auth-store';
import { colors, spacing } from './theme';

type AdminSection =
  | 'dashboard'
  | 'overview'
  | 'vets'
  | 'users'
  | 'appointments'
  | 'reminders'
  | 'schedule'
  | 'extensions'
  | 'audit'
  | 'system'
  | 'create-vet'
  | 'detail';
type AdminIconKind =
  | 'overview'
  | 'vet'
  | 'users'
  | 'agenda'
  | 'reminders'
  | 'schedule'
  | 'extensions'
  | 'audit'
  | 'system'
  | 'add';
type AccountStatus = 'PENDING' | 'ACTIVE' | 'REJECTED';
type ExtensionStatus = 'AVAILABLE' | 'ACTIVE' | 'INACTIVE' | 'NEEDS_CONFIGURATION';
type AdminExtension = {
  key: string;
  name: string;
  version: string;
  description: string;
  category: string;
  status: ExtensionStatus;
  isInstalled: boolean;
  requiresExternalService: boolean;
  config?: Record<string, unknown> | null;
  updatedAt: string;
};
type AdminDetailTarget = {
  id: string;
  type: 'vet' | 'owner' | 'pet';
};
type AccountUser = {
  id: string;
  email: string;
  role: 'OWNER' | 'VET' | 'ADMIN';
  status: AccountStatus;
  createdAt: string;
  ownerProfile?: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    _count: {
      pets: number;
    };
  } | null;
  vetProfile?: {
    id: string;
    clinicName: string;
    managerName?: string | null;
    phone?: string | null;
  } | null;
};

type DetailUser = {
  email: string;
  status: AccountStatus;
  createdAt?: string;
};

type DetailVet = {
  id: string;
  clinicName: string;
  managerName?: string | null;
  phone?: string | null;
  address?: string | null;
  description?: string | null;
  user: DetailUser;
  pets: Array<{
    pet: DetailPetBase & {
      owner: DetailOwnerBase;
      _count: {
        appointments: number;
        records: number;
        reminders: number;
      };
    };
  }>;
  appointments: DetailAppointment[];
  records: DetailMedicalRecord[];
  reminders: DetailReminder[];
  _count: {
    pets: number;
    appointments: number;
    records: number;
    reminders: number;
    conversations: number;
  };
};

type DetailOwner = DetailOwnerBase & {
  user: DetailUser;
  pets: Array<
    DetailPetBase & {
      vets: Array<{ vet: DetailVetBase }>;
      appointments: DetailAppointment[];
      records: DetailMedicalRecord[];
      reminders: DetailReminder[];
      _count: {
        vets: number;
        appointments: number;
        records: number;
        reminders: number;
      };
    }
  >;
  _count: {
    pets: number;
  };
};

type DetailPet = DetailPetBase & {
  owner: DetailOwnerBase & {
    user: {
      email: string;
      status: AccountStatus;
    };
  };
  vets: Array<{
    vet: DetailVetBase & {
      user: {
        email: string;
        status: AccountStatus;
      };
    };
  }>;
  appointments: DetailAppointment[];
  records: DetailMedicalRecord[];
  reminders: DetailReminder[];
};

type DetailPetBase = {
  id: string;
  name: string;
  species: string;
  breed?: string | null;
  sex: PetSex;
  birthDate?: string | null;
  weightKg?: string | number | null;
  notes?: string | null;
};

type DetailOwnerBase = {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
};

type DetailVetBase = {
  id: string;
  clinicName: string;
  managerName?: string | null;
  phone?: string | null;
  address?: string | null;
  description?: string | null;
};

type DetailAppointment = {
  id: string;
  scheduledAt: string;
  status: AppointmentStatus;
  reason?: string | null;
  pet?: DetailPetBase;
  vet?: DetailVetBase;
};

type DetailMedicalRecord = {
  id: string;
  type: MedicalRecordType;
  recordDate: string;
  title: string;
  description: string;
  nextCheckAt?: string | null;
  pet?: DetailPetBase;
  vet?: DetailVetBase;
};

type DetailReminder = {
  id: string;
  type: ReminderType;
  status: ReminderStatus;
  title: string;
  description?: string | null;
  dueAt: string;
  pet?: DetailPetBase;
  vet?: DetailVetBase | null;
};

type AdminDetailResponse =
  | { type: 'vet'; vet: DetailVet }
  | { type: 'owner'; owner: DetailOwner }
  | { type: 'pet'; pet: DetailPet };

type AdminDashboard = {
  metrics: {
    totalUsers: number;
    totalOwners: number;
    totalVets: number;
    totalPets: number;
    totalAppointments: number;
    pendingAppointments: number;
    pendingReminders: number;
    pendingOwnerAccounts: number;
    totalConversations: number;
  };
  accounts: {
    owners: AccountUser[];
    vets: AccountUser[];
    admins: AccountUser[];
  };
  recentVets: Array<{
    id: string;
    clinicName: string;
    managerName?: string | null;
    phone?: string | null;
    user: {
      email: string;
      status: AccountStatus;
      createdAt: string;
    };
    _count: {
      pets: number;
      appointments: number;
    };
  }>;
  recentOwners: Array<{
    id: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    user: {
      email: string;
      status: AccountStatus;
      createdAt: string;
    };
    _count: {
      pets: number;
    };
  }>;
  recentPets: Array<{
    id: string;
    name: string;
    species: string;
    breed?: string | null;
    sex: 'MALE' | 'FEMALE' | 'UNKNOWN';
    owner: {
      firstName: string;
      lastName: string;
    };
    _count: {
      vets: number;
      records: number;
      appointments: number;
    };
  }>;
  upcomingAppointments: Array<{
    id: string;
    scheduledAt: string;
    status: 'REQUESTED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
    pet: {
      name: string;
    };
    vet: {
      clinicName: string;
    };
  }>;
  recentReminders: Array<{
    id: string;
    type: ReminderType;
    status: ReminderStatus;
    title: string;
    dueAt: string;
    pet: {
      name: string;
    };
    vet?: {
      clinicName: string;
    } | null;
  }>;
  recentAuditLogs: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId?: string | null;
    entityName?: string | null;
    summary: string;
    createdAt: string;
    actor?: {
      email: string;
      role: 'OWNER' | 'VET' | 'ADMIN';
    } | null;
  }>;
};

type SetupStatus = {
  status: 'ready' | 'setup_required';
  database: {
    configured: boolean;
    connected: boolean;
    migrationsApplied: boolean;
    hasAdmin: boolean;
    error: string | null;
  };
  needsDatabase: boolean;
  needsMigrations: boolean;
  needsAdmin: boolean;
};

const sections: Array<{
  label: string;
  description: string;
  icon: AdminIconKind;
  value: Exclude<AdminSection, 'dashboard' | 'detail'>;
  metricKey?: keyof AdminDashboard['metrics'];
}> = [
  {
    label: 'Resumen',
    description: 'Metricas y actividad',
    icon: 'overview',
    value: 'overview',
    metricKey: 'totalUsers',
  },
  {
    label: 'Veterinarios/as',
    description: 'Profesionales y clínicas',
    icon: 'vet',
    value: 'vets',
    metricKey: 'totalVets',
  },
  {
    label: 'Usuarios',
    description: 'Cuentas por rol',
    icon: 'users',
    value: 'users',
    metricKey: 'totalUsers',
  },
  {
    label: 'Agenda',
    description: 'Calendario de turnos',
    icon: 'agenda',
    value: 'appointments',
    metricKey: 'totalAppointments',
  },
  {
    label: 'Recordatorios',
    description: 'Pendientes y completados',
    icon: 'reminders',
    value: 'reminders',
    metricKey: 'pendingReminders',
  },
  {
    label: 'Horarios',
    description: 'Semana, sabado y domingo',
    icon: 'schedule',
    value: 'schedule',
  },
  {
    label: 'Extensiones',
    description: 'Modulos opcionales',
    icon: 'extensions',
    value: 'extensions',
  },
  {
    label: 'Auditoría',
    description: 'Cambios y responsables',
    icon: 'audit',
    value: 'audit',
  },
  {
    label: 'Sistema',
    description: 'API, MySQL y servidor',
    icon: 'system',
    value: 'system',
  },
  {
    label: 'Alta vet',
    description: 'Crear acceso profesional',
    icon: 'add',
    value: 'create-vet',
  },
];
const adminWeekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export default function AdminScreen() {
  const { isAllowed } = useRequireRole(['ADMIN']);
  const apiUrl = useApiConfigStore((state) => state.apiUrl);
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const scheduleQuery = useSchedule();
  const updateSchedule = useUpdateSchedule();
  const setupStatusQuery = useQuery({
    queryKey: ['setup-status'],
    queryFn: () => apiRequest<SetupStatus>('/setup/status', { token: accessToken }),
    enabled: Boolean(accessToken && isAllowed),
  });
  const dashboardQuery = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () =>
      apiRequest<AdminDashboard>('/admin/dashboard', { token: accessToken }),
    enabled: Boolean(accessToken && isAllowed),
  });
  const extensionsQuery = useQuery({
    queryKey: ['admin-extensions'],
    queryFn: () => apiRequest<AdminExtension[]>('/admin/extensions', { token: accessToken }),
    enabled: Boolean(accessToken && isAllowed),
  });
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [detailTarget, setDetailTarget] = useState<AdminDetailTarget | null>(null);
  const detailQuery = useQuery({
    queryKey: ['admin-detail', detailTarget?.type, detailTarget?.id],
    queryFn: () => {
      if (!detailTarget) {
        throw new Error('Detalle no seleccionado.');
      }

      const detailPath =
        detailTarget.type === 'vet'
          ? 'vets'
          : detailTarget.type === 'owner'
            ? 'owners'
            : 'pets';

      return apiRequest<AdminDetailResponse>(`/admin/${detailPath}/${detailTarget.id}`, {
        token: accessToken,
      });
    },
    enabled: Boolean(accessToken && isAllowed && detailTarget),
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  function openDetail(target: AdminDetailTarget) {
    setDetailTarget(target);
    setActiveSection('detail');
  }

  function closeDetail() {
    setDetailTarget(null);
    setActiveSection('dashboard');
  }

  async function handleCreateVet() {
    setIsSaving(true);
    setStatus(null);
    setIsError(false);

    if (!email.trim() || !password || !clinicName.trim()) {
      setStatus('Email, contraseña y nombre profesional o clínica son obligatorios.');
      setIsError(true);
      setIsSaving(false);
      return;
    }

    try {
      await apiRequest('/admin/vets', {
        method: 'POST',
        token: accessToken,
        body: {
          email: email.trim(),
          password,
          clinicName: clinicName.trim(),
          managerName: managerName.trim() || undefined,
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
        },
      });

      setStatus('Veterinario/a creado correctamente.');
      setEmail('');
      setPassword('');
      setClinicName('');
      setManagerName('');
      setPhone('');
      setAddress('');
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      setActiveSection('vets');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo crear el veterinario/a.');
      setIsError(true);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateUserStatus(userId: string, nextStatus: AccountStatus) {
    setUpdatingUserId(userId);

    try {
      await apiRequest(`/admin/users/${userId}/status`, {
        method: 'PATCH',
        token: accessToken,
        body: { status: nextStatus },
      });

      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    } finally {
      setUpdatingUserId(null);
    }
  }

  async function handleUpdateExtension(key: string, nextStatus: ExtensionStatus) {
    await apiRequest(`/admin/extensions/${key}`, {
      method: 'PATCH',
      token: accessToken,
      body: { status: nextStatus },
    });

    queryClient.invalidateQueries({ queryKey: ['admin-extensions'] });
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
  }

  async function handleUploadExtension() {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ['application/json', 'application/zip', 'application/x-zip-compressed'],
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    const formData = new FormData();

    if (asset.file) {
      formData.append('extension', asset.file, asset.name);
    } else {
      formData.append(
        'extension',
        {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType ?? 'application/octet-stream',
        } as unknown as Blob,
      );
    }

    await apiUploadRequest('/admin/extensions/upload', formData, { token: accessToken });
    queryClient.invalidateQueries({ queryKey: ['admin-extensions'] });
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
  }

  if (!isAllowed) {
    return (
      <Screen>
        <Card>
          <SectionTitle>Acceso administrador requerido</SectionTitle>
          <Muted>Inicia sesion como administrador para ver esta pantalla.</Muted>
        </Card>
      </Screen>
    );
  }

  const dashboard = dashboardQuery.data;

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View style={styles.headerBlock}>
          <Text style={styles.kicker}>Administrador</Text>
          <Text style={styles.title}>Centro operativo</Text>
          <Muted>Accesos grandes para operar rapido desde el celular.</Muted>
        </View>
        <SessionMenu onSystemConfig={() => setActiveSection('system')} />
      </View>

      {dashboardQuery.isLoading ? (
        <Card>
          <SectionTitle>Cargando panel</SectionTitle>
          <Muted>Consultando metricas y actividad reciente.</Muted>
        </Card>
      ) : null}

      {dashboardQuery.error ? (
        <Card>
          <SectionTitle>No se pudo cargar administracion</SectionTitle>
          <Muted>Verifica que la API este corriendo y que la cuenta sea ADMIN.</Muted>
        </Card>
      ) : null}

      {dashboard ? (
        <>
          {activeSection === 'dashboard' ? (
            <DashboardLauncher
              dashboard={dashboard}
              onSelect={(section) => setActiveSection(section)}
            />
          ) : null}
          {activeSection === 'overview' ? (
            <Overview
              dashboard={dashboard}
              onBack={() => setActiveSection('dashboard')}
              onOpenDetail={openDetail}
            />
          ) : null}
          {activeSection === 'vets' ? (
            <VetsSection
              dashboard={dashboard}
              onBack={() => setActiveSection('dashboard')}
              onCreateVet={() => setActiveSection('create-vet')}
              onOpenDetail={openDetail}
            />
          ) : null}
          {activeSection === 'users' ? (
            <UsersSection
              dashboard={dashboard}
              onBack={() => setActiveSection('dashboard')}
              onOpenDetail={openDetail}
              onUpdateStatus={handleUpdateUserStatus}
              updatingUserId={updatingUserId}
            />
          ) : null}
          {activeSection === 'appointments' ? (
            <AppointmentsSection
              dashboard={dashboard}
              onBack={() => setActiveSection('dashboard')}
            />
          ) : null}
          {activeSection === 'reminders' ? (
            <RemindersSection
              dashboard={dashboard}
              onBack={() => setActiveSection('dashboard')}
            />
          ) : null}
          {activeSection === 'schedule' ? (
            <ScheduleSection
              isSaving={updateSchedule.isPending}
              onBack={() => setActiveSection('dashboard')}
              onSave={(settings) => updateSchedule.mutate(settings)}
              schedule={scheduleQuery.data ?? defaultSchedule}
            />
          ) : null}
          {activeSection === 'extensions' ? (
            <ExtensionsSection
              extensions={extensionsQuery.data ?? []}
              isLoading={extensionsQuery.isLoading}
              onBack={() => setActiveSection('dashboard')}
              onRefresh={() => extensionsQuery.refetch()}
              onUpload={handleUploadExtension}
              onUpdate={handleUpdateExtension}
            />
          ) : null}
          {activeSection === 'audit' ? (
            <AuditSection
              dashboard={dashboard}
              onBack={() => setActiveSection('dashboard')}
            />
          ) : null}
          {activeSection === 'system' ? (
            <SystemSection
              accessToken={accessToken}
              apiUrl={apiUrl}
              isLoading={setupStatusQuery.isLoading}
              onBack={() => setActiveSection('dashboard')}
              onRefresh={async () => {
                const result = await setupStatusQuery.refetch();

                if (result.error) {
                  throw result.error;
                }

                return result.data;
              }}
              setupStatus={setupStatusQuery.data}
              statusError={setupStatusQuery.error}
            />
          ) : null}
          {activeSection === 'detail' ? (
            <AdminDetailSection
              detail={detailQuery.data}
              error={detailQuery.error}
              isLoading={detailQuery.isLoading}
              onBack={closeDetail}
            />
          ) : null}
        </>
      ) : null}

      {activeSection === 'create-vet' ? (
        <SectionShell title="Alta de veterinario/a" onBack={() => setActiveSection('dashboard')}>
          <Muted>
            Los veterinarios/as no se registran desde el acceso público. Se crean desde
            administración.
          </Muted>
          <View style={styles.form}>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="Email de acceso"
              style={styles.input}
              value={email}
            />
            <TextInput
              onChangeText={setPassword}
              placeholder="Contrasena min. 8 caracteres"
              secureTextEntry
              style={styles.input}
              value={password}
            />
            <TextInput
              onChangeText={setClinicName}
              placeholder="Nombre profesional o clínica"
              style={styles.input}
              value={clinicName}
            />
            <TextInput
              onChangeText={setManagerName}
              placeholder="Responsable opcional"
              style={styles.input}
              value={managerName}
            />
            <TextInput
              keyboardType="phone-pad"
              onChangeText={setPhone}
              placeholder="Telefono opcional"
              style={styles.input}
              value={phone}
            />
            <TextInput
              onChangeText={setAddress}
              placeholder="Direccion opcional"
              style={styles.input}
              value={address}
            />
          </View>
          {status ? (
            <Text style={[styles.status, isError && styles.statusError]}>{status}</Text>
          ) : null}
          <Pressable
            disabled={isSaving}
            onPress={handleCreateVet}
            style={[styles.button, isSaving && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>
              {isSaving ? 'Creando...' : 'Crear veterinario/a'}
            </Text>
          </Pressable>
          <Pressable
            disabled={isSaving}
            onPress={() => setActiveSection('dashboard')}
            style={[styles.secondaryButton, isSaving && styles.buttonDisabled]}
          >
            <Text style={styles.secondaryButtonText}>Cancelar</Text>
          </Pressable>
        </SectionShell>
      ) : null}
    </Screen>
  );
}

function DashboardLauncher({
  dashboard,
  onSelect,
}: {
  dashboard: AdminDashboard;
  onSelect: (section: Exclude<AdminSection, 'dashboard' | 'detail'>) => void;
}) {
  return (
    <>
      <View style={styles.tileGrid}>
        {sections.map((section) => (
          <Pressable
            key={section.value}
            onPress={() => onSelect(section.value)}
            style={styles.tile}
          >
            <View style={styles.tileTop}>
              <View style={styles.iconCircle}>
                <AdminIcon kind={section.icon} />
              </View>
              {section.metricKey ? (
                <Text style={styles.tileMetric}>{dashboard.metrics[section.metricKey]}</Text>
              ) : null}
            </View>
            <Text style={styles.tileTitle}>{section.label}</Text>
            <Text style={styles.tileDescription}>{section.description}</Text>
          </Pressable>
        ))}
      </View>

      <Card>
        <View style={styles.cardTitleRow}>
          <View style={styles.smallIconCircle}>
            <AlertIcon />
          </View>
          <SectionTitle>Alertas operativas</SectionTitle>
        </View>
        <View style={styles.alertRow}>
          <Badge>{dashboard.metrics.pendingOwnerAccounts} propietarios pendientes</Badge>
          <Badge>{dashboard.metrics.pendingAppointments} turnos pendientes</Badge>
          <Badge>{dashboard.metrics.pendingReminders} recordatorios</Badge>
        </View>
        <Muted>
          Entra a Agenda para revisar turnos por dia. Usa Recordatorios para controles
          pendientes.
        </Muted>
      </Card>
    </>
  );
}

function AlertIcon() {
  return <TriangleAlert color={colors.warning} size={22} strokeWidth={2.4} />;
}

function AdminIcon({ kind }: { kind: AdminIconKind }) {
  if (kind === 'overview') {
    return <ChartColumn color={colors.primaryDark} size={28} strokeWidth={2.4} />;
  }

  if (kind === 'vet') {
    return <Stethoscope color={colors.primaryDark} size={29} strokeWidth={2.4} />;
  }

  if (kind === 'users') {
    return <UsersRound color={colors.primaryDark} size={29} strokeWidth={2.4} />;
  }

  if (kind === 'agenda') {
    return <CalendarDays color={colors.primaryDark} size={29} strokeWidth={2.4} />;
  }

  if (kind === 'reminders') {
    return <Bell color={colors.primaryDark} size={29} strokeWidth={2.4} />;
  }

  if (kind === 'schedule') {
    return <Clock color={colors.primaryDark} size={29} strokeWidth={2.4} />;
  }

  if (kind === 'extensions') {
    return <ShieldCheck color={colors.primaryDark} size={29} strokeWidth={2.4} />;
  }

  if (kind === 'audit') {
    return <History color={colors.primaryDark} size={29} strokeWidth={2.4} />;
  }

  if (kind === 'system') {
    return <ServerCog color={colors.primaryDark} size={29} strokeWidth={2.4} />;
  }

  return <UserPlus color={colors.primaryDark} size={29} strokeWidth={2.4} />;
}

function SectionShell({
  title,
  children,
  onBack,
}: {
  title: string;
  children: ReactNode;
  onBack: () => void;
}) {
  return (
    <Card>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>Volver al panel</Text>
      </Pressable>
      <SectionTitle>{title}</SectionTitle>
      {children}
    </Card>
  );
}

function ExtensionsSection({
  extensions,
  isLoading,
  onBack,
  onRefresh,
  onUpload,
  onUpdate,
}: {
  extensions: AdminExtension[];
  isLoading: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onUpload: () => Promise<void>;
  onUpdate: (key: string, status: ExtensionStatus) => Promise<void>;
}) {
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const categories = Array.from(new Set(extensions.map((extension) => extension.category)));

  async function handleUpdate(extension: AdminExtension, status: ExtensionStatus) {
    setUpdatingKey(extension.key);
    setMessage(null);
    setError(null);

    try {
      await onUpdate(extension.key, status);
      setMessage(`${extension.name}: ${extensionStatusLabel(status)}.`);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'No se pudo actualizar la extension.',
      );
    } finally {
      setUpdatingKey(null);
    }
  }

  async function handleUpload() {
    setIsUploading(true);
    setMessage(null);
    setError(null);

    try {
      await onUpload();
      setMessage('Extension subida. Quedo instalada y desactivada por defecto.');
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : 'No se pudo subir la extension.',
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <SectionShell title="Extensiones" onBack={onBack}>
      <Muted>
        Sube paquetes de extension en formato .json o .zip. El sistema lee el manifiesto,
        registra la extension y la deja desactivada hasta que la actives manualmente.
      </Muted>

      <View style={styles.inlineActions}>
        <Pressable
          disabled={isUploading}
          onPress={handleUpload}
          style={[styles.button, isUploading && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>
            {isUploading ? 'Subiendo...' : 'Subir extension'}
          </Text>
        </Pressable>
        <Pressable onPress={onRefresh} style={styles.secondaryButton}>
          <RefreshCcw color={colors.text} size={18} strokeWidth={2.4} />
          <Text style={styles.secondaryButtonText}>
            {isLoading ? 'Actualizando...' : 'Actualizar'}
          </Text>
        </Pressable>
      </View>

      {message ? <Text style={styles.status}>{message}</Text> : null}
      {error ? <Text style={styles.statusError}>{error}</Text> : null}
      {isLoading ? <Muted>Cargando extensiones disponibles.</Muted> : null}
      {!isLoading && extensions.length === 0 ? (
        <Muted>No hay extensiones instaladas. Sube un paquete para registrarlo.</Muted>
      ) : null}

      {categories.map((category) => (
        <View key={category} style={styles.detailBlock}>
          <SectionTitle>{category}</SectionTitle>
          {extensions
            .filter((extension) => extension.category === category)
            .map((extension) => (
              <View key={extension.key} style={styles.row}>
                <View style={styles.rowHeader}>
                  <View style={styles.accountTitle}>
                    <SmallStatusIcon status={extension.status} />
                    <Text style={styles.rowTitle}>{extension.name}</Text>
                  </View>
                  <Badge>{extensionStatusLabel(extension.status)}</Badge>
                </View>
                <Muted>
                  {extension.description} Version {extension.version}
                </Muted>
                <Muted>
                  {extension.requiresExternalService
                    ? 'Requiere servicio externo/configuracion adicional.'
                    : 'Funciona con la instalacion local.'}
                </Muted>

                <View style={styles.inlineActions}>
                  <Pressable
                    disabled={updatingKey === extension.key}
                    onPress={() => handleUpdate(extension, 'ACTIVE')}
                    style={[
                      styles.secondaryButton,
                      extension.status === 'ACTIVE' && styles.buttonDisabled,
                    ]}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {extension.isInstalled ? 'Activar' : 'Instalar'}
                    </Text>
                  </Pressable>
                  <Pressable
                    disabled={updatingKey === extension.key}
                    onPress={() => handleUpdate(extension, 'INACTIVE')}
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryButtonText}>Desactivar</Text>
                  </Pressable>
                  {extension.requiresExternalService ? (
                    <Pressable
                      disabled={updatingKey === extension.key}
                      onPress={() => handleUpdate(extension, 'NEEDS_CONFIGURATION')}
                      style={styles.secondaryButton}
                    >
                      <Text style={styles.secondaryButtonText}>Config. pendiente</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
        </View>
      ))}
    </SectionShell>
  );
}

function SystemSection({
  accessToken,
  apiUrl,
  isLoading,
  onBack,
  onRefresh,
  setupStatus,
  statusError,
}: {
  accessToken: string | null;
  apiUrl: string | null;
  isLoading: boolean;
  onBack: () => void;
  onRefresh: () => Promise<SetupStatus | undefined>;
  setupStatus?: SetupStatus;
  statusError: Error | null;
}) {
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('3306');
  const [database, setDatabase] = useState('choninovet');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isSavingDatabase, setIsSavingDatabase] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [databaseError, setDatabaseError] = useState<string | null>(null);
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const canSubmitDatabase = confirmation.trim().toUpperCase() === 'CAMBIAR BASE';

  async function handleRefreshConnection() {
    setConnectionMessage(null);
    setConnectionError(null);

    try {
      const nextStatus = await onRefresh();

      if (nextStatus?.database.connected && nextStatus.database.migrationsApplied) {
        setConnectionMessage('Conexión verificada correctamente.');
        return;
      }

      if (nextStatus?.database.error) {
        setConnectionError(nextStatus.database.error);
        return;
      }

      setConnectionError('La API respondió, pero la base todavía no está lista.');
    } catch (error) {
      setConnectionError(
        error instanceof Error ? error.message : 'No se pudo probar la conexión.',
      );
    }
  }

  async function handleConfigureDatabase() {
    setStatusMessage(null);
    setDatabaseError(null);

    if (!canSubmitDatabase) {
      setDatabaseError('Escribe CAMBIAR BASE para confirmar.');
      return;
    }

    setIsSavingDatabase(true);

    try {
      await apiRequest('/setup/database', {
        method: 'POST',
        token: accessToken,
        body: {
          host: host.trim(),
          port: Number(port),
          database: database.trim(),
          username: username.trim(),
          password,
        },
      });

      setPassword('');
      setConfirmation('');
      setStatusMessage('Base configurada. Reinicia la API para usar la nueva conexión en toda la app.');
      void onRefresh();
    } catch (error) {
      setDatabaseError(
        error instanceof Error ? error.message : 'No se pudo configurar la base.',
      );
    } finally {
      setIsSavingDatabase(false);
    }
  }

  return (
    <SectionShell title="Configuración del sistema" onBack={onBack}>
      <View style={styles.systemStatusGrid}>
        <SystemStatusCard
          icon={<ServerCog color={colors.primaryDark} size={24} strokeWidth={2.4} />}
          label="API configurada"
          status={apiUrl ? 'Conectada' : 'Sin configurar'}
          tone={apiUrl ? 'ok' : 'warning'}
          value={apiUrl ?? 'No hay URL guardada'}
        />
        <SystemStatusCard
          icon={<Database color={colors.primaryDark} size={24} strokeWidth={2.4} />}
          label="MySQL"
          status={
            setupStatus?.database.connected
              ? 'Conectado'
              : setupStatus?.database.configured
                ? 'Con error'
                : 'Sin configurar'
          }
          tone={setupStatus?.database.connected ? 'ok' : 'warning'}
          value={
            setupStatus?.database.error ??
            (setupStatus?.database.connected
              ? 'La API pudo consultar la base.'
              : 'Consulta el estado para verificar conexión.')
          }
        />
      </View>

      <View style={styles.inlineActions}>
        <Pressable onPress={handleRefreshConnection} style={styles.secondaryButton}>
          <RefreshCcw color={colors.text} size={18} strokeWidth={2.4} />
          <Text style={styles.secondaryButtonText}>
            {isLoading ? 'Probando...' : 'Probar conexión'}
          </Text>
        </Pressable>
      </View>

      {statusError ? (
        <Text style={styles.statusError}>No se pudo consultar setup: {statusError.message}</Text>
      ) : null}

      {connectionMessage ? <Text style={styles.status}>{connectionMessage}</Text> : null}
      {connectionError ? <Text style={styles.statusError}>{connectionError}</Text> : null}

      {setupStatus ? (
        <View style={styles.systemChecklist}>
          <SystemCheck label="Base configurada" value={setupStatus.database.configured} />
          <SystemCheck label="Conexión MySQL" value={setupStatus.database.connected} />
          <SystemCheck label="Migraciones aplicadas" value={setupStatus.database.migrationsApplied} />
          <SystemCheck label="Administrador inicial" value={setupStatus.database.hasAdmin} />
        </View>
      ) : null}

      <View style={styles.warningCard}>
        <SectionTitle>Cambiar base de datos</SectionTitle>
        <Muted>
          Acción avanzada. Cambia la conexión MySQL del servidor API. El password no se
          muestra ni se lista en pantalla. Después de guardar, reinicia la API.
        </Muted>

        <View style={styles.form}>
          <TextInput
            autoCapitalize="none"
            onChangeText={setHost}
            placeholder="Host MySQL"
            style={styles.input}
            value={host}
          />
          <TextInput
            keyboardType="numeric"
            onChangeText={setPort}
            placeholder="Puerto"
            style={styles.input}
            value={port}
          />
          <TextInput
            autoCapitalize="none"
            onChangeText={setDatabase}
            placeholder="Nombre de base"
            style={styles.input}
            value={database}
          />
          <TextInput
            autoCapitalize="none"
            onChangeText={setUsername}
            placeholder="Usuario MySQL"
            style={styles.input}
            value={username}
          />
          <TextInput
            onChangeText={setPassword}
            placeholder="Password MySQL"
            secureTextEntry
            style={styles.input}
            value={password}
          />
          <TextInput
            autoCapitalize="characters"
            onChangeText={setConfirmation}
            placeholder="Escribe CAMBIAR BASE"
            style={styles.input}
            value={confirmation}
          />
        </View>

        {databaseError ? <Text style={styles.statusError}>{databaseError}</Text> : null}
        {statusMessage ? <Text style={styles.status}>{statusMessage}</Text> : null}

        <Pressable
          disabled={isSavingDatabase}
          onPress={handleConfigureDatabase}
          style={[styles.dangerOutlineButton, isSavingDatabase && styles.buttonDisabled]}
        >
          <Text style={styles.dangerOutlineText}>
            {isSavingDatabase ? 'Validando y migrando...' : 'Cambiar base de datos'}
          </Text>
        </Pressable>
      </View>
    </SectionShell>
  );
}

function SystemStatusCard({
  icon,
  label,
  status,
  tone,
  value,
}: {
  icon: ReactNode;
  label: string;
  status: string;
  tone: 'ok' | 'warning';
  value: string;
}) {
  return (
    <View style={styles.systemStatusCard}>
      <View style={styles.rowHeader}>
        {icon}
        <Text style={styles.rowTitle}>{label}</Text>
      </View>
      <Text style={[styles.systemStatusPill, tone === 'warning' && styles.systemStatusWarning]}>
        {status}
      </Text>
      <Muted>{value}</Muted>
    </View>
  );
}

function SystemCheck({ label, value }: { label: string; value: boolean }) {
  return (
    <View style={styles.systemCheckRow}>
      {value ? (
        <CheckCircle color={colors.primaryDark} size={18} strokeWidth={2.4} />
      ) : (
        <XCircle color={colors.warning} size={18} strokeWidth={2.4} />
      )}
      <Text style={styles.systemCheckText}>{label}</Text>
    </View>
  );
}

function DetailButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.detailButton}>
      <Eye color={colors.primaryDark} size={18} strokeWidth={2.4} />
      <Text style={styles.detailButtonText}>Ver detalle</Text>
    </Pressable>
  );
}

function ActionEmptyState({
  actionLabel,
  onAction,
  text,
}: {
  actionLabel: string;
  onAction: () => void;
  text: string;
}) {
  return (
    <View style={styles.actionEmptyState}>
      <Muted>{text}</Muted>
      <Pressable onPress={onAction} style={styles.actionEmptyButton}>
        <Text style={styles.actionEmptyButtonText}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

function InfoLine({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return (
    <Muted>
      {label}: {value}
    </Muted>
  );
}

function AdminDetailSection({
  detail,
  error,
  isLoading,
  onBack,
}: {
  detail?: AdminDetailResponse;
  error: Error | null;
  isLoading: boolean;
  onBack: () => void;
}) {
  if (isLoading) {
    return (
      <SectionShell title="Detalle administrativo" onBack={onBack}>
        <Muted>Cargando informacion asociada.</Muted>
      </SectionShell>
    );
  }

  if (error || !detail) {
    return (
      <SectionShell title="Detalle administrativo" onBack={onBack}>
        <Muted>No se pudo cargar el detalle seleccionado.</Muted>
      </SectionShell>
    );
  }

  if (detail.type === 'vet') {
    return <VetDetailSection onBack={onBack} vet={detail.vet} />;
  }

  if (detail.type === 'owner') {
    return <OwnerDetailSection onBack={onBack} owner={detail.owner} />;
  }

  return <PetDetailSection onBack={onBack} pet={detail.pet} />;
}

function VetDetailSection({ onBack, vet }: { onBack: () => void; vet: DetailVet }) {
  return (
    <SectionShell title={vet.clinicName} onBack={onBack}>
      <View style={styles.rowHeader}>
        <View style={styles.accountTitle}>
          <SmallRoleIcon role="VET" />
          <Text style={styles.rowTitle}>Ficha de veterinario/a</Text>
        </View>
        <StatusBadge status={vet.user.status} />
      </View>
      <InfoLine label="Email" value={vet.user.email} />
      <InfoLine label="Responsable" value={vet.managerName} />
      <InfoLine label="Telefono" value={vet.phone} />
      <InfoLine label="Direccion" value={vet.address} />
      <InfoLine label="Descripcion" value={vet.description} />

      <View style={styles.metrics}>
        <Metric label="Pacientes" value={vet._count.pets} />
        <Metric label="Turnos" value={vet._count.appointments} />
        <Metric label="Historiales" value={vet._count.records} />
        <Metric label="Recordatorios" value={vet._count.reminders} />
      </View>

      <DetailList title="Pacientes asociados" emptyText="No tiene pacientes asociados.">
        {vet.pets.map(({ pet }) => (
          <View key={pet.id} style={styles.row}>
            <View style={styles.rowHeader}>
              <Text style={styles.rowTitle}>{pet.name}</Text>
              <Badge>{petSexLabel(pet.sex)}</Badge>
            </View>
            <Muted>
              {pet.species}
              {pet.breed ? ` - ${pet.breed}` : ''} - {pet.owner.firstName} {pet.owner.lastName}
            </Muted>
            <Muted>
              Turnos: {pet._count.appointments} - Historial: {pet._count.records} - Recordatorios:{' '}
              {pet._count.reminders}
            </Muted>
          </View>
        ))}
      </DetailList>

      <AppointmentsList appointments={vet.appointments} />
      <MedicalRecordsList records={vet.records} />
      <RemindersList reminders={vet.reminders} />
    </SectionShell>
  );
}

function OwnerDetailSection({ onBack, owner }: { onBack: () => void; owner: DetailOwner }) {
  return (
    <SectionShell title={`${owner.firstName} ${owner.lastName}`} onBack={onBack}>
      <View style={styles.rowHeader}>
        <View style={styles.accountTitle}>
          <SmallRoleIcon role="OWNER" />
          <Text style={styles.rowTitle}>Ficha de propietario</Text>
        </View>
        <StatusBadge status={owner.user.status} />
      </View>
      <InfoLine label="Email" value={owner.user.email} />
      <InfoLine label="Telefono" value={owner.phone} />

      <View style={styles.metrics}>
        <Metric label="Mascotas" value={owner._count.pets} />
      </View>

      <DetailList title="Mascotas del propietario" emptyText="No tiene mascotas registradas.">
        {owner.pets.map((pet) => (
          <View key={pet.id} style={styles.row}>
            <View style={styles.rowHeader}>
              <Text style={styles.rowTitle}>{pet.name}</Text>
              <Badge>{petSexLabel(pet.sex)}</Badge>
            </View>
            <Muted>
              {pet.species}
              {pet.breed ? ` - ${pet.breed}` : ''}
            </Muted>
            <Muted>
              Veterinarios/as: {pet._count.vets} - Turnos: {pet._count.appointments} - Historial:{' '}
              {pet._count.records} - Recordatorios: {pet._count.reminders}
            </Muted>
            {pet.vets.length > 0 ? (
              <Muted>
                Atendida por: {pet.vets.map(({ vet }) => vet.clinicName).join(', ')}
              </Muted>
            ) : null}
          </View>
        ))}
      </DetailList>

      <AppointmentsList appointments={owner.pets.flatMap((pet) => pet.appointments)} />
      <MedicalRecordsList records={owner.pets.flatMap((pet) => pet.records)} />
      <RemindersList reminders={owner.pets.flatMap((pet) => pet.reminders)} />
    </SectionShell>
  );
}

function PetDetailSection({ onBack, pet }: { onBack: () => void; pet: DetailPet }) {
  return (
    <SectionShell title={pet.name} onBack={onBack}>
      <View style={styles.rowHeader}>
        <View style={styles.accountTitle}>
          <SmallRoleIcon role="OWNER" />
          <Text style={styles.rowTitle}>Ficha de paciente</Text>
        </View>
        <Badge>{petSexLabel(pet.sex)}</Badge>
      </View>
      <InfoLine label="Especie" value={pet.species} />
      <InfoLine label="Raza" value={pet.breed} />
      <InfoLine label="Fecha de nacimiento" value={pet.birthDate ? formatDateOnly(pet.birthDate) : null} />
      <InfoLine label="Peso kg" value={pet.weightKg} />
      <InfoLine label="Notas" value={pet.notes} />
      <InfoLine label="Propietario" value={`${pet.owner.firstName} ${pet.owner.lastName}`} />
      <InfoLine label="Email propietario" value={pet.owner.user.email} />

      <DetailList title="Veterinarios/as asociados" emptyText="No tiene veterinarios/as asociados.">
        {pet.vets.map(({ vet }) => (
          <View key={vet.id} style={styles.row}>
            <Text style={styles.rowTitle}>{vet.clinicName}</Text>
            <Muted>{vet.user.email}</Muted>
            <InfoLine label="Responsable" value={vet.managerName} />
            <InfoLine label="Telefono" value={vet.phone} />
          </View>
        ))}
      </DetailList>

      <AppointmentsList appointments={pet.appointments} />
      <MedicalRecordsList records={pet.records} />
      <RemindersList reminders={pet.reminders} />
    </SectionShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Muted>{label}</Muted>
    </View>
  );
}

function DetailList({
  children,
  emptyText,
  title,
}: {
  children: ReactNode;
  emptyText: string;
  title: string;
}) {
  const itemCount = Array.isArray(children) ? children.length : children ? 1 : 0;

  return (
    <View style={styles.detailBlock}>
      <SectionTitle>{title}</SectionTitle>
      {itemCount === 0 ? <Muted>{emptyText}</Muted> : children}
    </View>
  );
}

function AppointmentsList({ appointments }: { appointments: DetailAppointment[] }) {
  return (
    <DetailList title="Turnos asociados" emptyText="No hay turnos asociados.">
      {appointments.map((appointment) => (
        <View key={appointment.id} style={styles.row}>
          <View style={styles.rowHeader}>
            <Text style={styles.rowTitle}>
              {appointment.pet?.name ?? appointment.vet?.clinicName ?? 'Turno'}
            </Text>
            <Badge>{appointmentStatusLabel(appointment.status)}</Badge>
          </View>
          <Muted>{formatDate(appointment.scheduledAt)}</Muted>
          <InfoLine label="Veterinario/a" value={appointment.vet?.clinicName} />
          <InfoLine label="Motivo" value={appointment.reason} />
        </View>
      ))}
    </DetailList>
  );
}

function MedicalRecordsList({ records }: { records: DetailMedicalRecord[] }) {
  return (
    <DetailList title="Historial asociado" emptyText="No hay historial asociado.">
      {records.map((record) => (
        <View key={record.id} style={styles.row}>
          <View style={styles.rowHeader}>
            <Text style={styles.rowTitle}>{record.title}</Text>
            <Badge>{medicalRecordTypeLabel(record.type)}</Badge>
          </View>
          <Muted>{formatDateOnly(record.recordDate)}</Muted>
          <InfoLine label="Paciente" value={record.pet?.name} />
          <InfoLine label="Veterinario/a" value={record.vet?.clinicName} />
          <Text style={styles.description}>{record.description}</Text>
          <InfoLine
            label="Proximo control"
            value={record.nextCheckAt ? formatDateOnly(record.nextCheckAt) : null}
          />
        </View>
      ))}
    </DetailList>
  );
}

function RemindersList({ reminders }: { reminders: DetailReminder[] }) {
  return (
    <DetailList title="Recordatorios asociados" emptyText="No hay recordatorios asociados.">
      {reminders.map((reminder) => (
        <View key={reminder.id} style={styles.row}>
          <View style={styles.rowHeader}>
            <Text style={styles.rowTitle}>{reminder.title}</Text>
            <Badge>{reminderStatusLabel(reminder.status)}</Badge>
          </View>
          <Muted>
            {reminderTypeLabel(reminder.type)} - {formatDate(reminder.dueAt)}
          </Muted>
          <InfoLine label="Paciente" value={reminder.pet?.name} />
          <InfoLine label="Veterinario/a" value={reminder.vet?.clinicName} />
          <InfoLine label="Descripcion" value={reminder.description} />
        </View>
      ))}
    </DetailList>
  );
}

function Overview({
  dashboard,
  onBack,
  onOpenDetail,
}: {
  dashboard: AdminDashboard;
  onBack: () => void;
  onOpenDetail: (target: AdminDetailTarget) => void;
}) {
  const [petQuery, setPetQuery] = useState('');
  const metrics = [
    { label: 'Usuarios', value: dashboard.metrics.totalUsers },
    { label: 'Dueños', value: dashboard.metrics.totalOwners },
    { label: 'Veterinarios/as', value: dashboard.metrics.totalVets },
    { label: 'Mascotas', value: dashboard.metrics.totalPets },
    { label: 'Propietarios pendientes', value: dashboard.metrics.pendingOwnerAccounts },
    { label: 'Turnos', value: dashboard.metrics.totalAppointments },
    { label: 'Solicitudes', value: dashboard.metrics.pendingAppointments },
    { label: 'Recordatorios', value: dashboard.metrics.pendingReminders },
    { label: 'Conversaciones', value: dashboard.metrics.totalConversations },
  ];
  const pets = dashboard.recentPets.filter((pet) =>
    normalizeText(`${pet.name} ${pet.species} ${pet.breed ?? ''} ${pet.owner.firstName} ${pet.owner.lastName}`).includes(
      normalizeText(petQuery),
    ),
  );

  return (
    <SectionShell title="Resumen" onBack={onBack}>
      <View style={styles.metrics}>
        {metrics.map((metric) => (
          <View key={metric.label} style={styles.metricCard}>
            <Text style={styles.metricValue}>{metric.value}</Text>
            <Muted>{metric.label}</Muted>
          </View>
        ))}
      </View>

      <SectionTitle>Actividad reciente</SectionTitle>
      <TextInput
        onChangeText={setPetQuery}
        placeholder="Buscar mascota por nombre, especie o propietario"
        style={styles.input}
        value={petQuery}
      />
      {pets.length === 0 ? <Muted>No hay mascotas para esa busqueda.</Muted> : null}
      {pets.slice(0, 10).map((pet) => (
        <View key={pet.id} style={styles.row}>
          <Text style={styles.rowTitle}>{pet.name}</Text>
          <Muted>
            {pet.species} - {pet.owner.firstName} {pet.owner.lastName}
          </Muted>
          <DetailButton onPress={() => onOpenDetail({ id: pet.id, type: 'pet' })} />
        </View>
      ))}
    </SectionShell>
  );
}

function VetsSection({
  dashboard,
  onBack,
  onCreateVet,
  onOpenDetail,
}: {
  dashboard: AdminDashboard;
  onBack: () => void;
  onCreateVet: () => void;
  onOpenDetail: (target: AdminDetailTarget) => void;
}) {
  const [query, setQuery] = useState('');
  const vets = dashboard.recentVets.filter((vet) =>
    normalizeText(`${vet.clinicName} ${vet.managerName ?? ''} ${vet.phone ?? ''} ${vet.user.email}`).includes(
      normalizeText(query),
    ),
  );

  return (
    <SectionShell title="Veterinarios/as" onBack={onBack}>
      <TextInput
        onChangeText={setQuery}
        placeholder="Buscar por nombre, email o telefono"
        style={styles.input}
        value={query}
      />
      {vets.length === 0 ? (
        <ActionEmptyState
          actionLabel="Crear veterinario/a"
          onAction={onCreateVet}
          text={
            query.trim()
              ? 'No hay veterinarios/as para esa búsqueda.'
              : 'Todavía no hay veterinarios/as creados. Crea uno para habilitar turnos, pacientes y atención.'
          }
        />
      ) : null}
      {vets.map((vet) => (
        <VetRow
          key={vet.id}
          auditLogs={dashboard.recentAuditLogs}
          onOpenDetail={onOpenDetail}
          vet={vet}
        />
      ))}
    </SectionShell>
  );
}

function VetRow({
  auditLogs,
  onOpenDetail,
  vet,
}: {
  auditLogs: AdminDashboard['recentAuditLogs'];
  onOpenDetail: (target: AdminDetailTarget) => void;
  vet: AdminDashboard['recentVets'][number];
}) {
  const creationLog = auditLogs.find(
    (log) => log.action === 'VET_CREATED' && log.entityId === vet.id,
  );

  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.rowTitle}>{vet.clinicName}</Text>
        <Badge>{vet._count.pets} pacientes</Badge>
      </View>
      <Muted>{vet.user.email}</Muted>
      {vet.managerName ? <Muted>Responsable: {vet.managerName}</Muted> : null}
      {vet.phone ? <Muted>Telefono: {vet.phone}</Muted> : null}
      <Muted>Turnos registrados: {vet._count.appointments}</Muted>
      <Muted>Creada por: {creationLog?.actor?.email ?? 'Sin auditoría previa'}</Muted>
      <DetailButton onPress={() => onOpenDetail({ id: vet.id, type: 'vet' })} />
    </View>
  );
}

function UsersSection({
  dashboard,
  onBack,
  onOpenDetail,
  onUpdateStatus,
  updatingUserId,
}: {
  dashboard: AdminDashboard;
  onBack: () => void;
  onOpenDetail: (target: AdminDetailTarget) => void;
  onUpdateStatus: (userId: string, status: AccountStatus) => void;
  updatingUserId: string | null;
}) {
  const [query, setQuery] = useState('');
  const owners = filterAccounts(dashboard.accounts.owners, query);
  const vets = filterAccounts(dashboard.accounts.vets, query);
  const admins = filterAccounts(dashboard.accounts.admins, query);

  return (
    <SectionShell title="Administracion de usuarios" onBack={onBack}>
      <TextInput
        onChangeText={setQuery}
        placeholder="Buscar usuario por nombre, email o telefono"
        style={styles.input}
        value={query}
      />
      <AccountGroup
        emptyText="No hay propietarios registrados."
        title="Propietarios"
        users={owners}
        onOpenDetail={onOpenDetail}
        onUpdateStatus={onUpdateStatus}
        updatingUserId={updatingUserId}
      />
      <AccountGroup
        emptyText="No hay veterinarios/as creados."
        title="Veterinarios/as"
        users={vets}
        onOpenDetail={onOpenDetail}
        onUpdateStatus={onUpdateStatus}
        updatingUserId={updatingUserId}
      />
      <AccountGroup
        emptyText="No hay administradores creados."
        title="Administradores"
        users={admins}
        onOpenDetail={onOpenDetail}
        onUpdateStatus={onUpdateStatus}
        updatingUserId={updatingUserId}
      />
    </SectionShell>
  );
}

function AccountGroup({
  title,
  users,
  emptyText,
  onOpenDetail,
  onUpdateStatus,
  updatingUserId,
}: {
  title: string;
  users: AccountUser[];
  emptyText: string;
  onOpenDetail: (target: AdminDetailTarget) => void;
  onUpdateStatus: (userId: string, status: AccountStatus) => void;
  updatingUserId: string | null;
}) {
  return (
    <View style={styles.accountGroup}>
      <SectionTitle>{title}</SectionTitle>
      {users.length === 0 ? <Muted>{emptyText}</Muted> : null}
      {users.map((user) => (
        <View key={user.id} style={styles.row}>
          <View style={styles.rowHeader}>
            <View style={styles.accountTitle}>
              <SmallRoleIcon role={user.role} />
              <Text style={styles.rowTitle}>{accountDisplayName(user)}</Text>
            </View>
            <StatusBadge status={user.status} />
          </View>
          <Muted>{user.email}</Muted>
          <Muted>{accountSubtitle(user)}</Muted>
          <AccountDetailButton onOpenDetail={onOpenDetail} user={user} />
          {user.role === 'OWNER' && user.status === 'PENDING' ? (
            <View style={styles.inlineActions}>
              <Pressable
                disabled={updatingUserId === user.id}
                onPress={() => onUpdateStatus(user.id, 'ACTIVE')}
                style={[styles.iconActionButton, updatingUserId === user.id && styles.buttonDisabled]}
              >
                <CheckCircle color="#ffffff" size={18} strokeWidth={2.4} />
                <Text style={styles.iconActionText}>Aprobar</Text>
              </Pressable>
              <Pressable
                disabled={updatingUserId === user.id}
                onPress={() => onUpdateStatus(user.id, 'REJECTED')}
                style={[
                  styles.iconActionButton,
                  styles.rejectButton,
                  updatingUserId === user.id && styles.buttonDisabled,
                ]}
              >
                <XCircle color="#ffffff" size={18} strokeWidth={2.4} />
                <Text style={styles.iconActionText}>Rechazar</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function AccountDetailButton({
  onOpenDetail,
  user,
}: {
  onOpenDetail: (target: AdminDetailTarget) => void;
  user: AccountUser;
}) {
  const ownerProfile = user.ownerProfile;
  const vetProfile = user.vetProfile;

  if (ownerProfile) {
    return <DetailButton onPress={() => onOpenDetail({ id: ownerProfile.id, type: 'owner' })} />;
  }

  if (vetProfile) {
    return <DetailButton onPress={() => onOpenDetail({ id: vetProfile.id, type: 'vet' })} />;
  }

  return null;
}

function SmallRoleIcon({ role }: { role: AccountUser['role'] }) {
  if (role === 'VET') {
    return <Stethoscope color={colors.primaryDark} size={20} strokeWidth={2.4} />;
  }

  if (role === 'ADMIN') {
    return <ShieldCheck color={colors.primaryDark} size={20} strokeWidth={2.4} />;
  }

  return <PawPrint color={colors.primaryDark} size={20} strokeWidth={2.4} />;
}

function SmallStatusIcon({ status }: { status: ExtensionStatus }) {
  if (status === 'ACTIVE') {
    return <CheckCircle color={colors.primaryDark} size={20} strokeWidth={2.4} />;
  }

  if (status === 'NEEDS_CONFIGURATION') {
    return <TriangleAlert color={colors.warning} size={20} strokeWidth={2.4} />;
  }

  return <XCircle color={colors.muted} size={20} strokeWidth={2.4} />;
}

function extensionStatusLabel(status: ExtensionStatus) {
  if (status === 'ACTIVE') {
    return 'Activa';
  }

  if (status === 'INACTIVE') {
    return 'Desactivada';
  }

  if (status === 'NEEDS_CONFIGURATION') {
    return 'Requiere configuracion';
  }

  return 'Disponible';
}

function StatusBadge({ status }: { status: AccountStatus }) {
  const label =
    status === 'ACTIVE' ? 'Activa' : status === 'PENDING' ? 'Pendiente' : 'Rechazada';

  return <Badge>{label}</Badge>;
}

function accountDisplayName(user: AccountUser) {
  if (user.ownerProfile) {
    return `${user.ownerProfile.firstName} ${user.ownerProfile.lastName}`;
  }

  if (user.vetProfile) {
    return user.vetProfile.clinicName;
  }

  return 'Administrador';
}

function accountSubtitle(user: AccountUser) {
  if (user.ownerProfile) {
    return `${user.ownerProfile._count.pets} mascotas${
      user.ownerProfile.phone ? ` - ${user.ownerProfile.phone}` : ''
    }`;
  }

  if (user.vetProfile) {
    return user.vetProfile.managerName
      ? `Responsable: ${user.vetProfile.managerName}`
      : 'Cuenta profesional';
  }

  return 'Cuenta administrativa';
}

function filterAccounts(users: AccountUser[], query: string) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return users;
  }

  return users.filter((user) =>
    normalizeText(
      `${user.email} ${accountDisplayName(user)} ${user.ownerProfile?.phone ?? ''} ${user.vetProfile?.phone ?? ''}`,
    ).includes(normalizedQuery),
  );
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function OwnersSection({
  dashboard,
  onBack,
}: {
  dashboard: AdminDashboard;
  onBack: () => void;
}) {
  return (
    <SectionShell title="Dueños y pacientes" onBack={onBack}>
      <SectionTitle>Propietarios</SectionTitle>
        {dashboard.recentOwners.length === 0 ? <Muted>No hay propietarios creados.</Muted> : null}
        {dashboard.recentOwners.map((owner) => (
          <View key={owner.id} style={styles.row}>
            <View style={styles.rowHeader}>
              <Text style={styles.rowTitle}>
                {owner.firstName} {owner.lastName}
              </Text>
              <Badge>{owner._count.pets} mascotas</Badge>
            </View>
            <Muted>{owner.user.email}</Muted>
            {owner.phone ? <Muted>Telefono: {owner.phone}</Muted> : null}
          </View>
        ))}

      <SectionTitle>Pacientes</SectionTitle>
        {dashboard.recentPets.length === 0 ? <Muted>No hay pacientes registrados.</Muted> : null}
        {dashboard.recentPets.map((pet) => (
          <View key={pet.id} style={styles.row}>
            <View style={styles.rowHeader}>
              <Text style={styles.rowTitle}>{pet.name}</Text>
              <Badge>{petSexLabel(pet.sex)}</Badge>
            </View>
            <Muted>
              {pet.species}
              {pet.breed ? ` - ${pet.breed}` : ''} - {pet.owner.firstName}{' '}
              {pet.owner.lastName}
            </Muted>
            <Muted>
              Vets: {pet._count.vets} - Historial: {pet._count.records} - Turnos:{' '}
              {pet._count.appointments}
            </Muted>
          </View>
        ))}
    </SectionShell>
  );
}

function AdminAgendaCalendar({
  countsByDate,
  month,
  selectedDate,
  onChangeMonth,
  onSelectDate,
}: {
  countsByDate: Map<string, number>;
  month: Date;
  selectedDate: string | null;
  onChangeMonth: (month: Date) => void;
  onSelectDate: (date: string) => void;
}) {
  const days = buildAdminCalendarDays(month);

  function moveMonth(offset: number) {
    onChangeMonth(new Date(month.getFullYear(), month.getMonth() + offset, 1));
  }

  return (
    <View style={styles.agendaCalendar}>
      <View style={styles.calendarHeader}>
        <Pressable onPress={() => moveMonth(-1)} style={styles.monthButton}>
          <ChevronLeft color={colors.text} size={21} strokeWidth={2.4} />
        </Pressable>
        <Text style={styles.monthTitle}>{formatAdminMonthTitle(month)}</Text>
        <Pressable onPress={() => moveMonth(1)} style={styles.monthButton}>
          <ChevronRight color={colors.text} size={21} strokeWidth={2.4} />
        </Pressable>
      </View>

      <View style={styles.weekGrid}>
        {adminWeekDays.map((day, index) => (
          <Text key={`${day}-${index}`} style={styles.weekDay}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.dayGrid}>
        {days.map((day) => {
          const isoDate = day.date ? toAdminIsoDate(day.date) : '';
          const count = countsByDate.get(isoDate) ?? 0;
          const isSelected = isoDate === selectedDate;

          return (
            <Pressable
              key={day.key}
              disabled={!day.date}
              onPress={() => onSelectDate(isoDate)}
              style={[
                styles.agendaDayCell,
                isSelected && styles.dayCellActive,
                !day.date && styles.dayCellDisabled,
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  isSelected && styles.dayTextActive,
                  !day.date && styles.dayTextDisabled,
                ]}
              >
                {day.label}
              </Text>
              {count > 0 ? (
                <View style={[styles.dayCountBadge, isSelected && styles.dayCountBadgeActive]}>
                  <Text style={[styles.dayCountText, isSelected && styles.dayCountTextActive]}>
                    {count}
                  </Text>
                </View>
              ) : (
                <View style={styles.dayCountPlaceholder} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function AppointmentsSection({
  dashboard,
  onBack,
}: {
  dashboard: AdminDashboard;
  onBack: () => void;
}) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AdminDashboard['upcomingAppointments'][number]['status'] | 'ALL'>('ALL');
  const [selectedDate, setSelectedDate] = useState<string | null>(() =>
    dashboard.upcomingAppointments[0]
      ? toAdminIsoDate(new Date(dashboard.upcomingAppointments[0].scheduledAt))
      : null,
  );
  const [calendarMonth, setCalendarMonth] = useState(() =>
    selectedDate ? adminMonthFromIsoDate(selectedDate) : adminStartOfMonth(new Date()),
  );
  const statuses = Array.from(
    new Set(dashboard.upcomingAppointments.map((appointment) => appointment.status)),
  );
  const countsByDate = countAdminAppointmentsByDate(dashboard.upcomingAppointments);
  const appointmentsForSelectedDay = selectedDate
    ? dashboard.upcomingAppointments.filter(
        (appointment) => toAdminIsoDate(new Date(appointment.scheduledAt)) === selectedDate,
      )
    : [];
  const filteredAppointments = appointmentsForSelectedDay.filter((appointment) => {
    const matchesQuery = normalizeText(
      `${appointment.pet.name} ${appointment.vet.clinicName}`,
    ).includes(normalizeText(query));
    const matchesStatus = statusFilter === 'ALL' || appointment.status === statusFilter;

    return matchesQuery && matchesStatus;
  });

  return (
    <SectionShell title="Agenda" onBack={onBack}>
      <Muted>Selecciona un dia del calendario para revisar sus turnos.</Muted>
      <AdminAgendaCalendar
        countsByDate={countsByDate}
        month={calendarMonth}
        selectedDate={selectedDate}
        onChangeMonth={setCalendarMonth}
        onSelectDate={setSelectedDate}
      />

      <View style={styles.selectedDayBox}>
        <View style={styles.selectedDayText}>
          <Text style={styles.summaryTitle}>
            {selectedDate ? `Turnos del ${formatDateOnly(selectedDate)}` : 'Selecciona un dia'}
          </Text>
          <Muted>
            {appointmentsForSelectedDay.length} turno
            {appointmentsForSelectedDay.length === 1 ? '' : 's'} en el dia.
          </Muted>
        </View>
      </View>

      {selectedDate ? (
        <>
          <TextInput
            onChangeText={setQuery}
            placeholder="Buscar en este día por mascota o veterinario/a"
            style={styles.input}
            value={query}
          />
          <View style={styles.nav}>
            <Pressable
              onPress={() => setStatusFilter('ALL')}
              style={[styles.navButton, statusFilter === 'ALL' && styles.navActive]}
            >
              <Text style={styles.navText}>Todos</Text>
            </Pressable>
            {statuses.map((status) => (
              <Pressable
                key={status}
                onPress={() => setStatusFilter(status)}
                style={[styles.navButton, statusFilter === status && styles.navActive]}
              >
                <Text style={styles.navText}>{appointmentStatusLabel(status)}</Text>
              </Pressable>
            ))}
          </View>

          {filteredAppointments.length === 0 ? (
            <Muted>No hay turnos para el dia o filtros seleccionados.</Muted>
          ) : null}

          {filteredAppointments.map((appointment) => (
            <View key={appointment.id} style={styles.row}>
              <View style={styles.rowHeader}>
                <Text style={styles.rowTitle}>{appointment.pet.name}</Text>
                <Badge>{appointmentStatusLabel(appointment.status)}</Badge>
              </View>
              <Muted>{formatDate(appointment.scheduledAt)}</Muted>
              <Muted>{appointment.vet.clinicName}</Muted>
            </View>
          ))}
        </>
      ) : null}
    </SectionShell>
  );
}

function RemindersSection({
  dashboard,
  onBack,
}: {
  dashboard: AdminDashboard;
  onBack: () => void;
}) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReminderStatus | 'ALL'>('ALL');
  const reminders = dashboard.recentReminders.filter((reminder) => {
    const matchesQuery = normalizeText(
      `${reminder.title} ${reminder.pet.name} ${reminder.vet?.clinicName ?? ''}`,
    ).includes(normalizeText(query));
    const matchesStatus = statusFilter === 'ALL' || reminder.status === statusFilter;

    return matchesQuery && matchesStatus;
  });

  return (
    <SectionShell title="Recordatorios" onBack={onBack}>
      <TextInput
        onChangeText={setQuery}
        placeholder="Buscar por título, mascota o veterinario/a"
        style={styles.input}
        value={query}
      />
      <View style={styles.nav}>
        {(['ALL', 'PENDING', 'COMPLETED'] as Array<ReminderStatus | 'ALL'>).map((status) => (
          <Pressable
            key={status}
            onPress={() => setStatusFilter(status)}
            style={[styles.navButton, statusFilter === status && styles.navActive]}
          >
            <Text style={styles.navText}>
              {status === 'ALL' ? 'Todos' : reminderStatusLabel(status)}
            </Text>
          </Pressable>
        ))}
      </View>
      {reminders.length === 0 ? <Muted>No hay recordatorios para esos filtros.</Muted> : null}
      {reminders.map((reminder) => (
        <View key={reminder.id} style={styles.row}>
          <View style={styles.rowHeader}>
            <Text style={styles.rowTitle}>{reminder.title}</Text>
            <Badge>{reminderStatusLabel(reminder.status)}</Badge>
          </View>
          <Muted>
            {reminder.pet.name} - {reminderTypeLabel(reminder.type)} - {formatDate(reminder.dueAt)}
          </Muted>
          {reminder.vet?.clinicName ? <Muted>{reminder.vet.clinicName}</Muted> : null}
        </View>
      ))}
    </SectionShell>
  );
}

function AuditSection({
  dashboard,
  onBack,
}: {
  dashboard: AdminDashboard;
  onBack: () => void;
}) {
  const [query, setQuery] = useState('');
  const logs = dashboard.recentAuditLogs.filter((log) =>
    normalizeText(
      `${log.summary} ${log.actor?.email ?? ''} ${log.entityName ?? ''} ${log.entityType} ${log.action}`,
    ).includes(normalizeText(query)),
  );

  return (
    <SectionShell title="Auditoría" onBack={onBack}>
      <Muted>Registro de cambios administrativos y acciones importantes del sistema.</Muted>
      <TextInput
        onChangeText={setQuery}
        placeholder="Buscar por responsable, acción o entidad"
        style={styles.input}
        value={query}
      />

      {logs.length === 0 ? (
        <Muted>No hay eventos de auditoría para mostrar.</Muted>
      ) : null}

      {logs.map((log) => (
        <View key={log.id} style={styles.row}>
          <View style={styles.rowHeader}>
            <Text style={styles.rowTitle}>{auditActionLabel(log.action)}</Text>
            <Badge>{auditEntityLabel(log.entityType)}</Badge>
          </View>
          <Text style={styles.description}>{log.summary}</Text>
          <Muted>Responsable: {log.actor?.email ?? 'Sistema'}</Muted>
          {log.entityName ? <Muted>Entidad: {log.entityName}</Muted> : null}
          <Muted>{formatDate(log.createdAt)}</Muted>
        </View>
      ))}
    </SectionShell>
  );
}

function ScheduleSection({
  schedule,
  isSaving,
  onBack,
  onSave,
}: {
  schedule: ScheduleSetting[];
  isSaving: boolean;
  onBack: () => void;
  onSave: (settings: ScheduleSetting[]) => void;
}) {
  const [settings, setSettings] = useState<ScheduleSetting[]>(schedule);

  useEffect(() => {
    setSettings(schedule);
  }, [schedule]);

  function updateSetting(scope: ScheduleSetting['scope'], patch: Partial<ScheduleSetting>) {
    setSettings((current) =>
      current.map((setting) =>
        setting.scope === scope ? { ...setting, ...patch } : setting,
      ),
    );
  }

  return (
    <SectionShell title="Horarios de turnos" onBack={onBack}>
      <Muted>
        Estos horarios definen que opciones aparecen en el calendario de solicitud de turnos.
      </Muted>

      {settings.map((setting) => (
        <View key={setting.scope} style={styles.scheduleCard}>
          <View style={styles.rowHeader}>
            <Text style={styles.rowTitle}>{scheduleScopeLabels[setting.scope]}</Text>
            <Pressable
              onPress={() => updateSetting(setting.scope, { isEnabled: !setting.isEnabled })}
              style={[styles.navButton, setting.isEnabled && styles.navActive]}
            >
              <Text style={styles.navText}>{setting.isEnabled ? 'Abierto' : 'Cerrado'}</Text>
            </Pressable>
          </View>

          <View style={styles.scheduleGrid}>
            <View style={styles.scheduleField}>
              <Muted>Desde</Muted>
              <TextInput
                keyboardType="numbers-and-punctuation"
                onChangeText={(value) => updateSetting(setting.scope, { startTime: value })}
                placeholder="08:00"
                style={styles.input}
                value={setting.startTime}
              />
            </View>
            <View style={styles.scheduleField}>
              <Muted>Hasta</Muted>
              <TextInput
                keyboardType="numbers-and-punctuation"
                onChangeText={(value) => updateSetting(setting.scope, { endTime: value })}
                placeholder="20:00"
                style={styles.input}
                value={setting.endTime}
              />
            </View>
            <View style={styles.scheduleField}>
              <Muted>Intervalo min.</Muted>
              <TextInput
                keyboardType="number-pad"
                onChangeText={(value) =>
                  updateSetting(setting.scope, {
                    intervalMinutes: Number(value.replace(/\D/g, '')) || 30,
                  })
                }
                placeholder="30"
                style={styles.input}
                value={String(setting.intervalMinutes)}
              />
            </View>
          </View>
        </View>
      ))}

      <Pressable
        disabled={isSaving}
        onPress={() => onSave(settings)}
        style={[styles.button, isSaving && styles.buttonDisabled]}
      >
        <Text style={styles.buttonText}>{isSaving ? 'Guardando...' : 'Guardar horarios'}</Text>
      </Pressable>
    </SectionShell>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  const time = date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${formatDateOnly(value)} ${time}`;
}

function auditActionLabel(action: string) {
  if (action === 'VET_CREATED') {
    return 'Veterinario/a creado';
  }

  if (action === 'USER_STATUS_CHANGED') {
    return 'Estado de usuario';
  }

  if (action === 'APPOINTMENT_STATUS_CHANGED') {
    return 'Estado de turno';
  }

  return action;
}

function auditEntityLabel(entityType: string) {
  if (entityType === 'VET') {
    return 'Veterinario/a';
  }

  if (entityType === 'USER') {
    return 'Usuario';
  }

  if (entityType === 'APPOINTMENT') {
    return 'Turno';
  }

  return entityType;
}

function countAdminAppointmentsByDate(appointments: Array<{ scheduledAt: string }>) {
  const counts = new Map<string, number>();

  appointments.forEach((appointment) => {
    const date = toAdminIsoDate(new Date(appointment.scheduledAt));
    counts.set(date, (counts.get(date) ?? 0) + 1);
  });

  return counts;
}

function buildAdminCalendarDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const leadingEmptyDays = (firstDay.getDay() + 6) % 7;
  const days: Array<{ key: string; label: string; date?: Date }> = [];

  for (let index = 0; index < leadingEmptyDays; index += 1) {
    days.push({ key: `empty-start-${index}`, label: '' });
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    days.push({ key: toAdminIsoDate(date), label: String(day), date });
  }

  while (days.length % 7 !== 0) {
    days.push({ key: `empty-end-${days.length}`, label: '' });
  }

  return days;
}

function toAdminIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function adminMonthFromIsoDate(value: string) {
  const [year, month] = value.split('-').map(Number);

  return new Date(year, month - 1, 1);
}

function adminStartOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function formatAdminMonthTitle(value: Date) {
  return value.toLocaleDateString('es', {
    month: 'long',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  headerBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  headerRow: {
    alignItems: 'flex-start',
    elevation: 20,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    position: 'relative',
    zIndex: 1000,
  },
  kicker: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    flexBasis: 150,
    minHeight: 132,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  tileTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  tileMetric: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
  },
  tileTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  tileDescription: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  alertRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  cardTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  smallIconCircle: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  backButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  backButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  nav: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  navButton: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  navActive: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },
  navText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  agendaCalendar: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.sm,
  },
  calendarHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  monthButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  monthTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  weekGrid: {
    flexDirection: 'row',
  },
  weekDay: {
    color: colors.muted,
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  agendaDayCell: {
    alignItems: 'center',
    aspectRatio: 0.9,
    flexBasis: '14.2857%',
    gap: 2,
    justifyContent: 'center',
    padding: 2,
  },
  dayCellActive: {
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  dayCellDisabled: {
    opacity: 0.35,
  },
  dayText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  dayTextActive: {
    color: '#ffffff',
  },
  dayTextDisabled: {
    color: colors.muted,
  },
  dayCountBadge: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 18,
    justifyContent: 'center',
    minWidth: 22,
    paddingHorizontal: 5,
  },
  dayCountBadgeActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  dayCountText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '900',
  },
  dayCountTextActive: {
    color: colors.primaryDark,
  },
  dayCountPlaceholder: {
    minHeight: 18,
  },
  selectedDayBox: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  selectedDayText: {
    flex: 1,
    gap: 2,
  },
  summaryTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  clearDayButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  clearDayButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricCard: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 140,
    flex: 1,
    padding: spacing.md,
  },
  metricValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  row: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  detailBlock: {
    gap: spacing.sm,
  },
  detailButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  detailButtonText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
  },
  actionEmptyState: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  actionEmptyButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  actionEmptyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  description: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  scheduleCard: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  scheduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  scheduleField: {
    flexBasis: 120,
    flexGrow: 1,
    gap: spacing.xs,
  },
  rowHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  accountGroup: {
    gap: spacing.sm,
  },
  accountTitle: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  rowTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
  },
  inlineActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  iconActionButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  rejectButton: {
    backgroundColor: colors.danger,
  },
  iconActionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  form: {
    gap: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  status: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '700',
  },
  statusError: {
    color: colors.danger,
  },
  systemStatusGrid: {
    gap: spacing.sm,
  },
  systemStatusCard: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  systemStatusPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#ecfdf5',
    borderColor: '#bbf7d0',
    borderRadius: 999,
    borderWidth: 1,
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  systemStatusWarning: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    color: colors.warning,
  },
  systemChecklist: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  systemCheckRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  systemCheckText: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
  },
  warningCard: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  dangerOutlineButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.danger,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  dangerOutlineText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '900',
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
});
