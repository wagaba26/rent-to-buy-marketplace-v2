# Instant Integration Setup

This application now uses [Instant](https://instant.dev) for real-time data synchronization!

## What is Instant?

Instant is a backend-as-a-service that provides:
- Real-time data synchronization
- Automatic conflict resolution
- Presence tracking (see who's online)
- No backend code needed
- Built-in authentication (optional)

## Setup Instructions

### 1. Get Your Instant App ID

1. Go to [https://instant.dev](https://instant.dev)
2. Sign up for a free account
3. Create a new app
4. Copy your App ID

### 2. Configure Environment Variable

Create or update your `.env` file:

```env
NEXT_PUBLIC_INSTANT_APP_ID=your-app-id-here
```

Or update `lib/instant.ts` directly:

```typescript
const APP_ID = "your-app-id-here";
```

### 3. Start the Application

```bash
npm run dev
```

## Features Enabled

### Real-Time Vehicle Updates
- Vehicles added/updated/deleted appear instantly across all open tabs
- No page refresh needed
- Automatic synchronization

### Presence Tracking
- See how many users are currently browsing vehicles
- Real-time user count displayed on the homepage

### Admin Panel
- Click the "+ Add Vehicle (Instant)" button in the bottom right
- Add vehicles that sync instantly across all clients

## Schema

The Instant schema includes:

- **users** - User accounts and profiles
- **vehicles** - Vehicle inventory (real-time)
- **vehicleCategories** - Vehicle categories
- **vehicleReservations** - Vehicle reservations
- **paymentPlans** - Payment plan configurations
- **payments** - Payment records
- **creditScores** - Credit scoring data

## How It Works

1. **Read Data**: Use `db.useQuery()` to fetch and subscribe to data
   ```typescript
   const { data } = db.useQuery({ vehicles: {} });
   ```

2. **Write Data**: Use `db.transact()` to create/update/delete
   ```typescript
   db.transact(db.tx.vehicles[id()].update({ make: 'Toyota' }));
   ```

3. **Presence**: Use `db.rooms.usePresence()` to track online users
   ```typescript
   const { peers } = db.rooms.usePresence(vehiclesRoom);
   ```

## Benefits

✅ **No Backend Code**: Instant handles all backend logic  
✅ **Real-Time**: Changes sync instantly across clients  
✅ **Offline Support**: Works offline with automatic sync  
✅ **Type Safety**: Full TypeScript support  
✅ **Scalable**: Handles millions of concurrent users  
✅ **Free Tier**: Generous free tier for development  

## Migration Notes

The application now uses Instant for vehicle data. The REST API endpoints (`/api/vehicles`) are still available for:
- Authentication (users, login, register)
- Other services (payments, credit scoring, etc.)

You can gradually migrate other features to Instant as needed.

## Next Steps

1. Get your Instant App ID from [instant.dev](https://instant.dev)
2. Add it to your `.env` file
3. Restart the dev server
4. Start adding vehicles and see them sync in real-time!

## Documentation

- [Instant Docs](https://instant.dev/docs)
- [React Integration](https://instant.dev/docs/react)
- [Schema Definition](https://instant.dev/docs/schema)

