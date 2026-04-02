import { Invoice, CreateInvoiceRequest } from '../types/invoice';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

// Transform snake_case to camelCase for frontend
export const transformInvoice = (data: any): Invoice => ({
  id: data.id,
  clientName: data.client_name,
  clientEmail: data.client_email,
  clientAddress: data.client_address,
  dueDate: data.due_date,
  status: data.status,
  totalAmount: parseFloat(data.total_amount) || 0,
  stripePaymentLinkId: data.stripe_payment_link_id,
  stripePaymentUrl: data.stripe_payment_url,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
  items: (data.items || []).map((item: any) => ({
    id: item.id,
    description: item.description,
    quantity: parseInt(item.quantity) || 0,
    unitPrice: parseFloat(item.unit_price || item.unitPrice) || 0,
    totalPrice: parseFloat(item.total_price || item.totalPrice) || 0,
  })),
});

export const api = {
  async getInvoices(): Promise<Invoice[]> {
    const response = await fetch(`${API_BASE_URL}/invoices`);
    if (!response.ok) {
      throw new Error('Failed to fetch invoices');
    }
    const data = await response.json();
    return data.map(transformInvoice);
  },

  async getInvoice(id: string): Promise<Invoice> {
    const response = await fetch(`${API_BASE_URL}/invoices/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch invoice');
    }
    const data = await response.json();
    return transformInvoice(data);
  },

  async createInvoice(invoice: CreateInvoiceRequest): Promise<Invoice> {
    // Transform camelCase to snake_case for backend
    const transformedData = {
      client_name: invoice.clientName,
      client_email: invoice.clientEmail,
      client_address: invoice.clientAddress,
      due_date: invoice.dueDate,
      items: invoice.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }))
    };
    
    const response = await fetch(`${API_BASE_URL}/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transformedData),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to create invoice');
    }
    const data = await response.json();
    return transformInvoice(data);
  },

  async publishInvoice(id: string): Promise<Invoice> {
    const response = await fetch(`${API_BASE_URL}/invoices/${id}/publish`, {
      method: 'PUT',
    });
    if (!response.ok) {
      throw new Error('Failed to publish invoice');
    }
    const data = await response.json();
    return transformInvoice(data);
  },
};
