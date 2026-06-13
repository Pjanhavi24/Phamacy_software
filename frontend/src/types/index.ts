// ============================================================
// AUTH TYPES
// ============================================================

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  isSuperAdmin: boolean;
  phoneNumber?: string;
  avatar?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  pharmacy?: PharmacyInfo;
}

export type UserRole = 'super_admin' | 'admin' | 'pharmacist' | 'cashier' | 'manager' | 'viewer';

export interface PharmacyInfo {
  id: number;
  name: string;
  licenseNumber: string;
  gstNumber?: string;
  address: string;
  phone: string;
  email?: string;
  logo?: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user?: User;
  requires2FA?: boolean;
  tempToken?: string;
  message?: string;
}

export interface JWTPayload {
  userId: number;
  email: string;
  role: UserRole;
  pharmacyId: number;
  iat: number;
  exp: number;
}

// ============================================================
// MEDICINE TYPES
// ============================================================

export interface Medicine {
  id: number;
  name: string;
  genericName: string;
  barcode?: string;
  hsnCode?: string;
  category: string;
  manufacturer?: string;
  formulation: MedicineFormulation;
  strength?: string;
  unit: string;
  packSize: number;
  mrp: number;
  purchasePrice?: number;
  sellingPrice: number;
  gstPercent: number;
  reorderLevel: number;
  currentStock: number;
  requiresPrescription: boolean;
  isNarcotic: boolean;
  isActive: boolean;
  description?: string;
  sideEffects?: string;
  storageConditions?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MedicineDetail extends Medicine {
  batches: InventoryBatch[];
  recentSales?: SaleItem[];
  alternativeMedicines?: Medicine[];
}

export type MedicineFormulation =
  | 'tablet'
  | 'capsule'
  | 'syrup'
  | 'injection'
  | 'cream'
  | 'ointment'
  | 'drops'
  | 'inhaler'
  | 'powder'
  | 'granules'
  | 'suppository'
  | 'patch'
  | 'gel'
  | 'lotion'
  | 'suspension'
  | 'solution'
  | 'other';

export interface CreateMedicineDTO {
  name: string;
  genericName: string;
  barcode?: string;
  hsnCode?: string;
  category: string;
  manufacturer?: string;
  formulation: MedicineFormulation;
  strength?: string;
  unit: string;
  packSize: number;
  mrp: number;
  sellingPrice: number;
  gstPercent: number;
  reorderLevel: number;
  requiresPrescription?: boolean;
  isNarcotic?: boolean;
  description?: string;
  storageConditions?: string;
}

export type UpdateMedicineDTO = Partial<CreateMedicineDTO>;

export interface MedicineFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  formulation?: MedicineFormulation;
  isActive?: boolean;
  requiresPrescription?: boolean;
  isLowStock?: boolean;
  ordering?: string;
}

// ============================================================
// INVENTORY / BATCH TYPES
// ============================================================

export interface InventoryBatch {
  id: number;
  medicine: MedicineBrief;
  batchNumber: string;
  quantity: number;
  soldQuantity: number;
  remainingQuantity: number;
  mrp: number;
  purchasePrice: number;
  sellingPrice: number;
  manufacturingDate?: string;
  expiryDate: string;
  supplier?: SupplierBrief;
  purchaseId?: number;
  location?: string;
  isExpired: boolean;
  isLowStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MedicineBrief {
  id: number;
  name: string;
  genericName: string;
  barcode?: string;
  unit: string;
  reorderLevel: number;
}

export interface StockMovement {
  id: number;
  medicine: MedicineBrief;
  batch?: InventoryBatch;
  movementType: StockMovementType;
  quantity: number;
  balanceAfter: number;
  referenceType?: string;
  referenceId?: number;
  notes?: string;
  performedBy: UserBrief;
  createdAt: string;
}

export type StockMovementType =
  | 'purchase'
  | 'sale'
  | 'return_from_customer'
  | 'return_to_supplier'
  | 'adjustment_add'
  | 'adjustment_remove'
  | 'damage'
  | 'expiry_write_off'
  | 'transfer_in'
  | 'transfer_out';

export interface InventorySummary {
  totalMedicines: number;
  totalBatches: number;
  totalStockValue: number;
  lowStockCount: number;
  expiredCount: number;
  expiringIn30Days: number;
  expiringIn90Days: number;
  outOfStockCount: number;
}

export interface InventoryFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  medicineId?: number | string;
  supplierId?: number | string;
  isExpired?: boolean;
  isLowStock?: boolean;
  expiryBefore?: string;
  movementType?: StockMovementType;
  dateFrom?: string;
  dateTo?: string;
  ordering?: string;
}

export interface StockAdjustmentDTO {
  medicineId: number;
  batchId?: number;
  adjustmentType: 'add' | 'remove' | 'damage' | 'expiry_write_off';
  quantity: number;
  reason: string;
  notes?: string;
}

// ============================================================
// SALE TYPES
// ============================================================

export interface Sale {
  id: number;
  invoiceNumber: string;
  customer?: CustomerBrief;
  customerName?: string;
  customerPhone?: string;
  prescriptionNumber?: string;
  doctorName?: string;
  items: SaleItem[];
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  paymentMode: PaymentMode;
  paymentReference?: string;
  status: SaleStatus;
  notes?: string;
  soldBy: UserBrief;
  createdAt: string;
  updatedAt: string;
}

