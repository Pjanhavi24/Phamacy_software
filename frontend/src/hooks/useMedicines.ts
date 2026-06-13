import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type {
  Medicine,
  MedicineDetail,
  PaginatedResponse,
  MedicineFilters,
  CreateMedicineDTO,
  UpdateMedicineDTO,
} from '@/types';

export const MEDICINE_KEYS = {
  all: ['medicines'] as const,
  lists: () => [...MEDICINE_KEYS.all, 'list'] as const,
  list: (filters: MedicineFilters) => [...MEDICINE_KEYS.lists(), filters] as const,
  details: () => [...MEDICINE_KEYS.all, 'detail'] as const,
  detail: (id: number | string) => [...MEDICINE_KEYS.details(), id] as const,
  search: (query: string) => [...MEDICINE_KEYS.all, 'search', query] as const,
  lowStock: () => [...MEDICINE_KEYS.all, 'low-stock'] as const,
  categories: () => [...MEDICINE_KEYS.all, 'categories'] as const,
};

/**
 * Fetch paginated medicines list with optional filters.
 */
export function useMedicines(filters: MedicineFilters = {}) {
  return useQuery({
    queryKey: MEDICINE_KEYS.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.pageSize) params.set('page_size', String(filters.pageSize));
      if (filters.search) params.set('search', filters.search);
      if (filters.category) params.set('category', filters.category);
      if (filters.isActive !== undefined) params.set('is_active', String(filters.isActive));
      if (filters.requiresPrescription !== undefined)
        params.set('requires_prescription', String(filters.requiresPrescription));
      if (filters.ordering) params.set('ordering', filters.ordering);

      const response = await apiClient.get<PaginatedResponse<Medicine>>(
        `/medicines/?${params.toString()}`
      );
      return response.data;
    },
    placeholderData: keepPreviousData,
  });
}

/**
 * Fetch single medicine detail by ID.
 */
export function useMedicine(id: number | string | undefined) {
  return useQuery({
    queryKey: MEDICINE_KEYS.detail(id!),
    queryFn: async () => {
      const response = await apiClient.get<MedicineDetail>(`/medicines/${id}/`);
      return response.data;
    },
    enabled: !!id,
  });
}

/**
 * Search medicines by name, generic name, or barcode.
 */
export function useSearchMedicines(query: string, enabled = true) {
  return useQuery({
    queryKey: MEDICINE_KEYS.search(query),
    queryFn: async () => {
      const response = await apiClient.get<Medicine[]>('/medicines/search/', {
        params: { q: query },
      });
      return response.data;
    },
    enabled: enabled && query.trim().length >= 2,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch medicines with low stock (below reorder level).
 */
export function useLowStockMedicines() {
  return useQuery({
    queryKey: MEDICINE_KEYS.lowStock(),
    queryFn: async () => {
      const response = await apiClient.get<Medicine[]>('/medicines/low-stock/');
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

/**
 * Fetch all medicine categories.
 */
export function useMedicineCategories() {
  return useQuery({
    queryKey: MEDICINE_KEYS.categories(),
    queryFn: async () => {
      const response = await apiClient.get<string[]>('/medicines/categories/');
      return response.data;
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Create a new medicine.
 */
export function useCreateMedicine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateMedicineDTO) => {
      const response = await apiClient.post<MedicineDetail>('/medicines/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDICINE_KEYS.lists() });
    },
  });
}

/**
 * Update an existing medicine.
 */
export function useUpdateMedicine(id: number | string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateMedicineDTO) => {
      const response = await apiClient.patch<MedicineDetail>(`/medicines/${id}/`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDICINE_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: MEDICINE_KEYS.detail(id) });
    },
  });
}

/**
 * Delete a medicine.
 */
export function useDeleteMedicine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number | string) => {
      await apiClient.delete(`/medicines/${id}/`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDICINE_KEYS.lists() });
    },
  });
}
