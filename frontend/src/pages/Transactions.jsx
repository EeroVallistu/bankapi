import { useQuery } from '@tanstack/react-query';
import { transactions } from '../api/client';

export default function Transactions() {
  const { data, isLoading, error } = useQuery(['transactions'], transactions.list);

  if (isLoading) return <div>Loading transactions...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Transaction History</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {data?.data?.map((tx) => (
          <div key={tx.id} className="p-4 border-b hover:bg-gray-50">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">{tx.explanation}</p>
                <p className="text-sm text-gray-500">
                  {tx.senderName} → {tx.receiverName}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(tx.createdAt).toLocaleString()}
                </p>
              </div>
              <div className={`text-lg font-semibold ${
                tx.fromAccount.startsWith(process.env.BANK_PREFIX) 
                  ? 'text-red-600' 
                  : 'text-green-600'
              }`}>
                {tx.fromAccount.startsWith(process.env.BANK_PREFIX) ? '-' : '+'}{tx.amount} {tx.currency}
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              <span className="font-medium">From:</span> {tx.fromAccount}
              <br />
              <span className="font-medium">To:</span> {tx.toAccount}
            </div>
            {tx.status !== 'completed' && (
              <div className={`mt-2 text-sm ${
                tx.status === 'failed' ? 'text-red-600' : 'text-yellow-600'
              }`}>
                Status: {tx.status}
                {tx.errorMessage && <p className="text-red-600">{tx.errorMessage}</p>}
              </div>
            )}
          </div>
        ))}
        {data?.data?.length === 0 && (
          <div className="p-4 text-center text-gray-500">
            No transactions found
          </div>
        )}
      </div>
    </div>
  );
}
