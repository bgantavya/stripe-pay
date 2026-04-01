import express from 'express';
import Stripe from 'stripe';
import { InvoiceService } from '../services/invoiceService';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const invoiceService = new InvoiceService();

router.post('/create-link', async (req, res) => {
  try {
    const { invoiceId } = req.body;
    
    if (!invoiceId) {
      return res.status(400).json({ error: 'Invoice ID is required' });
    }
    
    const invoice = await invoiceService.getInvoiceById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    if (invoice.status !== 'draft' && invoice.status !== 'published') {
      return res.status(400).json({ error: 'Only draft or published invoices can generate payment links' });
    }
    
    // Create Stripe payment link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: invoice.items.map((item: any) => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.description,
          },
          unit_amount: Math.round(item.unitPrice * 100), // Convert to cents
        },
        quantity: item.quantity,
      })),
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        },
      },
      allow_promotion_codes: false,
      billing_address_collection: 'auto',
    });
    
    // Update invoice with payment link ID and status
    const updatedInvoice = await invoiceService.updateInvoiceStatus(
      invoiceId,
      'published',
      paymentLink.id,
      paymentLink.url
    );
    
    res.json({
      paymentLink: paymentLink.url,
      paymentLinkId: paymentLink.id,
      invoice: updatedInvoice,
    });
  } catch (error: any) {
    console.error('Error creating payment link:', error);
    console.error('Stripe error details:', error.message);
    if (error.type) console.error('Stripe error type:', error.type);
    if (error.raw) console.error('Stripe raw error:', error.raw);
    res.status(500).json({ error: 'Failed to create payment link', details: error.message });
  }
});

router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  
  let event: Stripe.Event;
  
  // req.body is a Buffer when using express.raw()
  const payload = req.body;
  
  try {
    event = stripe.webhooks.constructEvent(payload, sig!, webhookSecret);
  } catch (err: any) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  try {
    switch (event.type) {
      case 'payment_link.created':
        console.log('Payment link created:', event.data.object);
        break;
        
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        const paymentLinkId = session.payment_link;
        
        if (paymentLinkId) {
          // Find invoice by payment link ID and mark as paid
          const invoices = await invoiceService.getAllInvoices();
          const invoice = invoices.find(inv => inv.stripe_payment_link_id === paymentLinkId);
          
          if (invoice) {
            await invoiceService.updateInvoiceStatus(invoice.id, 'paid');
            console.log(`Invoice ${invoice.id} marked as paid`);
            
            // Deactivate the payment link so it can't be used again
            try {
              await stripe.paymentLinks.update(paymentLinkId as string, { active: false });
              console.log(`Payment link ${paymentLinkId} deactivated`);
            } catch (deactivateError) {
              console.error('Failed to deactivate payment link:', deactivateError);
            }
          }
        }
        break;
        
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

export default router;
