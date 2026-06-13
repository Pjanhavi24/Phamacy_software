import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api';

export interface Prescription {
  id: string | number;
  customerId: string | number;
  doctorId?: string | number;
  customerName?: string;
  doctorName?: string;
  date: string;
  imageUrl?: string;
  notes?: string;
  medicines?: PrescriptionMedicine[];
  [key: string]: unknown;
}

export interface PrescriptionMedicine {
  medicineId: string | number;
  name: string;
  dosage: string;
  duration: string;
  quantity: number;
  [key: string]: unknown;
}

export interface PrescriptionsParams {
  search?: string;
  page?: number;
  limit?: number;
  customerId?: string | number;
  doctorId?: string | number;
  from?: string;
  to?: string;
}

export interface PaginatedPrescriptions {
  data: Prescription[];
  total: number;
  page: number;
  limit: number;
}

export interface CreatePrescriptionPayload {
  customerId: string | number;
  doctorId?: string | number;
  date?: string;
  notes?: string;
  image?: File;
  medicines?: Omit<PrescriptionMedicine, 'name'>[];
}

export function usePrescriptions(params?: PrescriptionsParams) {
  const { data, isLoading, error, refetch } = useQuery<PaginatedPrescriptions>({
    queryKey: ['prescriptions', params],
    queryFn: async () => {
      const response = await apiClient.get<PaginatedPrescriptions>('/prescriptions', {
        params,
      });
      return response.data;
    },
    staleTime: 30000,
  });

  return { data, isLoading, error, refetch };
}

export function usePrescription(id: string | number | undefined) {
  const { data, isLoading, error, refetch } = useQuery<Prescription>({
    queryKey: ['prescriptions', id],
    queryFn: async () => {
      const response = await apiClient.get<Prescription>(`/prescriptions/${id}`);
      return response.data;
    },
    enabled: !!id,
    staleTime: 30000,
  });

  return { data, isLoading, error, refetch };
}

export function usePatientPrescriptions(customerId: string | number | undefined) {
  const { data, isLoading, error, refetch } = useQuery<Prescription[]>({
    queryKey: ['prescriptions', 'customer', customerId],
    queryFn: async () => {
      const response = await apiClient.get<Prescription[]>(
        `/prescriptions/customer/${customerId}`
      );
      return response.data;
    },
    enabled: !!customerId,
    staleTime: 30000,
  });

  return { data, isLoading, error, refetch };
}

export function useCreatePrescription() {
  const queryClient = useQueryClient();

  const { mutate, mutateAsync, isPending, error } = useMutation<
    Prescription,
    Error,
    CreatePrescriptionPayload
  >({
    mutationFn: async (payload) => {
      const formData = new FormData();

      formData.append('customerId', String(payload.customerId));

      if (payload.doctorId != null) {
        formData.append('doctorId', String(payload.doctorId));
      }
      if (payload.date) {
        formData.append('date', payload.date);
      }
      if (payload.notes) {
        formData.append('notes', payload.notes);
      }
      if (payload.image) {
        formData.append('image', payload.image);
      }
      if (payload.medicines && payload.medicines.length > 0) {
        formData.append('medicines', JSON.stringify(payload.medicines));
      }

      const response = await apiClient.post<Prescription>('/prescriptions', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      if (variables?.customerId) {
        queryClient.invalidateQueries({
          queryKey: ['prescriptions', 'customer', variables.customerId],
        });
      }
    },
  });

  return { mutate, mutateAsync, isPending, error };
}

export function useDeletePrescription() {
  const queryClient = useQueryClient();

  const { mutate, mutateAsync, isPending, error } = useMutation<void, Error, string | number>({
    mutationFn: async (id) => {
      await apiClient.delete(`/prescriptions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
    },
  });

  return { mutate, mutateAsync, isPending, error };
}
