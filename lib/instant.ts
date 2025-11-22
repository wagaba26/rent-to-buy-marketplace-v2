import { id, i, init, InstaQLEntity } from "@instantdb/react";
export { id };

// Get your APP_ID from https://instant.dev
// Replace this with your actual Instant app id
const APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID || "f743655a-1c7f-4757-b21e-84db09f7ff97";

// Schema for Rent-to-Own Marketplace
export const schema = i.schema({
  entities: {
    users: i.entity({
      email: i.string(),
      passwordHash: i.string(),
      role: i.string(), // 'customer', 'agent', 'admin'
      firstName: i.string().optional(),
      lastName: i.string().optional(),
      phoneNumber: i.string().optional(),
      status: i.string(), // 'pending', 'active', 'suspended'
      eligibilityTier: i.number().optional(),
      creditScoreId: i.string().optional(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    vehicles: i.entity({
      make: i.string(),
      model: i.string(),
      year: i.number(),
      vehicleType: i.string(), // 'motorcycle', 'car', 'van', 'truck'
      categoryId: i.string().optional(),
      vin: i.string().optional(),
      registrationNumber: i.string().optional(),
      color: i.string().optional(),
      mileage: i.number().optional(),
      price: i.number(),
      depositAmount: i.number(),
      weeklyPayment: i.number().optional(),
      monthlyPayment: i.number().optional(),
      paymentFrequency: i.string().optional(), // 'weekly', 'monthly'
      paymentTermMonths: i.number().optional(),
      eligibilityTier: i.string().optional(), // 'basic', 'standard', 'premium', 'luxury'
      status: i.string(), // 'available', 'reserved', 'rented', 'sold', 'maintenance'
      description: i.string().optional(),
      images: i.json().optional(),
      specifications: i.json().optional(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    vehicleCategories: i.entity({
      name: i.string(),
      description: i.string().optional(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    vehicleReservations: i.entity({
      vehicleId: i.string(),
      userId: i.string(),
      status: i.string(), // 'pending', 'approved', 'rejected', 'expired', 'completed'
      reservedUntil: i.number(),
      expiresAt: i.number(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    paymentPlans: i.entity({
      userId: i.string(),
      vehicleId: i.string(),
      vehiclePrice: i.number(),
      depositAmount: i.number(),
      installmentAmount: i.number(),
      paymentFrequency: i.string(), // 'weekly', 'monthly'
      termLengthMonths: i.number(),
      totalInstallments: i.number(),
      remainingInstallments: i.number(),
      nextPaymentDate: i.number(),
      gracePeriodDays: i.number().optional(),
      status: i.string(), // 'active', 'completed', 'defaulted', 'cancelled', 'overdue'
      overdueDays: i.number().optional(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    payments: i.entity({
      paymentPlanId: i.string(),
      userId: i.string(),
      amount: i.number(),
      paymentMethod: i.string(), // 'mobile_money', 'bank_transfer', 'cash'
      mobileMoneyProvider: i.string().optional(),
      phoneNumber: i.string().optional(),
      transactionId: i.string().optional(),
      externalTransactionId: i.string().optional(),
      idempotencyKey: i.string().optional(),
      status: i.string(), // 'pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'
      scheduledDate: i.number().optional(),
      dueDate: i.number().optional(),
      processedAt: i.number().optional(),
      failureReason: i.string().optional(),
      retryCount: i.number().optional(),
      isDeposit: i.boolean().optional(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    creditScores: i.entity({
      applicantId: i.string(),
      score: i.number(), // 0-1000
      tier: i.string(), // 'basic', 'standard', 'premium', 'luxury'
      maximumVehicleValue: i.number().optional(),
      requiredDepositPercentage: i.number().optional(),
      factors: i.json(),
      alternativeData: i.json().optional(),
      behavioralSignals: i.json().optional(),
      lastUpdated: i.number(),
      createdAt: i.number(),
    }),
  },
  rooms: {
    vehicles: {
      presence: i.entity({}),
    },
  },
});

// Type exports
export type User = InstaQLEntity<typeof schema, "users">;
export type Vehicle = InstaQLEntity<typeof schema, "vehicles">;
export type VehicleCategory = InstaQLEntity<typeof schema, "vehicleCategories">;
export type VehicleReservation = InstaQLEntity<typeof schema, "vehicleReservations">;
export type PaymentPlan = InstaQLEntity<typeof schema, "paymentPlans">;
export type Payment = InstaQLEntity<typeof schema, "payments">;
export type CreditScore = InstaQLEntity<typeof schema, "creditScores">;

// Initialize Instant database
export const db = init({ appId: APP_ID, schema });

// Rooms for presence
export const vehiclesRoom = db.room("vehicles");

// Helper functions for transactions
export const addVehicle = (vehicleData: Partial<Vehicle>) => {
  db.transact(
    db.tx.vehicles[id()].update({
      ...vehicleData,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as any)
  );
};

export const updateVehicle = (vehicleId: string, updates: Partial<Vehicle>) => {
  db.transact(
    db.tx.vehicles[vehicleId].update({
      ...updates,
      updatedAt: Date.now(),
    } as any)
  );
};

export const deleteVehicle = (vehicleId: string) => {
  db.transact(db.tx.vehicles[vehicleId].delete());
};

export const addReservation = (reservationData: Partial<VehicleReservation>) => {
  db.transact(
    db.tx.vehicleReservations[id()].update({
      ...reservationData,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as any)
  );
};

export const updateReservation = (reservationId: string, updates: Partial<VehicleReservation>) => {
  db.transact(
    db.tx.vehicleReservations[reservationId].update({
      ...updates,
      updatedAt: Date.now(),
    } as any)
  );
};

