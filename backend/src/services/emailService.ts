import nodemailer from 'nodemailer';
import { Invoice } from '../models/Invoice';

const getCurrencySymbol = (currency: string): string => {
  switch (currency?.toLowerCase()) {
    case 'usd': return '$';
    case 'inr': return '₹';
    default: return '$';
  }
};

const formatAmount = (amount: number, currency: string): string => {
  return `${getCurrencySymbol(currency)}${amount.toFixed(2)}`;
};

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure email transport based on environment variables
    const emailProvider = process.env.EMAIL_PROVIDER || 'resend';
    
    if (emailProvider === 'resend') {
      // Resend SMTP configuration
      this.transporter = nodemailer.createTransport({
        host: 'smtp.resend.com',
        port: 465,
        secure: true,
        auth: {
          user: 'resend',
          pass: process.env.RESEND_API_KEY,
        },
      });
    } else {
      // Generic SMTP configuration (SendGrid, Gmail, etc.)
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
    }
  }

  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      const fromEmail = process.env.FROM_EMAIL || 'invoices@devslane.com';
      const fromName = process.env.FROM_NAME || 'Devslane Invoices';
      
      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        html,
      });
      console.log(`Email sent successfully to ${to}`);
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  public async sendInvoicePublishedEmail(invoice: Invoice, paymentLink: string): Promise<void> {
    const invoiceNumber = `DL-${invoice.id.slice(0, 8).toUpperCase()}`;
    const subject = `🧾 Invoice ${invoiceNumber} from Devslane - Payment Required`;
    
    const itemsHtml = invoice.items.map(item => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 12px; text-align: left;">${item.description}</td>
        <td style="padding: 12px; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; text-align: right;">${formatAmount(item.unit_price, invoice.currency)}</td>
        <td style="padding: 12px; text-align: right; font-weight: bold;">${formatAmount(item.total_price, invoice.currency)}</td>
      </tr>
    `).join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Devslane</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Invoice Payment System</p>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
          <p style="font-size: 16px; color: #333;">Hi ${invoice.client_name},</p>
          
          <p style="font-size: 16px; color: #555; line-height: 1.6;">
            You have a new invoice from <strong>Devslane</strong> waiting for payment. Please review the details below and click the button to complete your payment securely via Stripe.
          </p>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4F46E5;">
            <h3 style="margin: 0 0 15px 0; color: #333;">📄 Invoice Details</h3>
            <p style="margin: 5px 0; color: #666;"><strong>Invoice Number:</strong> ${invoiceNumber}</p>
            <p style="margin: 5px 0; color: #666;"><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p style="margin: 5px 0; color: #666;"><strong>Status:</strong> <span style="color: #F59E0B; font-weight: bold;">⏳ Pending Payment</span></p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #4F46E5; color: white;">
                <th style="padding: 12px; text-align: left;">Description</th>
                <th style="padding: 12px; text-align: center;">Qty</th>
                <th style="padding: 12px; text-align: right;">Unit Price</th>
                <th style="padding: 12px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="text-align: right; padding: 20px; background: #f8f9fa; border-radius: 8px; border: 2px solid #4F46E5;">
            <p style="margin: 0; font-size: 14px; color: #666;">Total Amount Due</p>
            <p style="margin: 5px 0 0 0; font-size: 32px; font-weight: bold; color: #4F46E5;">${formatAmount(invoice.total_amount, invoice.currency)}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${paymentLink}" style="display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 18px 50px; text-decoration: none; border-radius: 50px; font-size: 18px; font-weight: bold; box-shadow: 0 4px 15px rgba(79, 70, 229, 0.4);">
              💳 Pay Securely Now →
            </a>
          </div>

          <p style="font-size: 12px; color: #999; text-align: center; margin-top: 20px;">
            Secure payment powered by Stripe. Or copy this link:<br>
            <code style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px; font-size: 11px;">${paymentLink}</code>
          </p>
        </div>

        <div style="background: #1F2937; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; color: #9CA3AF;">
          <p style="font-size: 14px; margin: 0 0 10px 0; color: white; font-weight: bold;">Devslane</p>
          <p style="font-size: 12px; margin: 0;">
            This is an automated invoice from Devslane.<br>
            Questions? Reply to this email or contact support@devslane.com
          </p>
        </div>
      </div>
    `;

    await this.sendEmail(invoice.client_email, subject, html);
  }

  public async sendPaymentConfirmationEmail(invoice: Invoice): Promise<void> {
    const invoiceNumber = `DL-${invoice.id.slice(0, 8).toUpperCase()}`;
    const subject = `✅ Payment Confirmed - Invoice ${invoiceNumber} from Devslane`;

    const itemsHtml = invoice.items.map(item => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 12px; text-align: left;">${item.description}</td>
        <td style="padding: 12px; text-align: right; font-weight: bold;">${formatAmount(item.total_price, invoice.currency)}</td>
      </tr>
    `).join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Devslane</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">✅ Payment Confirmed!</p>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
          <p style="font-size: 16px; color: #333;">Hi ${invoice.client_name},</p>
          
          <p style="font-size: 16px; color: #555; line-height: 1.6;">
            Thank you for your payment to <strong>Devslane</strong>! We've successfully received your payment for the invoice below.
          </p>

          <div style="background: #D1FAE5; border: 2px solid #10B981; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; font-size: 14px; color: #065F46;">Payment Status</p>
            <p style="margin: 10px 0 0 0; font-size: 28px; font-weight: bold; color: #10B981;">✅ PAID</p>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #065F46;">Paid on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981;">
            <h3 style="margin: 0 0 15px 0; color: #333;">📄 Invoice Summary</h3>
            <p style="margin: 5px 0; color: #666;"><strong>Invoice Number:</strong> ${invoiceNumber}</p>
            <p style="margin: 5px 0; color: #666;"><strong>Status:</strong> <span style="color: #10B981; font-weight: bold;">✅ Paid</span></p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #10B981; color: white;">
                <th style="padding: 12px; text-align: left;">Description</th>
                <th style="padding: 12px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="text-align: right; padding: 20px; background: #f8f9fa; border-radius: 8px; border: 2px solid #10B981;">
            <p style="margin: 0; font-size: 14px; color: #666;">Total Paid</p>
            <p style="margin: 5px 0 0 0; font-size: 32px; font-weight: bold; color: #10B981;">${formatAmount(invoice.total_amount, invoice.currency)}</p>
          </div>

          <div style="text-align: center; margin: 30px 0; padding: 20px; background: #D1FAE5; border-radius: 8px;">
            <p style="font-size: 16px; color: #065F46; margin: 0; font-weight: bold;">🎉 Thank you for your business!</p>
            <p style="font-size: 14px; color: #059669; margin: 10px 0 0 0;">A receipt has been sent to your email.</p>
          </div>
        </div>

        <div style="background: #1F2937; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; color: #9CA3AF;">
          <p style="font-size: 14px; margin: 0 0 10px 0; color: white; font-weight: bold;">Devslane</p>
          <p style="font-size: 12px; margin: 0;">
            This is a payment confirmation for your records.<br>
            Questions? Reply to this email or contact support@devslane.com
          </p>
        </div>
      </div>
    `;

    await this.sendEmail(invoice.client_email, subject, html);
  }
}

export const emailService = new EmailService();
