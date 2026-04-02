import { Pool } from 'pg';
import { Invoice, InvoiceItem, CreateInvoiceRequest } from '../models/Invoice';
import pool from '../models/database';

export class InvoiceService {
  async getAllInvoices(): Promise<Invoice[]> {
    const query = `
      SELECT i.*, 
             JSON_AGG(
               JSON_BUILD_OBJECT(
                 'id', ii.id,
                 'description', ii.description,
                 'quantity', ii.quantity,
                 'unitPrice', ii.unit_price,
                 'totalPrice', (ii.quantity * ii.unit_price)
               )
             ) as items
      FROM invoices i
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
      GROUP BY i.id
      ORDER BY i.created_at DESC
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }

  async getInvoiceById(id: string): Promise<Invoice | null> {
    const query = `
      SELECT i.*, 
             JSON_AGG(
               JSON_BUILD_OBJECT(
                 'id', ii.id,
                 'description', ii.description,
                 'quantity', ii.quantity,
                 'unitPrice', ii.unit_price,
                 'totalPrice', (ii.quantity * ii.unit_price)
               )
             ) as items
      FROM invoices i
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
      WHERE i.id = $1
      GROUP BY i.id
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async createInvoice(invoiceData: CreateInvoiceRequest): Promise<Invoice> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Calculate total amount
      const totalAmount = invoiceData.items.reduce(
        (sum, item) => sum + (item.quantity * item.unitPrice),
        0
      );
      
      // Insert invoice
      const invoiceQuery = `
        INSERT INTO invoices (client_name, client_email, client_address, due_date, total_amount)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const invoiceResult = await client.query(invoiceQuery, [
        invoiceData.client_name,
        invoiceData.client_email,
        invoiceData.client_address,
        invoiceData.due_date,
        totalAmount
      ]);
      
      const invoice = invoiceResult.rows[0];
      
      // Insert invoice items
      for (const item of invoiceData.items) {
        const itemQuery = `
          INSERT INTO invoice_items (invoice_id, description, quantity, unit_price)
          VALUES ($1, $2, $3, $4)
        `;
        await client.query(itemQuery, [
          invoice.id,
          item.description,
          item.quantity,
          item.unitPrice
        ]);
      }
      
      await client.query('COMMIT');
      
      // Return the complete invoice with items
      const finalInvoice = await this.getInvoiceById(invoice.id);
      return finalInvoice!;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateInvoiceStatus(id: string, status: 'draft' | 'published' | 'paid', stripePaymentLinkId?: string, stripePaymentUrl?: string): Promise<Invoice | null> {
    const query = `
      UPDATE invoices 
      SET status = $1, stripe_payment_link_id = $2, stripe_payment_url = $3
      WHERE id = $4
      RETURNING *
    `;
    
    const result = await pool.query(query, [status, stripePaymentLinkId, stripePaymentUrl, id]);
    
    if (result.rows[0]) {
      return await this.getInvoiceById(result.rows[0].id);
    }
    
    return null;
  }
}
