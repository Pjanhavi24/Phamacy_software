import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api';

export interface SalesReportParams {
  from: string;
  to: string;
  storeId?: string | number;
}

export interface PurchaseReportParams {
  from: string;
  to: string;
  storeId?: string | number;
  supplierId?: string | number;
}

export interface GSTReportParams {
  month: number;
  year: number;
}

export interface SalesReportItem {
  date: string;
  invoiceNo: string;
  customerName: string;
  amount: number;
  tax: number;
  discount: number;
  netAmount: number;
  [key: string]: unknown;
}

export interface SalesReport {
  items: SalesReportItem[];
  totalAmount: number;
  totalTax: number;
  totalDiscount: number;
  totalNetAmount: number;
}

export interface PurchaseReportItem {
  date: string;
  invoiceNo: string;
  supplierName: string;
  amount: number;
  tax: number;
  netAmount: number;
  [key: string]: unknown;
}

export interface PurchaseReport {
  items: PurchaseReportItem[];
  totalAmount: number;
  totalTax: number;
  totalNetAmount: number;
}

export interface GSTReportItem {
  hsnCode: string;
  description: string;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  [key: string]: unknown;
}

export interface GSTReport {
  items: GSTReportItem[];
  totalTaxableValue: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalTax: number;
}

export interface StockReportItem {
  medicineId: string | number;
  name: string;
  batchNo: string;
  expiryDate: string;
  quantity: number;
  mrp: number;
  value: number;
  [key: string]: unknown;
}

export interface StockReport {
  items: StockReportItem[];
  totalItems: number;
  totalValue: number;
}

export interface ExpiryReportItem {
  medicineId: string | number;
  name: string;
  batchNo: string;
  expiryDate: string;
  quantity: number;
  daysToExpiry: number;
  [key: string]: unknown;
}

export interface ExpiryReport {
  items: ExpiryReportItem[];
  totalItems: number;
}

export function useSalesReport(params: SalesReportParams) {
  const { data, isLoading, error, refetch } = useQuery<SalesReport>({
    queryKey: ['reports', 'sales', params],
    queryFn: async () => {
      const response = await apiClient.get<SalesReport>('/reports/sales', { params });
      return response.data;
    },
    staleTime: 30000,
    enabled: !!(params?.from && params?.to),
  });

  return { data, isLoading, error, refetch };
}

export function usePurchaseReport(params: PurchaseReportParams) {
  const { data, isLoading, error, refetch } = useQuery<PurchaseReport>({
    queryKey: ['reports', 'purchase', params],
    queryFn: async () => {
      const response = await apiClient.get<PurchaseReport>('/reports/purchase', { params });
      return response.data;
    },
    staleTime: 30000,
    enabled: !!(params?.from && params?.to),
  });

  return { data, isLoading, error, refetch };
}

export function useGSTReport(params: GSTReportParams) {
  const { data, isLoading, error, refetch } = useQuery<GSTReport>({
    queryKey: ['reports', 'gst', params],
    queryFn: async () => {
      const response = await apiClient.get<GSTReport>('/reports/gst', { params });
      return response.data;
    },
    staleTime: 30000,
    enabled: !!(params?.month && params?.year),
  });

  return { data, isLoading, error, refetch };
}

export function useStockReport() {
  const { data, isLoading, error, refetch } = useQuery<StockReport>({
    queryKey: ['reports', 'stock'],
    queryFn: async () => {
      const response = await apiClient.get<StockReport>('/reports/stock');
      return response.data;
    },
    staleTime: 30000,
  });

  return { data, isLoading, error, refetch };
}

export function useExpiryReport() {
  const { data, isLoading, error, refetch } = useQuery<ExpiryReport>({
    queryKey: ['reports', 'expiry'],
    queryFn: async () => {
      const response = await apiClient.get<ExpiryReport>('/reports/expiry');
      return response.data;
    },
    staleTime: 30000,
  });

  return { data, isLoading, error, refetch };
}
