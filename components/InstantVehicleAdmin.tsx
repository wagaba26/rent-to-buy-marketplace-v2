'use client'

import { useState } from 'react'
import { db, id, addVehicle, type Vehicle } from '@/lib/instant'

export default function InstantVehicleAdmin() {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    vehicleType: 'car',
    price: 0,
    depositAmount: 0,
    description: '',
    color: '',
    mileage: 0,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    addVehicle({
      make: formData.make,
      model: formData.model,
      year: formData.year,
      vehicleType: formData.vehicleType,
      price: formData.price,
      depositAmount: formData.depositAmount,
      description: formData.description,
      color: formData.color,
      mileage: formData.mileage,
      status: 'available',
      monthlyPayment: Math.round((formData.price - formData.depositAmount) / 24),
      paymentFrequency: 'monthly',
      paymentTermMonths: 24,
    })

    // Reset form
    setFormData({
      make: '',
      model: '',
      year: new Date().getFullYear(),
      vehicleType: 'car',
      price: 0,
      depositAmount: 0,
      description: '',
      color: '',
      mileage: 0,
    })
    setShowForm(false)
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="bg-volt-500 text-carbon-950 px-6 py-3 rounded-sm font-bold hover:bg-volt-400 transition-colors shadow-lg"
        >
          + Add Vehicle (Instant)
        </button>
      ) : (
        <div className="bg-carbon-900 border border-carbon-700 p-6 rounded-sm shadow-xl max-w-md">
          <h3 className="text-volt-500 text-xl mb-4 font-bold">Add Vehicle</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-carbon-300 mb-1">Make</label>
              <input
                type="text"
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                className="w-full bg-carbon-800 border border-carbon-700 px-3 py-2 text-carbon-100 rounded-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-carbon-300 mb-1">Model</label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full bg-carbon-800 border border-carbon-700 px-3 py-2 text-carbon-100 rounded-sm"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-carbon-300 mb-1">Year</label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  className="w-full bg-carbon-800 border border-carbon-700 px-3 py-2 text-carbon-100 rounded-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-carbon-300 mb-1">Type</label>
                <select
                  value={formData.vehicleType}
                  onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                  className="w-full bg-carbon-800 border border-carbon-700 px-3 py-2 text-carbon-100 rounded-sm"
                >
                  <option value="car">Car</option>
                  <option value="motorcycle">Motorcycle</option>
                  <option value="van">Van</option>
                  <option value="truck">Truck</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-carbon-300 mb-1">Price</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  className="w-full bg-carbon-800 border border-carbon-700 px-3 py-2 text-carbon-100 rounded-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-carbon-300 mb-1">Deposit</label>
                <input
                  type="number"
                  value={formData.depositAmount}
                  onChange={(e) => setFormData({ ...formData, depositAmount: parseFloat(e.target.value) })}
                  className="w-full bg-carbon-800 border border-carbon-700 px-3 py-2 text-carbon-100 rounded-sm"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-volt-500 text-carbon-950 px-4 py-2 rounded-sm font-bold hover:bg-volt-400 transition-colors"
              >
                Add Vehicle
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-carbon-800 text-carbon-300 rounded-sm hover:bg-carbon-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

