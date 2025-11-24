import React from 'react';
import Link from 'next/link';
import { Car, Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react';

export const Footer = () => {
    return (
        <footer className="bg-bg-secondary border-t border-border-primary pt-16 pb-8">
            <div className="container mx-auto px-4 md:px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
                    {/* Brand Column */}
                    <div className="space-y-6">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/20">
                                <Car className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-2xl font-bold font-heading text-white tracking-tight">
                                Auto<span className="text-primary">Ladder</span>
                            </span>
                        </Link>
                        <p className="text-text-secondary leading-relaxed">
                            The smarter way to own a car. Flexible rent-to-own plans designed around your budget and lifestyle.
                        </p>
                        <div className="flex items-center gap-4">
                            {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                                <a
                                    key={i}
                                    href="#"
                                    className="w-10 h-10 rounded-full bg-bg-tertiary border border-border-secondary flex items-center justify-center text-text-tertiary hover:text-white hover:bg-primary hover:border-primary transition-all duration-300"
                                >
                                    <Icon className="w-5 h-5" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-lg font-semibold text-white mb-6">Quick Links</h4>
                        <ul className="space-y-4">
                            {['How It Works', 'Browse Vehicles', 'Pricing Plans', 'Success Stories', 'FAQs'].map((item) => (
                                <li key={item}>
                                    <Link href="#" className="text-text-secondary hover:text-primary transition-colors">
                                        {item}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="text-lg font-semibold text-white mb-6">Legal</h4>
                        <ul className="space-y-4">
                            {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Licensing', 'Consumer Rights'].map((item) => (
                                <li key={item}>
                                    <Link href="#" className="text-text-secondary hover:text-primary transition-colors">
                                        {item}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="text-lg font-semibold text-white mb-6">Contact Us</h4>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3 text-text-secondary">
                                <MapPin className="w-5 h-5 text-primary shrink-0 mt-1" />
                                <span>123 Auto Lane, Suite 100<br />Melbourne, VIC 3000</span>
                            </li>
                            <li className="flex items-center gap-3 text-text-secondary">
                                <Phone className="w-5 h-5 text-primary shrink-0" />
                                <span>+61 3 1234 5678</span>
                            </li>
                            <li className="flex items-center gap-3 text-text-secondary">
                                <Mail className="w-5 h-5 text-primary shrink-0" />
                                <span>support@autoladder.com</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-border-secondary pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-text-tertiary text-sm">
                        © {new Date().getFullYear()} AutoLadder. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6">
                        <span className="text-text-tertiary text-sm">Made with ❤️ for drivers</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};
