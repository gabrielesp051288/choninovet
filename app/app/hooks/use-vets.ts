import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import type { VetProfile } from '../lib/types';

export function useVets() {
  return useQuery({
    queryKey: ['vets'],
    queryFn: () => apiRequest<VetProfile[]>('/vets'),
  });
}
