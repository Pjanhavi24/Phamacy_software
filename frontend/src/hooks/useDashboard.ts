import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api';

export interface DashboardStats {
  todaySales: number;
  todayPurchase: number;
  monthlyRevenue: number;
  monthlyProfit: number;
  lowStockCount: number;
  expiringCount: number;
  outOfStockCount: number;
  pendingPayments: number;
}

export interface SalesChartData {
  date: string;
  sales: number;
  purchase: number;
}

export interface TopMedicine {
  name: string;
  quantity: number;
  revenue: number;
}

export interface Medicine {
  id: string | number;
  name: string;
  [key: string]: unknown;
}

export interface MedicineBatch {
  id: string | number;
  medicineName: string;
  batchNo: string;
  expiryDate: string;
  [key: string]: unknown;
}

export interface Supplier {
  id: string | number;
  name: string;
  [key: string]: unknown;
}

export interface DashboardAlerts {
  lowStock: Medicine[];
  expiring: MedicineBatch[];
  pendingPayments: Supplier[];
}

export function useDashboardStats() {
  const { data, isLoading, error, refetch } = useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const response = await apiClient.get<DashboardStats>('/dashboard/stats');
      return response.data;
    },
    staleTime: 30000,
  });

  return { data, isLoading, error, refetch };
}

export function useSalesChart(days: number = 30) {
  const { data, isLoading, error, refetch } = useQuery<SalesChartData[]>({
    queryKey: ['dashboard', 'sales-chart', days],
    queryFn: async () => {
      const response = await apiClient.get<SalesChartData[]>('/dashboard/sales-chart', {
        params: { days },
      });
      return response.data;
    },
    staleTime: 30000,
  });

  return { data, isLoading, error, refetch };
}

export function useTopMedicines() {
  const { data, isLoading, error, refetch } = useQuery<TopMedicine[]>({
    queryKey: ['dashboard', 'top-medicines'],
    queryFn: async () => {
      const response = await apiClient.get<TopMedicine[]>('/dashboard/top-medicines');
      return response.data;
    },
    staleTime: 30000,
  });

  return { data, isLoading, error, refetch };
}

export function useDashboardAlerts() {
  const { data, isLoading, error, refetch } = useQuery<DashboardAlerts>({
    queryKey: ['dashboard', 'alerts'],
    queryFn: async () => {
      const response = await apiClient.get<DashboardAlerts>('/dashboard/alerts');
      return response.data;
    },
    staleTime: 30000,
  });

  return { data, isLoading, error, refetch };
}
