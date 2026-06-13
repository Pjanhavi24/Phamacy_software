import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type {
  Sale,
  SaleDetail,
  PaginatedResponse,
  SaleFilters,
  CreateSaleDTO,
  SaleSummary,
} from '@/types';

export const SALE_KEYS = {
  all: ['sales'] as const,
  lists: () => [...SALE_KEYS.all, 'list'] as const,
  list: (filters: SaleFilters) => [...SALE_KEYS.lists(), filters] as const,
  details: () => [...SALE_KEYS.all, 'detail'] as const,
  detail: (id: number | string) => [...SALE_KEYS.details(), id] as const,
  summary: (period?: string) => [...SALE_KEYS.all, 'summary', period] as const,
  today: () => [...SALE_KEYS.all, 'today'] as const,
};

/**
 * Fetch paginated sales list.
 */
export function useSales(filters: SaleFilters = {}) {
  return useQuery({
    queryKey: SALE_KEYS.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.pageSize) params.set('page_size', String(filters.pageSize));
      if (filters.search) params.set('search', filters.search);
      if (filters.dateFrom) params.set('date_from', filters.dateFrom);
      if (filters.dateTo) params.set('date_to', filters.dateTo);
      if (filters.customerId) params.set('customer_id', String(filters.customerId));
      if (filters.paymentMode) params.set('payment_mode', filters.paymentMode);
      if (filters.status) params.set('status', filters.status);
      if (filters.ordering) params.set('ordering', filters.ordering);

      const response = await apiClient.get<PaginatedResponse<Sale>>(`/sales/?${params.toString()}`);
      return response.data;
    },
    placeholderData: keepPreviousData,
  });
}

/**
 * Fetch a single sale by ID.
 */
export function useSale(id: number | string | undefined) {
  return useQuery({
    queryKey: SALE_KEYS.detail(id!),
    queryFn: async () => {
      const response = await apiClient.get<SaleDetail>(`/sales/${id}/`);
      return response.data;
    },
    enabled: !!id,
  });
}

/**
 * Fetch today's sales summary.
 */
export function useTodaySales() {
  return useQuery({
    queryKey: SALE_KEYS.today(),
    queryFn: async () => {
      const response = await apiClient.get<SaleSummary>('/sales/today-summary/');
      return response.data;
    },
    refetchInterval: 30 * 1000,
    staleTime: 15 * 1000,
  });
}

/**
 * Fetch sales summary for a given period.
 */
export function useSalesSummary(period: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'monthly') {
  return useQuery({
    queryKey: SALE_KEYS.summary(period),
    queryFn: async () => {
      const response = await apiClient.get<SaleSummary[]>('/sales/summary/', {
        params: { period },
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create a new sale (POS billing).
 */
export function useCreateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateSaleDTO) => {
      const response = await apiClient.post<SaleDetail>('/sales/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SALE_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: SALE_KEYS.today() });
      // Invalidate inventory since stock changes
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['medicines', 'low-stock'] });
    },
  });
}

/**
 * Return/cancel a sale.
 */
export function useReturnSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      saleId,
      reason,
      items,
    }: {
      saleId: number | string;
      reason: string;
      items?: Array<{ saleItemId: number; quantity: number }>;
    }) => {
      const response = await apiClient.post<SaleDetail>(`/sales/${saleId}/return/`, {
        reason,
        items,
      });
      return response.data;
    },
    onSuccess: (_, { saleId }) => {
      queryClient.invalidateQueries({ queryKey: SALE_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: SALE_KEYS.detail(saleId) });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

/**
 * Generate and download a sale invoice PDF.
 */
export function useDownloadInvoice() {
  return useMutation({
    mutationFn: async (saleId: number | string) => {
      const response = await apiClient.get(`/sales/${saleId}/invoice/`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${saleId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}
