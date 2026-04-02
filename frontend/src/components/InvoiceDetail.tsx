import React, { useState, useEffect } from 'react';
import { Invoice } from '../types/invoice';
import { api } from '../services/api';

interface InvoiceDetailProps {
  invoiceId: string;
  onBack: () => void;
}

const InvoiceDetail: React.FC<InvoiceDetailProps> = ({ invoiceId, onBack }) => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);

  useEffect(() => {
    loadInvoice();
    
    // Auto-refresh invoice status every 5 seconds if published
    const interval = setInterval(() => {
      if (invoice?.status === 'published') {
        loadInvoice();
      }
    }, 5000);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId, invoice?.status]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      const data = await api.getInvoice(invoiceId);
      setInvoice(data);
    } catch (err) {
      setError('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      setPublishing(true);
      
      // First publish the invoice
      const publishedInvoice = await api.publishInvoice(invoiceId);
      setInvoice(publishedInvoice);

      // Then create payment link
      const data = await api.createPaymentLink(invoiceId);
      setPaymentLink(data.paymentLink);
      setInvoice(data.invoice);
    } catch (err) {
      setError('Failed to publish invoice or create payment link');
    } finally {
      setPublishing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'published':
        return 'bg-blue-100 text-blue-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={onBack}
          className="mt-2 text-red-600 hover:text-red-800 font-medium"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Invoice not found</p>
        <button
          onClick={onBack}
          className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-900 font-medium"
        >
          Back
        </button>
        <h2 className="text-2xl font-bold text-gray-900">Invoice Details</h2>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Invoice Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Invoice #{invoice.id.slice(-8).toUpperCase()}</h3>
              <p className="text-sm text-gray-500">
                Created on {new Date(invoice.createdAt).toLocaleDateString()}
              </p>
            </div>
            <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </span>
          </div>
        </div>

        {/* Client Information */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-medium text-gray-900 mb-3">Client Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Name</p>
              <p className="text-sm text-gray-900">{invoice.clientName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Email</p>
              <p className="text-sm text-gray-900">{invoice.clientEmail}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Due Date</p>
              <p className="text-sm text-gray-900">{new Date(invoice.dueDate).toLocaleDateString()}</p>
            </div>
          </div>
          {invoice.clientAddress && (
            <div className="mt-3">
              <p className="text-sm font-medium text-gray-500">Address</p>
              <p className="text-sm text-gray-900">{invoice.clientAddress}</p>
            </div>
          )}
        </div>

        {/* Invoice Items */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-medium text-gray-900 mb-3">Items</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Description
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Quantity
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Unit Price
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">${item.unitPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">${item.totalPrice.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <div className="text-right">
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900">${invoice.totalAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4">
          {invoice.status === 'draft' && (
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {publishing ? 'Publishing...' : 'Publish Invoice'}
            </button>
          )}

          {(paymentLink || invoice.stripePaymentUrl) && invoice.status !== 'paid' && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <h4 className="text-lg font-medium text-green-900 mb-2">Payment Link Generated!</h4>
              <p className="text-sm text-green-700 mb-2">Share this link with your client (one-time use):</p>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={paymentLink || invoice.stripePaymentUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border border-green-300 rounded-md text-sm bg-white"
                />
                <button
                  onClick={() => copyToClipboard(paymentLink || invoice.stripePaymentUrl!)}
                  className="bg-green-600 text-white px-3 py-2 rounded-md text-sm hover:bg-green-700"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-green-600 mt-2">
                Link expires automatically after successful payment. This page will update when paid.
              </p>
            </div>
          )}

          {invoice.status === 'published' && !paymentLink && !invoice.stripePaymentUrl && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-700">
                This invoice has been published and is ready for payment.
              </p>
            </div>
          )}

          {invoice.status === 'paid' && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <h4 className="text-lg font-medium text-green-900 mb-2">Payment Received!</h4>
              <p className="text-sm text-green-700">
                This invoice has been paid successfully. Payment link is no longer active.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetail;
