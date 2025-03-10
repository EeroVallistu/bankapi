import { useQuery } from '@tanstack/react-query';
import { accounts, transactions } from '../api/client';
import AccountCard from '../components/AccountCard';

export default function Dashboard() {
  const { data: accountsData } = useQuery(['accounts'], accounts.list);
  const { data: transactionsData } = useQuery(['transactions'], transactions.list);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-bold mb-4">My Accounts</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accountsData?.data?.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      </section>
      
      <section>
        <h2 className="text-2xl font-bold mb-4">Recent Transactions</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {transactionsData?.data?.slice(0, 5).map((tx) => (
            <div key={tx.id} className="p-4 border-b">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">{tx.explanation}</p>
                  <p className="text-sm text-gray-500">{tx.senderName} → {tx.receiverName}</p>
                </div>
                <div className={tx.amount < 0 ? 'text-red-600' : 'text-green-600'}>
                  {tx.amount} {tx.currency}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
