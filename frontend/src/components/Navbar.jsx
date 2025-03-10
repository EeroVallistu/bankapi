import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { auth } from '../api/client';
import { toast } from 'react-toastify';

export default function Navbar() {
  const { isAuthenticated, clearAuth, token } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await auth.logout(token);
      clearAuth();
      navigate('/login');
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Error logging out');
    }
  };

  return (
    <nav className="bg-white shadow">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="font-bold text-xl">Bank App</Link>
          
          {isAuthenticated ? (
            <div className="flex space-x-4">
              <Link to="/accounts" className="text-gray-700 hover:text-gray-900">Accounts</Link>
              <Link to="/transfer" className="text-gray-700 hover:text-gray-900">Transfer</Link>
              <Link to="/transactions" className="text-gray-700 hover:text-gray-900">History</Link>
              <button onClick={handleLogout} className="text-red-600 hover:text-red-800">
                Logout
              </button>
            </div>
          ) : (
            <div className="flex space-x-4">
              <Link to="/login" className="text-gray-700 hover:text-gray-900">Login</Link>
              <Link to="/register" className="text-gray-700 hover:text-gray-900">Register</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
