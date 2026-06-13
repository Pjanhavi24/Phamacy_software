import { Decimal } from '@prisma/client/runtime/library';

// ============================================================
// Enums
// ============================================================

export enum UserRole {
  ADMIN = 'ADMIN',
  PHARMACIST = 'PHARMACIST',
  CASHIER = 'CASHIER',
  VIEWER = 'VIEWER',
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  READ = 'READ',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export enum MedicineCategory {
  TABLET = 'TABLET',
  CAPSULE = 'CAPSULE',
  SYRUP = 'SYRUP',
  INJECTION = 'INJECTION',
  OINTMENT = 'OINTMENT',
  DROPS = 'DROPS',
  INHALER = 'INHALER',
  PATCH = 'PATCH',
  POWDER = 'POWDER',
  SUPPOSITORY = 'SUPPOSITORY',
  SUSPENSION = 'SUSPENSION',
  GEL = 'GEL',
  CREAM = 'CREAM',
  LOTION = 'LOTION',
  SOAP = 'SOAP',
  DEVICE = 'DEVICE',
  OTHER = 'OTHER',
}

export enum ScheduleType {
  H = 'H',       // Prescription required
  H1 = 'H1',     // Hospital use only
  X = 'X',       // Special controlled
  G = 'G',       // Over-the-counter
  OTC = 'OTC',   // No restriction
}

export enum SaleStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  UPI = 'UPI',
  NET_BANKING = 'NET_BANKING',
  INSURANCE = 'INSURANCE',
  CREDIT = 'CREDIT',
}

export enum PurchaseStatus {
  DRAFT = 'DRAFT',
  ORDERED = 'ORDERED',
  PARTIAL_RECEIVED = 'PARTIAL_RECEIVED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED',
}

export enum StockAdjustmentReason {
  DAMAGE = 'DAMAGE',
  EXPIRY = 'EXPIRY',
  THEFT = 'THEFT',
  CORRECTION = 'CORRECTION',
  RETURN = 'RETURN',
  OPENING_STOCK = 'OPENING_STOCK',
  AUDIT = 'AUDIT',
}

export enum ReturnType {
  SALE_RETURN = 'SALE_RETURN',
  PURCHASE_RETURN = 'PURCHASE_RETURN',
}

// ============================================================
// JWT
// ============================================================

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  pharmacyId: string;
  name: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];
}

// ============================================================
// Pharmacy
// ============================================================

