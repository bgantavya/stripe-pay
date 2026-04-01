import express from 'express';
import { InvoiceService } from '../services/invoiceService';
import { CreateInvoiceRequest } from '../models/Invoice';

const router = express.Router();
const invoiceService = new InvoiceService();

router.get('/', async (req, res) => {
  try {
    const invoices = await invoiceService.getAllInvoices();
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const invoice = await invoiceService.getInvoiceById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

router.post('/', async (req, res) => {
  try {
    const invoiceData: CreateInvoiceRequest = req.body;
    console.log(invoiceData)
    // Basic validation
    if (!invoiceData.client_name || !invoiceData.client_email || !invoiceData.due_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!invoiceData.items || invoiceData.items.length === 0) {
      return res.status(400).json({ error: 'Invoice must have at least one item' });
    }
    
    const invoice = await invoiceService.createInvoice(invoiceData);
    res.status(201).json(invoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    res.status(500).json({ error: 'Failed to create invoice', details: String(error) });
  }
});

router.put('/:id/publish', async (req, res) => {
  try {
    const invoice = await invoiceService.getInvoiceById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    if (invoice.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft invoices can be published' });
    }
    
    // This will be updated to include Stripe payment link generation
    const updatedInvoice = await invoiceService.updateInvoiceStatus(req.params.id, 'published');
    if (updatedInvoice) {
      res.json(updatedInvoice);
    } else {
      res.status(500).json({ error: 'Failed to update invoice status' });
    }
  } catch (error) {
    console.error('Error publishing invoice:', error);
    res.status(500).json({ error: 'Failed to publish invoice' });
  }
});

export default router;
