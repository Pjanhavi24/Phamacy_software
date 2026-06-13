import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api';

export interface Customer {
  id: string | number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  [key: string]: unknown;
}

export interface CustomerHistoryItem {
  id: string | number;
  date: string;
  type: string;
  amount: number;
  [key: string]: unknown;
}

export interface CustomersParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedCustomers {
  data: Customer[];
  total: number;
  page: number;
  limit: number;
}

export function useCustomers(params?: CustomersParams) {
  const { data, isLoading, error, refetch } = useQuery<PaginatedCustomers>({
    queryKey: ['customers', params],
    queryFn: async () => {
      const response = await apiClient.get<PaginatedCustomers>('/customers', {
        params,
      });
      return response.data;
    },
    staleTime: 30000,
  });

  return { data, isLoading, error, refetch };
}

export function useCustomer(id: string | number | undefined) {
  const { data, isLoading, error, refetch } = useQuery<Customer>({
    queryKey: ['customers', id],
    queryFn: async () => {
      const response = await apiClient.get<Customer>(`/customers/${id}`);
      return response.data;
    },
    enabled: !!id,
    staleTime: 30000,
  });

  return { data, isLoading, error, refetch };
}

export function useCustomerHistory(id: string | number | undefined) {
  const { data, isLoading, error, refetch } = useQuery<CustomerHistoryItem[]>({
    queryKey: ['customers', id, 'history'],
    queryFn: async () => {
      const response = await apiClient.get(`/customers/${id}/history`);
      // The API returns { sales, total }; normalize to a flat list.
      const raw = response.data?.sales ?? response.data?.data ?? response.data ?? [];
      const list = Array.isArray(raw) ? raw : [];
      return list.map((s: Record<string, unknown>) => ({
        id: (s.invoiceNumber as string) ?? (s.id as string),
        date: (s.saleDate as string) ?? (s.createdAt as string),
        type: 'sale',
        amount: Number(s.netAmount ?? s.totalAmount ?? 0),
        ...s,
      })) as CustomerHistoryItem[];
    },
    enabled: !!id,
    staleTime: 30000,
  });

  return { data: data ?? [], isLoading, error, refetch };
}

export interface PrescriptionItem {
  id: string;
  imageUrl?: string | null;
  imagePath?: string | null;
  prescriptionDate: string;
  status?: string;
  notes?: string | null;
  doctor?: { id: string; name: string; specialization?: string | null } | null;
}

export function useCustomerPrescriptions(id: string | number | undefined) {
  const { data, isLoading, error, refetch } = useQuery<PrescriptionItem[]>({
    queryKey: ['customers', id, 'prescriptions'],
    queryFn: async () => {
      const response = await apiClient.get(`/prescriptions/customer/${id}`);
      return response.data?.data ?? response.data?.prescriptions ?? [];
    },
    enabled: !!id,
    staleTime: 15000,
  });

  return { data: data ?? [], isLoading, error, refetch };
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  const { mutate, mutateAsync, isPending, error } = useMutation<Customer, Error, Partial<Customer>>({
    mutationFn: async (payload) => {
      const response = await apiClient.post<Customer>('/customers', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  return { mutate, mutateAsync, isPending, error };
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  const { mutate, mutateAsync, isPending, error } = useMutation<
    Customer,
    Error,
    { id: string | number; data: Partial<Customer> }
  >({
    mutationFn: async ({ id, data }) => {
      const response = await apiClient.put<Customer>(`/customers/${id}`, data);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers', variables.id] });
    },
  });

  return { mutate, mutateAsync, isPending, error };
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  const { mutate, mutateAsync, isPending, error } = useMutation<void, Error, string | number>({
    mutationFn: async (id) => {
      await apiClient.delete(`/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  return { mutate, mutateAsync, isPending, error };
}
