import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProvider } from './contexts/UserContext';
import LeftNavBar from './components/LeftNavBar';
import Dashboard from './pages/Dashboard';
import DeepDive from './pages/DeepDive';
import Forecast from './pages/Forecast';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Trends from './pages/Trends';
import Help from './pages/Help';
import GlobalAssistant from './components/GlobalAssistant';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 15,
      refetchOnWindowFocus: false,
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider defaultUserId="user-rayen">
        <HashRouter>
          <div className="flex min-h-screen text-gray-200 font-sans">
            <LeftNavBar />
            <main className="ml-[18%] flex-1">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/trends" element={<Trends />} />
                <Route path="/article/:id" element={<DeepDive />} />
                <Route path="/forecast/:id" element={<Forecast />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/help" element={<Help />} />
              </Routes>
            </main>
            <GlobalAssistant />
          </div>
        </HashRouter>
      </UserProvider>
    </QueryClientProvider>
  );
};

export default App;