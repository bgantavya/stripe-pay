export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Invoice {
  id: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  dueDate: string;
  status: 'draft' | 'published' | 'paid';
  currency: string;
  totalAmount: number;
  stripePaymentLinkId?: string;
  stripePaymentUrl?: string;
  createdAt: string;
  updatedAt: string;
  items: InvoiceItem[];
}

export interface CreateInvoiceRequest {
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  dueDate: string;
  currency: string;
  items: Omit<InvoiceItem, 'id' | 'totalPrice'>[];
}
