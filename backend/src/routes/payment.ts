import express from 'express';
import Stripe from 'stripe';
import { InvoiceService } from '../services/invoiceService';
import { emailService } from '../services/emailService';

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
    
    // Prepare line items with detailed descriptions
    const lineItems = invoice.items.map((item: any, index: number) => ({
      price_data: {
        currency: invoice.currency || 'usd',
        product_data: {
          name: item.description,
          description: `Invoice #${invoice.id.slice(0, 8).toUpperCase()} - Item ${index + 1}`,
          metadata: {
            invoice_id: invoice.id,
            item_index: String(index),
          },
        },
        unit_amount: Math.round(item.unitPrice * 100),
      },
      quantity: item.quantity,
    }));

    // Create Stripe payment link with personalized details
    const paymentLink = await stripe.paymentLinks.create({
      line_items: lineItems,
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        },
      },
      allow_promotion_codes: false,
      billing_address_collection: 'auto',
      customer_creation: 'always',
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description: `Invoice for ${invoice.client_name}`,
          metadata: {
            invoice_id: invoice.id,
            client_email: invoice.client_email,
            client_name: invoice.client_name,
          },
        },
      },
      metadata: {
        invoice_id: invoice.id,
        client_email: invoice.client_email,
        client_name: invoice.client_name,
        total_amount: String(invoice.total_amount),
        currency: invoice.currency || 'usd',
      },
      custom_text: {
        submit: {
          message: `Thank you for your business, ${invoice.client_name}!`,
        },
      },
    });
    
    // Update invoice with payment link ID and status
    const updatedInvoice = await invoiceService.updateInvoiceStatus(
      invoiceId,
      'published',
      paymentLink.id,
      paymentLink.url
    );
    
    // Send invoice published email to client
    if (updatedInvoice) {
      try {
        await emailService.sendInvoicePublishedEmail(updatedInvoice, paymentLink.url);
      } catch (emailError) {
        console.error('Failed to send invoice email:', emailError);
        // Don't fail the request if email fails
      }
    }
    
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
            const paidInvoice = await invoiceService.updateInvoiceStatus(invoice.id, 'paid');
            console.log(`Invoice ${invoice.id} marked as paid`);
            
            // Send payment confirmation email
            if (paidInvoice) {
              try {
                await emailService.sendPaymentConfirmationEmail(paidInvoice);
                console.log(`Payment confirmation email sent to ${invoice.client_email}`);
              } catch (emailError) {
                console.error('Failed to send payment confirmation email:', emailError);
              }
            }
            
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