export interface SaleDetail extends Sale {
  returnHistory?: SaleReturn[];
  gstBreakdown: GSTBreakdown[];
}

export interface SaleItem {
  id: number;
  saleId: number;
  medicine: MedicineBrief;
  batch: InventoryBatch;
  quantity: number;
  unitPrice: number;
  mrp: number;
  discountPercent: number;
  discountAmount: number;
  gstPercent: number;
  gstAmount: number;
  totalAmount: number;
}

export interface GSTBreakdown {
  gstPercent: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalGST: number;
}

export interface SaleReturn {
  id: number;
  saleId: number;
  returnedItems: SaleItem[];
  refundAmount: number;
  reason: string;
  returnedBy: UserBrief;
  createdAt: string;
}

export type PaymentMode = 'cash' | 'card' | 'upi' | 'netbanking' | 'credit' | 'insurance';
export type SaleStatus = 'completed' | 'partially_returned' | 'fully_returned' | 'cancelled';

export interface SaleSummary {
  period?: string;
  date?: string;
  totalSales: number;
  totalRevenue: number;
  totalDiscount: number;
  totalTax: number;
  netRevenue: number;
  averageOrderValue: number;
  topMedicines?: Array<{ medicine: MedicineBrief; quantity: number; revenue: number }>;
  paymentBreakdown?: Record<PaymentMode, number>;
}

export interface CreateSaleDTO {
  customerId?: number;
  customerName?: string;
  customerPhone?: string;
  prescriptionNumber?: string;
  doctorName?: string;
  items: Array<{
    medicineId: number;
    batchId: number;
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
  }>;
  discountPercent?: number;
  discountAmount?: number;
  paymentMode: PaymentMode;
  paymentReference?: string;
  paidAmount: number;
  notes?: string;
}

export interface SaleFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  customerId?: number;
  status?: SaleStatus;
  paymentMode?: PaymentMode;
  dateFrom?: string;
  dateTo?: string;
  ordering?: string;
}

// ============================================================
// PURCHASE TYPES
// ============================================================

export interface Purchase {
  id: number;
  purchaseOrderNumber: string;
  supplier: SupplierBrief;
  invoiceNumber?: string;
  invoiceDate?: string;
  expectedDeliveryDate?: string;
  receivedDate?: string;
  items: PurchaseItem[];
  subtotal: number;
  taxAmount: number;
  otherCharges: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: PurchasePaymentStatus;
  status: PurchaseStatus;
  notes?: string;
  createdBy: UserBrief;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseDetail extends Purchase {
  grnNumber?: string;
  receivedBy?: UserBrief;
  receivedItems?: PurchaseItem[];
}

export interface PurchaseItem {
  id: number;
  purchaseId: number;
  medicine: MedicineBrief;
  orderedQuantity: number;
  receivedQuantity?: number;
  freeQuantity: number;
  purchasePrice: number;
  sellingPrice: number;
  mrp: number;
  gstPercent: number;
  gstAmount: number;
  totalAmount: number;
  batchNumber?: string;
  expiryDate?: string;
  manufacturingDate?: string;
}

export type PurchaseStatus = 'draft' | 'ordered' | 'partially_received' | 'received' | 'cancelled';
export type PurchasePaymentStatus = 'unpaid' | 'partial' | 'paid' | 'overdue';

export interface CreatePurchaseDTO {
  supplierId: number;
  invoiceNumber?: string;
  invoiceDate?: string;
  expectedDeliveryDate?: string;
  items: Array<{
    medicineId: number;
    orderedQuantity: number;
    freeQuantity?: number;
    purchasePrice: number;
    sellingPrice: number;
    mrp: number;
    gstPercent: number;
  }>;
  otherCharges?: number;
  discount?: number;
  notes?: string;
}

export type UpdatePurchaseDTO = Partial<CreatePurchaseDTO> & {
  status?: PurchaseStatus;
  paymentStatus?: PurchasePaymentStatus;
  paidAmount?: number;
};

export interface PurchaseFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  supplierId?: number;
  status?: PurchaseStatus;
  paymentStatus?: PurchasePaymentStatus;
  dateFrom?: string;
  dateTo?: string;
  ordering?: string;
}

// ============================================================
// SUPPLIER TYPES
// ============================================================

export interface Supplier {
  id: number;
  name: string;
  contactPerson?: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstNumber?: string;
  drugLicenseNumber?: string;
  creditDays: number;
  creditLimit: number;
  outstandingAmount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierBrief {
  id: number;
  name: string;
  phone?: string;
  gstNumber?: string;
}

// ============================================================
// CUSTOMER TYPES
// ============================================================

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  loyaltyPoints: number;
  totalPurchases: number;
  lastVisit?: string;
  allergies?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerBrief {
  id: number;
  name: string;
  phone: string;
}

// ============================================================
// COMMON TYPES
// ============================================================

export interface UserBrief {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface ApiError {
  message: string;
  detail?: string;
  errors?: Record<string, string[]>;
  statusCode?: number;
}

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

export interface DateRange {
  from: Date | undefined;
  to?: Date | undefined;
}

export interface TableFilter {
  id: string;
  value: unknown;
}

export interface SortConfig {
  id: string;
  desc: boolean;
}
