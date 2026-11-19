import { Navigate, Route, Routes } from 'react-router-dom';
import { Accounts } from '../pages/Accounts';
import { Dashboard } from '../pages/Dashboard';
import { Home } from '../pages/Home';
import { Settings } from '../pages/Settings';
import { Transactions } from '../pages/Transactions';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/analysis" element={<Dashboard />} />
      <Route path="/accounts" element={<Accounts />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/transactions" element={<Transactions />} />
      <Route path="/transactions/:view" element={<Transactions />} /> // Used for transactions/expenses and transactions/income
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}