import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api';

export interface Supplier {
  id: string | number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNo?: string;
  [key: string]: unknown;
}

export interface SupplierLedgerEntry {
  id: string | number;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  [key: string]: unknown;
}

export interface SuppliersParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedSuppliers {
  data: Supplier[];
  total: number;
  page: number;
  limit: number;
}

export function useSuppliers(params?: SuppliersParams) {
  const { data, isLoading, error, refetch } = useQuery<PaginatedSuppliers>({
    queryKey: ['suppliers', params],
    queryFn: async () => {
      const response = await apiClient.get<PaginatedSuppliers>('/suppliers', {
        params,
      });
      return response.data;
    },
    staleTime: 30000,
  });

  return { data, isLoading, error, refetch };
}

export function useSupplier(id: string | number | undefined) {
  const { data, isLoading, error, refetch } = useQuery<Supplier>({
    queryKey: ['suppliers', id],
    queryFn: async () => {
      const response = await apiClient.get<Supplier>(`/suppliers/${id}`);
      return response.data;
    },
    enabled: !!id,
    staleTime: 30000,
  });

  return { data, isLoading, error, refetch };
}

export function useSupplierLedger(id: string | number | undefined) {
  const { data, isLoading, error, refetch } = useQuery<SupplierLedgerEntry[]>({
    queryKey: ['suppliers', id, 'ledger'],
    queryFn: async () => {
      const response = await apiClient.get<SupplierLedgerEntry[]>(`/suppliers/${id}/ledger`);
      return response.data;
    },
    enabled: !!id,
    staleTime: 30000,
  });

  return { data, isLoading, error, refetch };
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  const { mutate, mutateAsync, isPending, error } = useMutation<Supplier, Error, Partial<Supplier>>({
    mutationFn: async (payload) => {
      const response = await apiClient.post<Supplier>('/suppliers', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  return { mutate, mutateAsync, isPending, error };
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  const { mutate, mutateAsync, isPending, error } = useMutation<
    Supplier,
    Error,
    { id: string | number; data: Partial<Supplier> }
  >({
    mutationFn: async ({ id, data }) => {
      const response = await apiClient.put<Supplier>(`/suppliers/${id}`, data);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers', variables.id] });
    },
  });

  return { mutate, mutateAsync, isPending, error };
}
