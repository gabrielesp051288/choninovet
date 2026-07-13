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
  category?: string;
  description: string;
  entry?: ExtensionEntryManifest;
  key: string;
  name: string;
  permissions?: string[];
  requiresExternalService?: boolean;
  version?: string;
};

export type SupportedDemandExtension = {
  adapter: string;
  key: string;
  name: string;
  supportedEntries: Array<keyof ExtensionEntryManifest>;
};

export const supportedDemandExtensions = [
  {
    adapter: 'admin-message',
    key: 'none',
    name: 'None',
    supportedEntries: ['adminSection', 'vetDashboardTile'],
  },
] as const satisfies readonly SupportedDemandExtension[];

export function findSupportedDemandExtension(key: string, adapter: string) {
  return supportedDemandExtensions.find(
    (extension) => extension.key === key && extension.adapter === adapter,
  );
}

export function supportedDemandExtensionLabels() {
  return supportedDemandExtensions
    .map((extension) => `${extension.key}:${extension.adapter}`)
    .join(', ');
}
