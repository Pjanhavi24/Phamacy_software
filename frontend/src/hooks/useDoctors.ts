import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api';

export interface Doctor {
  id: string | number;
  name: string;
  specialization?: string;
  phone?: string;
  email?: string;
  licenseNo?: string;
  [key: string]: unknown;
}

export interface DoctorsParams {
  search?: string;
  page?: number;
  limit?: number;
  specialization?: string;
}

export interface PaginatedDoctors {
  data: Doctor[];
  total: number;
  page: number;
  limit: number;
}

export function useDoctors(params?: DoctorsParams) {
  const { data, isLoading, error, refetch } = useQuery<PaginatedDoctors>({
    queryKey: ['doctors', params],
    queryFn: async () => {
      const response = await apiClient.get<PaginatedDoctors>('/doctors', {
        params,
      });
      return response.data;
    },
    staleTime: 30000,
  });

  return { data, isLoading, error, refetch };
}

export function useDoctor(id: string | number | undefined) {
  const { data, isLoading, error, refetch } = useQuery<Doctor>({
    queryKey: ['doctors', id],
    queryFn: async () => {
      const response = await apiClient.get<Doctor>(`/doctors/${id}`);
      return response.data;
    },
    enabled: !!id,
    staleTime: 30000,
  });

  return { data, isLoading, error, refetch };
}

export function useCreateDoctor() {
  const queryClient = useQueryClient();

  const { mutate, mutateAsync, isPending, error } = useMutation<Doctor, Error, Partial<Doctor>>({
    mutationFn: async (payload) => {
      const response = await apiClient.post<Doctor>('/doctors', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
    },
  });

  return { mutate, mutateAsync, isPending, error };
}

export function useUpdateDoctor() {
  const queryClient = useQueryClient();

  const { mutate, mutateAsync, isPending, error } = useMutation<
    Doctor,
    Error,
    { id: string | number; data: Partial<Doctor> }
  >({
    mutationFn: async ({ id, data }) => {
      const response = await apiClient.put<Doctor>(`/doctors/${id}`, data);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      queryClient.invalidateQueries({ queryKey: ['doctors', variables.id] });
    },
  });

  return { mutate, mutateAsync, isPending, error };
}

export function useDeleteDoctor() {
  const queryClient = useQueryClient();

  const { mutate, mutateAsync, isPending, error } = useMutation<void, Error, string | number>({
    mutationFn: async (id) => {
      await apiClient.delete(`/doctors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
    },
  });

  return { mutate, mutateAsync, isPending, error };
}
