'use client'

import Link from 'next/link'

export default function Footer() {
    const currentYear = new Date().getFullYear()

    return (
        <footer className="bg-bg-secondary border-t border-border-primary pt-16 pb-8">
            <div className="container">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
                    {/* Brand Column */}
                    <div className="space-y-6">
                        <Link href="/" className="flex items-center gap-3 group">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary rounded-xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
                                <div className="relative bg-gradient-to-br from-bg-secondary to-bg-primary border border-border-primary p-2 rounded-xl shadow-lg group-hover:border-primary/50 transition-colors duration-300">
                                    <svg className="w-8 h-8 text-primary group-hover:text-primary-light transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                            </div>
                            <span className="font-heading text-xl font-bold text-white tracking-tight">
                                Auto<span className="text-primary">Ladder</span>
                            </span>
                        </Link>
                        <p className="text-text-secondary text-sm leading-relaxed">
                            Empowering your journey to vehicle ownership through flexible, accessible rent-to-own solutions.
                        </p>
                        <div className="flex items-center gap-4">
                            {['twitter', 'facebook', 'instagram', 'linkedin'].map((social) => (
                                <a
                                    key={social}
                                    href={`#${social}`}
                                    className="w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center text-text-tertiary hover:bg-primary hover:text-white transition-all duration-300 hover:-translate-y-1"
                                    aria-label={social}
                                >
                                    <span className="capitalize sr-only">{social}</span>
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2C6.477 2 2 6.477 2 12c0 5.523 4.477 10 10 10s10-4.477 10-10c0-5.523-4.477-10-10-10z" fillOpacity="0.1" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="font-heading text-white font-semibold mb-6">Platform</h4>
                        <ul className="space-y-4">
                            {['Vehicles', 'How it Works', 'Pricing', 'Testimonials'].map((item) => (
                                <li key={item}>
                                    <Link
                                        href={`/${item.toLowerCase().replace(/\s+/g, '-')}`}
                                        className="text-text-secondary hover:text-primary-light transition-colors text-sm flex items-center gap-2 group"
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary/50 group-hover:bg-primary transition-colors" />
                                        {item}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h4 className="font-heading text-white font-semibold mb-6">Support</h4>
                        <ul className="space-y-4">
                            {['Help Center', 'Terms of Service', 'Privacy Policy', 'Contact Us'].map((item) => (
                                <li key={item}>
                                    <Link
                                        href={`/${item.toLowerCase().replace(/\s+/g, '-')}`}
                                        className="text-text-secondary hover:text-primary-light transition-colors text-sm flex items-center gap-2 group"
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary/50 group-hover:bg-primary transition-colors" />
                                        {item}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="font-heading text-white font-semibold mb-6">Contact</h4>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3 text-sm text-text-secondary">
                                <svg className="w-5 h-5 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>123 Auto Lane,<br />Vehicle City, VC 12345</span>
                            </li>
                            <li className="flex items-center gap-3 text-sm text-text-secondary">
                                <svg className="w-5 h-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <a href="mailto:hello@autoladder.com" className="hover:text-white transition-colors">hello@autoladder.com</a>
                            </li>
                            <li className="flex items-center gap-3 text-sm text-text-secondary">
                                <svg className="w-5 h-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <a href="tel:+1234567890" className="hover:text-white transition-colors">+1 (234) 567-890</a>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-border-primary pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-text-tertiary text-sm">
                        © {currentYear} AutoLadder. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6 text-sm text-text-tertiary">
                        <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                        <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                        <Link href="/cookies" className="hover:text-white transition-colors">Cookies</Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}
