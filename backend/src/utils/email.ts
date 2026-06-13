import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import { GSTSummary } from './gst';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface InvoiceEmailData {
  to: string;
  customerName: string;
  invoiceNumber: string;
  invoiceDate: string;
  pharmacyName: string;
  pharmacyAddress: string;
  pharmacyPhone: string;
  pharmacyGSTIN?: string;
  gstSummary: GSTSummary;
  paymentMethod: string;
  attachmentBuffer?: Buffer;
  attachmentFilename?: string;
}

interface OTPEmailData {
  to: string;
  name: string;
  otp: string;
  purpose: 'LOGIN' | 'PASSWORD_RESET' | 'EMAIL_VERIFICATION';
  expiryMinutes: number;
}

interface LowStockAlertData {
  to: string[];
  pharmacyName: string;
  items: Array<{
    medicineName: string;
    batchNumber: string;
    currentStock: number;
    reorderLevel: number;
    unit: string;
  }>;
}

interface ExpiryAlertData {
  to: string[];
  pharmacyName: string;
  items: Array<{
    medicineName: string;
    batchNumber: string;
    expiryDate: string;
    quantity: number;
    daysUntilExpiry: number;
  }>;
}

const createTransporter = (): Transporter => {
  if (process.env.SMTP_HOST) {
    const config: EmailConfig = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    };
    return nodemailer.createTransport(config);
  }

  // Use AWS SES if configured
  if (process.env.AWS_SES_REGION) {
    return nodemailer.createTransport({
      SES: {
        region: process.env.AWS_SES_REGION,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    } as any);
  }

  // Fallback to ethereal for development
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: process.env.DEV_EMAIL_USER || '',
      pass: process.env.DEV_EMAIL_PASS || '',
    },
  });
};

let transporter: Transporter | null = null;

const getTransporter = (): Transporter => {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
};

const FROM_ADDRESS = process.env.EMAIL_FROM || 'noreply@pharmacy-erp.com';
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'Pharmacy ERP';

export const sendInvoiceEmail = async (data: InvoiceEmailData): Promise<void> => {
  const html = generateInvoiceEmailHTML(data);

  const mailOptions: SendMailOptions = {
    from: `"${FROM_NAME}" <${FROM_ADDRESS}>`,
    to: data.to,
    subject: `Invoice #${data.invoiceNumber} from ${data.pharmacyName}`,
    html,
    text: generateInvoiceEmailText(data),
  };

  if (data.attachmentBuffer && data.attachmentFilename) {
    mailOptions.attachments = [
      {
        filename: data.attachmentFilename,
        content: data.attachmentBuffer,
        contentType: 'application/pdf',
      },
    ];
  }

  try {
    const info = await getTransporter().sendMail(mailOptions);
    console.log(`[Email] Invoice email sent to ${data.to}, messageId: ${info.messageId}`);
  } catch (error) {
    console.error('[Email] Failed to send invoice email:', error);
    throw new Error(`Failed to send invoice email: ${(error as Error).message}`);
  }
};

export const sendOTPEmail = async (data: OTPEmailData): Promise<void> => {
  const subjectMap = {
    LOGIN: 'Your Login OTP',
    PASSWORD_RESET: 'Password Reset OTP',
    EMAIL_VERIFICATION: 'Email Verification OTP',
  };

  const html = generateOTPEmailHTML(data);

  const mailOptions: SendMailOptions = {
    from: `"${FROM_NAME}" <${FROM_ADDRESS}>`,
    to: data.to,
    subject: `${subjectMap[data.purpose]} - ${FROM_NAME}`,
    html,
    text: `Your OTP is: ${data.otp}. Valid for ${data.expiryMinutes} minutes. Do not share this with anyone.`,
  };

  try {
    const info = await getTransporter().sendMail(mailOptions);
    console.log(`[Email] OTP email sent to ${data.to}, messageId: ${info.messageId}`);
  } catch (error) {
    console.error('[Email] Failed to send OTP email:', error);
    throw new Error(`Failed to send OTP email: ${(error as Error).message}`);
  }
};

export const sendLowStockAlert = async (data: LowStockAlertData): Promise<void> => {
  const html = generateLowStockHTML(data);

  const mailOptions: SendMailOptions = {
    from: `"${FROM_NAME}" <${FROM_ADDRESS}>`,
    to: data.to,
    subject: `[ACTION REQUIRED] Low Stock Alert - ${data.pharmacyName}`,
    html,
    priority: 'high',
  };

  try {
    await getTransporter().sendMail(mailOptions);
    console.log(`[Email] Low stock alert sent to ${data.to.join(', ')}`);
  } catch (error) {
    console.error('[Email] Failed to send low stock alert:', error);
    throw error;
  }
};