export interface PharmacyProfile {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  gstin?: string;
  drugLicenseNumber?: string;
  logoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// User
// ============================================================

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  pharmacyId: string;
  phone?: string;
  profilePictureUrl?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// Medicine
// ============================================================

export interface Medicine {
  id: string;
  name: string;
  genericName: string;
  brand: string;
  manufacturer: string;
  category: MedicineCategory;
  scheduleType: ScheduleType;
  hsnCode?: string;
  barcode?: string;
  unit: string;
  packSize: number;
  gstRate: number;
  description?: string;
  sideEffects?: string;
  contraindications?: string;
  storageConditions?: string;
  prescriptionRequired: boolean;
  isActive: boolean;
  reorderLevel: number;
  pharmacyId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Batch {
  id: string;
  medicineId: string;
  batchNumber: string;
  expiryDate: Date;
  manufacturingDate?: Date;
  quantity: number;
  availableQuantity: number;
  purchasePrice: number;
  sellingPrice: number;
  mrp: number;
  supplierId?: string;
  purchaseId?: string;
  barcode?: string;
  isActive: boolean;
  pharmacyId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MedicineWithBatch extends Medicine {
  batches: Batch[];
  totalStock: number;
  nearestExpiry?: Date;
  lowestSellingPrice?: number;
}

export interface MedicineSummary {
  id: string;
  name: string;
  genericName: string;
  brand: string;
  category: MedicineCategory;
  totalStock: number;
  reorderLevel: number;
  isLowStock: boolean;
  unit: string;
  batches: Array<{
    batchNumber: string;
    expiryDate: Date;
    availableQuantity: number;
    sellingPrice: number;
    mrp: number;
  }>;
}

// ============================================================
// Supplier
// ============================================================

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  drugLicenseNumber?: string;
  creditLimit?: number;
  creditDays?: number;
  isActive: boolean;
  pharmacyId: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// Purchase
// ============================================================

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  medicineId: string;
  batchNumber: string;
  expiryDate: Date;
  quantity: number;
  receivedQuantity: number;
  freeQuantity: number;
  purchasePrice: number;
  sellingPrice: number;
  mrp: number;
  discount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalAmount: number;
  medicine?: Medicine;
}

export interface Purchase {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date;
  receivedDate?: Date;
  supplierId: string;
  status: PurchaseStatus;
  subTotal: number;
  totalDiscount: number;
  totalTaxableAmount: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  totalCess: number;
  totalTax: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  notes?: string;
  documentUrl?: string;
  pharmacyId: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseWithItems extends Purchase {
  items: PurchaseItem[];
  supplier: Supplier;
  createdBy: UserProfile;
}

// ============================================================
// Sale
// ============================================================

export interface SaleItem {
  id: string;
  saleId: string;
  medicineId: string;
  batchId: string;
  medicineName: string;
  batchNumber: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalAmount: number;
  gstRate: number;
  medicine?: Medicine;
  batch?: Batch;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  saleDate: Date;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  prescriptionId?: string;
  status: SaleStatus;
  paymentMethod: PaymentMethod;
  subTotal: number;
  totalDiscount: number;
  totalTaxableAmount: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  totalCess: number;
  totalTax: number;
  grandTotal: number;
  paidAmount: number;
  changeAmount: number;
  notes?: string;
  pharmacyId: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaleWithItems extends Sale {
  items: SaleItem[];
  prescription?: Prescription;
  createdBy: UserProfile;
}

// ============================================================
// Prescription
// ============================================================

export interface Prescription {
  id: string;
  patientName: string;
  patientAge?: number;
  patientGender?: string;
  patientPhone?: string;
  doctorName?: string;
  doctorRegistrationNumber?: string;
  prescriptionDate?: Date;
  imageUrls: string[];
  notes?: string;
  isVerified: boolean;
  verifiedById?: string;
  pharmacyId: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// Inventory
// ============================================================

export interface StockAdjustment {
  id: string;
  batchId: string;
  medicineId: string;
  reason: StockAdjustmentReason;
  previousQuantity: number;
  adjustedQuantity: number;
  newQuantity: number;
  notes?: string;
  pharmacyId: string;
  createdById: string;
  createdAt: Date;
  medicine?: Medicine;
  batch?: Batch;
}

export interface InventoryItem {
  medicineId: string;
  medicineName: string;
  genericName: string;
  brand: string;
  category: MedicineCategory;
  unit: string;
  totalStock: number;
  reservedStock: number;
  availableStock: number;
  reorderLevel: number;
  isLowStock: boolean;
  batches: Array<{
    batchId: string;
    batchNumber: string;
    expiryDate: Date;
    availableQuantity: number;
    sellingPrice: number;
    mrp: number;
    daysUntilExpiry: number;
    isExpiringSoon: boolean;
    isExpired: boolean;
  }>;
}

// ============================================================
// Reports
// ============================================================

export interface SalesReport {
  period: {
    from: Date;
    to: Date;
  };
  totalSales: number;
  totalRevenue: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  totalTax: number;
  totalDiscount: number;
  netRevenue: number;
  averageSaleValue: number;
  topMedicines: Array<{
    medicineId: string;
    medicineName: string;
    quantitySold: number;
    revenue: number;
  }>;
  salesByPaymentMethod: Record<PaymentMethod, { count: number; amount: number }>;
  dailyBreakdown: Array<{
    date: string;
    salesCount: number;
    revenue: number;
  }>;
}

export interface PurchaseReport {
  period: {
    from: Date;
    to: Date;
  };
  totalPurchases: number;
  totalAmount: number;
  totalTax: number;
  topSuppliers: Array<{
    supplierId: string;
    supplierName: string;
    purchaseCount: number;
    totalAmount: number;
  }>;
  topMedicines: Array<{
    medicineId: string;
    medicineName: string;
    quantityPurchased: number;
    totalAmount: number;
  }>;
}

export interface StockReport {
  generatedAt: Date;
  totalMedicines: number;
  totalBatches: number;
  totalStockValue: number;
  lowStockItems: MedicineSummary[];
  expiringSoonItems: Array<{
    medicineId: string;
    medicineName: string;
    batchNumber: string;
    expiryDate: Date;
    quantity: number;
    daysUntilExpiry: number;
  }>;
  expiredItems: Array<{
    medicineId: string;
    medicineName: string;
    batchNumber: string;
    expiryDate: Date;
    quantity: number;
  }>;
  outOfStockItems: Medicine[];
}

export interface GSTReport {
  period: {
    from: Date;
    to: Date;
  };
  pharmacyGSTIN: string;
  totalTaxableValue: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  totalCess: number;
  totalTax: number;
  gstR1: Array<{
    invoiceNumber: string;
    invoiceDate: Date;
    customerGSTIN?: string;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalValue: number;
  }>;
  gstByRate: Record<string, {
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalTax: number;
  }>;
}

// ============================================================
// Pagination & Filters
// ============================================================

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface DateRangeFilter {
  from?: Date;
  to?: Date;
}

export interface MedicineFilter {
  search?: string;
  category?: MedicineCategory;
  scheduleType?: ScheduleType;
  isLowStock?: boolean;
  isExpiringSoon?: boolean;
  isActive?: boolean;
  supplierId?: string;
}

export interface SaleFilter extends DateRangeFilter {
  status?: SaleStatus;
  paymentMethod?: PaymentMethod;
  createdById?: string;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface PurchaseFilter extends DateRangeFilter {
  status?: PurchaseStatus;
  supplierId?: string;
  search?: string;
}

// ============================================================
// Misc
// ============================================================

export interface DashboardStats {
  todaySales: number;
  todayRevenue: number;
  totalMedicines: number;
  lowStockCount: number;
  expiringSoonCount: number;
  expiredCount: number;
  pendingPurchases: number;
  monthlyRevenue: number;
  monthlyGrowth: number;
  recentSales: SaleWithItems[];
  recentPurchases: PurchaseWithItems[];
}

export interface SearchResult {
  medicines: MedicineSummary[];
  total: number;
}

export interface BarcodeSearchResult {
  found: boolean;
  medicine?: MedicineWithBatch;
  batch?: Batch;
  error?: string;
}
