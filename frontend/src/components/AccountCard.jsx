export default function AccountCard({ account }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: account.currency
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900">{account.name}</h3>
      <p className="text-sm text-gray-500 mt-1">{account.accountNumber}</p>
      <div className="mt-4">
        <span className="text-2xl font-bold text-blue-600">
          {formatCurrency(account.balance)}
        </span>
      </div>
      <div className="mt-4 flex justify-end space-x-2">
        <button className="text-sm text-blue-600 hover:text-blue-800">
          View Transactions
        </button>
      </div>
    </div>
  );
}
