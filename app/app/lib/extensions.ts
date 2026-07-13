export type ExtensionStatus = 'AVAILABLE' | 'ACTIVE' | 'INACTIVE' | 'NEEDS_CONFIGURATION';

export type ExtensionEntryManifest = {
  adminSection?: {
    description?: string;
    message?: string;
    title?: string;
  };
  ownerPetDetailSection?: {
    description?: string;
    message?: string;
    title?: string;
  };
  vetDashboardTile?: {
    description?: string;
    message?: string;
    title?: string;
  };
  vetPetDetailSection?: {
    description?: string;
    message?: string;
    title?: string;
  };
};

export type ExtensionManifest = {
  adapter?: string;
  entry?: ExtensionEntryManifest;
};

export type AppExtension = {
  category: string;
  config?: Record<string, unknown> | null;
  description: string;
  isInstalled: boolean;
  key: string;
  manifest?: ExtensionManifest | null;
  name: string;
  requiresExternalService: boolean;
  status: ExtensionStatus;
  updatedAt: string;
  version: string;
};

export function hasActiveVetDashboardTile(extension: AppExtension) {
  return (
    extension.status === 'ACTIVE' &&
    extension.manifest?.adapter === 'admin-message' &&
    Boolean(extension.manifest?.entry?.vetDashboardTile)
  );
}

export function hasActiveAdminSection(extension: AppExtension) {
  return (
    extension.status === 'ACTIVE' &&
    extension.manifest?.adapter === 'admin-message' &&
    Boolean(extension.manifest?.entry?.adminSection)
  );
}
