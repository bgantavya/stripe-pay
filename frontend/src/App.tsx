import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import InvoiceForm from './components/InvoiceForm';
import InvoiceDetail from './components/InvoiceDetail';
import './App.css';

type ViewType = 'dashboard' | 'create' | 'detail';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  const handleCreateInvoice = () => {
    setCurrentView('create');
  };

  const handleViewInvoice = (id: string) => {
    setSelectedInvoiceId(id);
    setCurrentView('detail');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setSelectedInvoiceId(null);
  };

  const handleInvoiceCreated = () => {
    setCurrentView('dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Invoice Payment POC
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToDashboard}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </button>
              <button
                onClick={handleCreateInvoice}
                className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium"
              >
                Create Invoice
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {currentView === 'dashboard' && (
          <Dashboard onViewInvoice={handleViewInvoice} />
        )}
        {currentView === 'create' && (
          <InvoiceForm onSuccess={handleInvoiceCreated} onCancel={handleBackToDashboard} />
        )}
        {currentView === 'detail' && selectedInvoiceId && (
          <InvoiceDetail 
            invoiceId={selectedInvoiceId} 
            onBack={handleBackToDashboard}
          />
        )}
      </main>
    </div>
  );
}

export default App;
