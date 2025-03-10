import { useQuery } from '@tanstack/react-query';
import { accounts } from '../api/client';
import AccountCard from '../components/AccountCard';

export default function Accounts() {
  const { data, isLoading, error } = useQuery(['accounts'], accounts.list);

  if (isLoading) return <div>Loading accounts...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Accounts</h1>
        <button className="btn-primary">New Account</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data?.data?.map((account) => (
          <AccountCard key={account.id} account={account} />
        ))}
      </div>
    </div>
  );
}