export const sendExpiryAlert = async (data: ExpiryAlertData): Promise<void> => {
  const html = generateExpiryAlertHTML(data);

  const mailOptions: SendMailOptions = {
    from: `"${FROM_NAME}" <${FROM_ADDRESS}>`,
    to: data.to,
    subject: `[ACTION REQUIRED] Medicine Expiry Alert - ${data.pharmacyName}`,
    html,
    priority: 'high',
  };

  try {
    await getTransporter().sendMail(mailOptions);
    console.log(`[Email] Expiry alert sent to ${data.to.join(', ')}`);
  } catch (error) {
    console.error('[Email] Failed to send expiry alert:', error);
    throw error;
  }
};

export const verifyEmailConnection = async (): Promise<boolean> => {
  try {
    await getTransporter().verify();
    console.log('[Email] SMTP connection verified successfully.');
    return true;
  } catch (error) {
    console.error('[Email] SMTP connection verification failed:', error);
    return false;
  }
};

// HTML Generators
const generateInvoiceEmailHTML = (data: InvoiceEmailData): string => {
  const { gstSummary } = data;
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice #${data.invoiceNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 25px; }
    .pharmacy-name { font-size: 24px; font-weight: bold; color: #2563eb; }
    .invoice-title { font-size: 18px; color: #666; margin-top: 5px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
    .info-item label { font-size: 12px; color: #888; text-transform: uppercase; }
    .info-item p { font-size: 14px; font-weight: 600; margin: 2px 0; }
    .summary-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    .summary-table th { background: #f0f4ff; color: #2563eb; padding: 10px; text-align: left; }
    .summary-table td { padding: 8px 10px; border-bottom: 1px solid #eee; }
    .total-row { font-weight: bold; background: #f9f9f9; }
    .grand-total { font-size: 16px; color: #2563eb; font-weight: bold; }
    .footer { margin-top: 30px; text-align: center; color: #888; font-size: 12px; }
    .tag { background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="pharmacy-name">${data.pharmacyName}</div>
      <div class="invoice-title">Tax Invoice</div>
      <div style="font-size: 12px; color: #888; margin-top: 5px;">${data.pharmacyAddress} | ${data.pharmacyPhone}${data.pharmacyGSTIN ? ` | GSTIN: ${data.pharmacyGSTIN}` : ''}</div>
    </div>
    <div class="info-grid">
      <div class="info-item">
        <label>Invoice Number</label>
        <p>${data.invoiceNumber}</p>
      </div>
      <div class="info-item">
        <label>Invoice Date</label>
        <p>${data.invoiceDate}</p>
      </div>
      <div class="info-item">
        <label>Customer</label>
        <p>${data.customerName}</p>
      </div>
      <div class="info-item">
        <label>Payment Method</label>
        <p><span class="tag">${data.paymentMethod}</span></p>
      </div>
    </div>
    <table class="summary-table">
      <thead>
        <tr>
          <th>Description</th>
          <th>Qty</th>
          <th>Rate</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${gstSummary.lineItems.map(item => `
        <tr>
          <td>${item.description}</td>
          <td>${item.quantity}</td>
          <td>&#8377;${item.unitPrice.toFixed(2)}</td>
          <td>&#8377;${item.taxableAmount.toFixed(2)}</td>
        </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr class="total-row"><td colspan="3">Subtotal</td><td>&#8377;${gstSummary.subTotal.toFixed(2)}</td></tr>
        ${gstSummary.totalDiscount > 0 ? `<tr><td colspan="3">Discount</td><td>-&#8377;${gstSummary.totalDiscount.toFixed(2)}</td></tr>` : ''}
        ${gstSummary.totalCGST > 0 ? `<tr><td colspan="3">CGST</td><td>&#8377;${gstSummary.totalCGST.toFixed(2)}</td></tr>` : ''}
        ${gstSummary.totalSGST > 0 ? `<tr><td colspan="3">SGST</td><td>&#8377;${gstSummary.totalSGST.toFixed(2)}</td></tr>` : ''}
        ${gstSummary.totalIGST > 0 ? `<tr><td colspan="3">IGST</td><td>&#8377;${gstSummary.totalIGST.toFixed(2)}</td></tr>` : ''}
        ${gstSummary.totalCess > 0 ? `<tr><td colspan="3">Cess</td><td>&#8377;${gstSummary.totalCess.toFixed(2)}</td></tr>` : ''}
        <tr class="grand-total"><td colspan="3">Grand Total</td><td>&#8377;${gstSummary.grandTotal.toFixed(2)}</td></tr>
      </tfoot>
    </table>
    <div class="footer">
      <p>Thank you for your purchase! This is a system-generated invoice.</p>
      <p style="color: #bbb; font-size: 11px;">Pharmacy ERP System &copy; ${new Date().getFullYear()}</p>
    </div>
  </div>
</body>
</html>`;
};

const generateInvoiceEmailText = (data: InvoiceEmailData): string => {
  return `Invoice #${data.invoiceNumber} from ${data.pharmacyName}\nDate: ${data.invoiceDate}\nCustomer: ${data.customerName}\nTotal: Rs.${data.gstSummary.grandTotal.toFixed(2)}\nPayment: ${data.paymentMethod}`;
};

const generateOTPEmailHTML = (data: OTPEmailData): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 480px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 8px; }
    .otp-box { background: #f0f4ff; border: 2px dashed #2563eb; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0; }
    .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #2563eb; }
    .warning { background: #fff7ed; border-left: 4px solid #f97316; padding: 10px 15px; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Hello, ${data.name}</h2>
    <p>Your one-time password (OTP) for <strong>${data.purpose.replace('_', ' ')}</strong>:</p>
    <div class="otp-box">
      <div class="otp-code">${data.otp}</div>
      <p style="color: #888; font-size: 13px; margin-top: 10px;">Valid for ${data.expiryMinutes} minutes</p>
    </div>
    <div class="warning">
      Never share this OTP with anyone. Our staff will never ask for your OTP.
    </div>
    <p style="color: #888; font-size: 12px; margin-top: 20px;">If you did not request this, please ignore this email or contact support immediately.</p>
  </div>
</body>
</html>`;
};

const generateLowStockHTML = (data: LowStockAlertData): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><style>
body{font-family:Arial,sans-serif;color:#333;background:#f5f5f5;padding:20px}
.container{max-width:600px;margin:0 auto;background:#fff;padding:30px;border-radius:8px}
table{width:100%;border-collapse:collapse;margin-top:15px}
th{background:#fee2e2;color:#b91c1c;padding:10px;text-align:left}
td{padding:8px 10px;border-bottom:1px solid #eee}
.badge{background:#fee2e2;color:#b91c1c;padding:2px 8px;border-radius:12px;font-size:12px}
</style></head>
<body><div class="container">
<h2 style="color:#b91c1c">Low Stock Alert - ${data.pharmacyName}</h2>
<p>The following items have fallen below reorder levels:</p>
<table><thead><tr><th>Medicine</th><th>Batch</th><th>Current Stock</th><th>Reorder Level</th></tr></thead>
<tbody>${data.items.map(i => `<tr><td>${i.medicineName}</td><td>${i.batchNumber}</td><td><span class="badge">${i.currentStock} ${i.unit}</span></td><td>${i.reorderLevel} ${i.unit}</td></tr>`).join('')}
</tbody></table>
<p style="margin-top:20px;font-size:13px;color:#888">Please reorder these items to avoid stockouts.</p>
</div></body></html>`;
};

const generateExpiryAlertHTML = (data: ExpiryAlertData): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><style>
body{font-family:Arial,sans-serif;color:#333;background:#f5f5f5;padding:20px}
.container{max-width:600px;margin:0 auto;background:#fff;padding:30px;border-radius:8px}
table{width:100%;border-collapse:collapse;margin-top:15px}
th{background:#fef3c7;color:#92400e;padding:10px;text-align:left}
td{padding:8px 10px;border-bottom:1px solid #eee}
.critical{color:#b91c1c;font-weight:bold}
.warning{color:#d97706;font-weight:bold}
</style></head>
<body><div class="container">
<h2 style="color:#92400e">Expiry Alert - ${data.pharmacyName}</h2>
<p>The following medicines are expiring soon:</p>
<table><thead><tr><th>Medicine</th><th>Batch</th><th>Expiry Date</th><th>Qty</th><th>Days Left</th></tr></thead>
<tbody>${data.items.map(i => `<tr><td>${i.medicineName}</td><td>${i.batchNumber}</td><td>${i.expiryDate}</td><td>${i.quantity}</td><td class="${i.daysUntilExpiry <= 30 ? 'critical' : 'warning'}">${i.daysUntilExpiry} days</td></tr>`).join('')}
</tbody></table>
<p style="margin-top:20px;font-size:13px;color:#888">Please take appropriate action for these items.</p>
</div></body></html>`;
};
