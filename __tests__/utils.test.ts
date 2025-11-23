import { formatCurrency, cn } from '@/lib/utils'

describe('utils', () => {
    describe('formatCurrency', () => {
        it('formats number as currency', () => {
            expect(formatCurrency(1000)).toBe('UGX\xa01,000')
        })

        it('formats number with custom currency', () => {
            expect(formatCurrency(1000, 'USD')).toBe('$1,000')
        })
    })

    describe('cn', () => {
        it('merges class names', () => {
            expect(cn('foo', 'bar')).toBe('foo bar')
        })

        it('filters out falsy values', () => {
            expect(cn('foo', undefined, 'bar', false, null)).toBe('foo bar')
        })
    })
})
