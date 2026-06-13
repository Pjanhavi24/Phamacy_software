import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type {
  InventoryBatch,
  StockMovement,
  InventoryFilters,
  PaginatedResponse,
  StockAdjustmentDTO,
  InventorySummary,
} from '@/types';

export const INVENTORY_KEYS = {
  all: ['inventory'] as const,
  batches: () => [...INVENTORY_KEYS.all, 'batches'] as const,
  batch: (filters: InventoryFilters) => [...INVENTORY_KEYS.batches(), filters] as const,
  batchDetail: (id: number | string) => [...INVENTORY_KEYS.batches(), id] as const,
  movements: () => [...INVENTORY_KEYS.all, 'movements'] as const,
  movement: (filters: InventoryFilters) => [...INVENTORY_KEYS.movements(), filters] as const,
  summary: () => [...INVENTORY_KEYS.all, 'summary'] as const,
  expiring: (days: number) => [...INVENTORY_KEYS.all, 'expiring', days] as const,
  medicine: (medicineId: number | string) => [...INVENTORY_KEYS.all, 'medicine', medicineId] as const,
};

/**
 * Fetch inventory batches with filters.
 */
export function useInventoryBatches(filters: InventoryFilters = {}) {
  return useQuery({
    queryKey: INVENTORY_KEYS.batch(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.pageSize) params.set('page_size', String(filters.pageSize));
      if (filters.search) params.set('search', filters.search);
      if (filters.medicineId) params.set('medicine_id', String(filters.medicineId));
      if (filters.supplierId) params.set('supplier_id', String(filters.supplierId));
      if (filters.isExpired !== undefined) params.set('is_expired', String(filters.isExpired));
      if (filters.isLowStock !== undefined) params.set('is_low_stock', String(filters.isLowStock));
      if (filters.expiryBefore) params.set('expiry_before', filters.expiryBefore);
      if (filters.ordering) params.set('ordering', filters.ordering);

      const response = await apiClient.get<PaginatedResponse<InventoryBatch>>(
        `/inventory/batches/?${params.toString()}`
      );
      return response.data;
    },
    placeholderData: keepPreviousData,
  });
}

/**
 * Fetch inventory batches for a specific medicine.
 */
export function useMedicineStock(medicineId: number | string | undefined) {
  return useQuery({
    queryKey: INVENTORY_KEYS.medicine(medicineId!),
    queryFn: async () => {
      const response = await apiClient.get<InventoryBatch[]>(
        `/inventory/medicine/${medicineId}/stock/`
      );
      return response.data;
    },
    enabled: !!medicineId,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch inventory summary (total value, low stock count, expiring count).
 */
export function useInventorySummary() {
  return useQuery({
    queryKey: INVENTORY_KEYS.summary(),
    queryFn: async () => {
      const response = await apiClient.get<InventorySummary>('/inventory/summary/');
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}

/**
 * Fetch medicines expiring within N days.
 */
export function useExpiringStock(days = 90) {
  return useQuery({
    queryKey: INVENTORY_KEYS.expiring(days),
    queryFn: async () => {
      const response = await apiClient.get<InventoryBatch[]>('/inventory/expiring/', {
        params: { days },
      });
      return response.data;
    },
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Fetch stock movement history.
 */
export function useStockMovements(filters: InventoryFilters = {}) {
  return useQuery({
    queryKey: INVENTORY_KEYS.movement(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.pageSize) params.set('page_size', String(filters.pageSize));
      if (filters.medicineId) params.set('medicine_id', String(filters.medicineId));
      if (filters.movementType) params.set('movement_type', filters.movementType);
      if (filters.dateFrom) params.set('date_from', filters.dateFrom);
      if (filters.dateTo) params.set('date_to', filters.dateTo);

      const response = await apiClient.get<PaginatedResponse<StockMovement>>(
        `/inventory/movements/?${params.toString()}`
      );
      return response.data;
    },
    placeholderData: keepPreviousData,
  });
}

/**
 * Adjust stock (manual correction, damage write-off, etc.).
 */
export function useStockAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: StockAdjustmentDTO) => {
      const response = await apiClient.post('/inventory/adjust/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
    },
  });
}
