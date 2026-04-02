export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Invoice {
  id: string;
  client_name: string;
  client_email: string;
  client_address: string;
  due_date: string;
  status: 'draft' | 'published' | 'paid';
  currency: string;
  total_amount: number;
  stripe_payment_link_id?: string;
  stripe_payment_url?: string;
  created_at: string;
  updated_at: string;
  items: InvoiceItem[];
}

export interface CreateInvoiceRequest {
  client_name: string;
  client_email: string;
  client_address: string;
  due_date: string;
  currency: string;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
  }[];
}
