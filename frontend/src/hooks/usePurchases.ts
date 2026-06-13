import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type {
  Purchase,
  PurchaseDetail,
  PaginatedResponse,
  PurchaseFilters,
  CreatePurchaseDTO,
  UpdatePurchaseDTO,
  Supplier,
} from '@/types';

export const PURCHASE_KEYS = {
  all: ['purchases'] as const,
  lists: () => [...PURCHASE_KEYS.all, 'list'] as const,
  list: (filters: PurchaseFilters) => [...PURCHASE_KEYS.lists(), filters] as const,
  details: () => [...PURCHASE_KEYS.all, 'detail'] as const,
  detail: (id: number | string) => [...PURCHASE_KEYS.details(), id] as const,
  suppliers: () => [...PURCHASE_KEYS.all, 'suppliers'] as const,
  supplier: (id: number | string) => [...PURCHASE_KEYS.suppliers(), id] as const,
};

/**
 * Fetch paginated purchase orders.
 */
export function usePurchases(filters: PurchaseFilters = {}) {
  return useQuery({
    queryKey: PURCHASE_KEYS.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.pageSize) params.set('page_size', String(filters.pageSize));
      if (filters.search) params.set('search', filters.search);
      if (filters.supplierId) params.set('supplier_id', String(filters.supplierId));
      if (filters.status) params.set('status', filters.status);
      if (filters.dateFrom) params.set('date_from', filters.dateFrom);
      if (filters.dateTo) params.set('date_to', filters.dateTo);
      if (filters.ordering) params.set('ordering', filters.ordering);

      const response = await apiClient.get<PaginatedResponse<Purchase>>(
        `/purchases/?${params.toString()}`
      );
      return response.data;
    },
    placeholderData: keepPreviousData,
  });
}

/**
 * Fetch single purchase order detail.
 */
export function usePurchase(id: number | string | undefined) {
  return useQuery({
    queryKey: PURCHASE_KEYS.detail(id!),
    queryFn: async () => {
      const response = await apiClient.get<PurchaseDetail>(`/purchases/${id}/`);
      return response.data;
    },
    enabled: !!id,
  });
}

/**
 * Fetch all suppliers.
 */
export function useSuppliers(search?: string) {
  return useQuery({
    queryKey: [...PURCHASE_KEYS.suppliers(), { search }],
    queryFn: async () => {
      const response = await apiClient.get<Supplier[]>('/suppliers/', {
        params: search ? { search } : {},
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create a new purchase order.
 */
export function useCreatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreatePurchaseDTO) => {
      const response = await apiClient.post<PurchaseDetail>('/purchases/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PURCHASE_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

/**
 * Update purchase order (e.g., mark as received).
 */
export function useUpdatePurchase(id: number | string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdatePurchaseDTO) => {
      const response = await apiClient.patch<PurchaseDetail>(`/purchases/${id}/`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PURCHASE_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: PURCHASE_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

/**
 * Receive a purchase order (GRN - Goods Receipt Note).
 */
export function useReceivePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      purchaseId,
      receivedItems,
    }: {
      purchaseId: number | string;
      receivedItems: Array<{
        purchaseItemId: number;
        receivedQuantity: number;
        batchNumber: string;
        expiryDate: string;
        manufacturingDate?: string;
      }>;
    }) => {
      const response = await apiClient.post<PurchaseDetail>(
        `/purchases/${purchaseId}/receive/`,
        { receivedItems }
      );
      return response.data;
    },
    onSuccess: (_, { purchaseId }) => {
      queryClient.invalidateQueries({ queryKey: PURCHASE_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: PURCHASE_KEYS.detail(purchaseId) });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
    },
  });
}

/**
 * Delete a draft purchase order.
 */
export function useDeletePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number | string) => {
      await apiClient.delete(`/purchases/${id}/`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PURCHASE_KEYS.lists() });
    },
  });
}
