import { render, screen } from '@testing-library/react'
import Home from '@/app/page'

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
    },
}))

// Mock the instant library
jest.mock('@/lib/instant', () => ({
    db: {
        useQuery: jest.fn(() => ({
            isLoading: false,
            error: null,
            data: { vehicles: [] }
        })),
        rooms: {
            usePresence: jest.fn(() => ({
                peers: {}
            }))
        }
    },
    vehiclesRoom: 'vehicles-room'
}))

// Mock child components to avoid complex rendering
jest.mock('@/components/Navigation', () => {
    return function Navigation() {
        return <div data-testid="navigation">Navigation</div>
    }
})

jest.mock('@/components/VehicleGrid', () => {
    return function VehicleGrid() {
        return <div data-testid="vehicle-grid">VehicleGrid</div>
    }
})

jest.mock('@/components/Hero', () => {
    return function Hero() {
        return <div data-testid="hero">Hero</div>
    }
})

jest.mock('@/components/InstantVehicleAdmin', () => {
    return function InstantVehicleAdmin() {
        return <div data-testid="admin">Admin</div>
    }
})

jest.mock('@/components/Footer', () => {
    return function Footer() {
        return <div data-testid="footer">Footer</div>
    }
})

describe('Home', () => {
    it('renders main components', () => {
        render(<Home />)

        expect(screen.getByTestId('navigation')).toBeInTheDocument()
        expect(screen.getByTestId('hero')).toBeInTheDocument()
        expect(screen.getByTestId('vehicle-grid')).toBeInTheDocument()
        expect(screen.getByTestId('footer')).toBeInTheDocument()
    })
})
