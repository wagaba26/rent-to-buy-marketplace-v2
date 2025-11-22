# Rent-to-Own Marketplace Frontend

A distinctive, art-directed frontend for the rent-to-own vehicle marketplace platform.

## Design Philosophy

This frontend intentionally avoids generic AI-generated aesthetics in favor of:

- **Bold Typography**: JetBrains Mono for display text, IBM Plex Sans for body text
- **High-Contrast Colors**: Carbon black base with electric green (volt) accents
- **Purposeful Motion**: Staggered animations using Framer Motion
- **Layered Depth**: Grid overlays, gradient backgrounds, and backdrop blur effects
- **Industrial Aesthetic**: Automotive-inspired, high-tech feel

## Tech Stack

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Zustand** for state management
- **Axios** for API calls

## Getting Started

### Prerequisites

- Node.js 18+
- Backend API running (see main README)

### Installation

```bash
cd frontend
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### Development

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

### Build

```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── globals.css        # Global styles and design tokens
│   ├── login/             # Authentication pages
│   ├── register/
│   ├── dashboard/         # User dashboard
│   └── vehicles/          # Vehicle listing and detail pages
├── components/            # React components
│   ├── Navigation.tsx
│   ├── Hero.tsx
│   └── VehicleGrid.tsx
├── store/                 # Zustand stores
│   └── vehicleStore.ts
└── lib/                   # Utilities
    └── api.ts
```

## Features

- **Vehicle Browsing**: Browse and filter available vehicles
- **Vehicle Details**: Detailed view with payment plans
- **User Authentication**: Login and registration
- **Dashboard**: View payment plans and account status
- **Responsive Design**: Mobile-first, works on all devices

## Design System

### Colors

- **Carbon**: Black to gray scale (950 = darkest)
- **Volt**: Electric green accents (500 = primary)
- **Amber**: Warning/attention colors

### Typography

- **Display**: JetBrains Mono (bold, monospace)
- **Body**: IBM Plex Sans (readable, modern)

### Animations

- Staggered reveals on page load
- Smooth transitions on interactions
- Purposeful hover effects with glow

## API Integration

The frontend communicates with the backend API Gateway at `/api`. All requests are proxied through the gateway which handles authentication and routing to microservices.

## License

Part of the Rent-to-Own Marketplace platform.

