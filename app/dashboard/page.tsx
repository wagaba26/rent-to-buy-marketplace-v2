import React from 'react';
import Navigation from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Dashboard } from '@/components/Dashboard';

export default function DashboardPage() {
  return (
    <main className="bg-bg-primary">
      <Navigation />
      <Dashboard />
      <Footer />
    </main>
  );
}
