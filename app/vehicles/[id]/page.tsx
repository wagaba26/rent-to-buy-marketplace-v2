import React from 'react';
import Navigation from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { CarDetail } from '@/components/CarDetail';

// Fetch vehicle data from API
import { getDb } from '@/lib/db';

// Fetch vehicle data directly from DB
async function getVehicle(id: string) {
  try {
    const db = getDb();
    const result = await db.query(
      `SELECT 
        v.*, c.id as category_id, c.name as category_name, c.description as category_description
       FROM vehicles v
       LEFT JOIN vehicle_categories c ON v.category_id = c.id
       WHERE v.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    return null;
  }
}

export default async function VehiclePage({ params }: { params: { id: string } }) {
  const vehicle = await getVehicle(params.id);

  if (!vehicle || vehicle.error) {
    return (
      <main className="bg-bg-primary min-h-screen">
        <Navigation />
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-3xl font-bold mb-4">Vehicle Not Found</h1>
          <p className="text-text-secondary mb-8">The vehicle you're looking for doesn't exist or has been removed.</p>
          <p className="text-red-500 mb-4">Error: {vehicle?.error || 'Vehicle is null'}</p>
          <a href="/search" className="text-primary hover:text-primary-light">
            Browse all vehicles
          </a>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="bg-bg-primary">
      <Navigation />
      <CarDetail vehicle={vehicle} />
      <Footer />
    </main>
  );
}
