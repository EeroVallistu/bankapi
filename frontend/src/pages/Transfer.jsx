import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { accounts, transactions } from '../api/client';
import { toast } from 'react-toastify';

export default function Transfer() {
  const [formData, setFormData] = useState({
    fromAccount: '',
    toAccount: '',
    amount: '',
    explanation: ''
  });

  const { data: accountsData } = useQuery(['accounts'], accounts.list);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Check if destination is internal or external
      const isInternal = formData.toAccount.startsWith(process.env.BANK_PREFIX);
      const transferFn = isInternal ? transactions.createInternal : transactions.createExternal;
      
      await transferFn(formData);
      toast.success('Transfer completed successfully');
      
      // Reset form
      setFormData({
        fromAccount: '',
        toAccount: '',
        amount: '',
        explanation: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Transfer failed');
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">New Transfer</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">From Account</label>
          <select
            value={formData.fromAccount}
            onChange={(e) => setFormData({...formData, fromAccount: e.target.value})}
            className="w-full p-2 border rounded"
            required
          >
            <option value="">Select account</option>
            {accountsData?.data?.map(account => (
              <option key={account.accountNumber} value={account.accountNumber}>
                {account.name} ({account.balance} {account.currency})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">To Account</label>
          <input
            type="text"
            value={formData.toAccount}
            onChange={(e) => setFormData({...formData, toAccount: e.target.value})}
            className="w-full p-2 border rounded"
            placeholder="Enter account number"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Amount</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({...formData, amount: e.target.value})}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Explanation</label>
          <textarea
            value={formData.explanation}
            onChange={(e) => setFormData({...formData, explanation: e.target.value})}
            className="w-full p-2 border rounded"
            rows="3"
            required
          />
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
          Send Money
        </button>
      </form>
    </div>
  );
}
