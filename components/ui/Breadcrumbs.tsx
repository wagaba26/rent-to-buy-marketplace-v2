'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export default function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center gap-2 text-sm ${className}`}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        
        return (
          <div key={index} className="flex items-center gap-2">
            {index > 0 && (
              <span className="text-carbon-500" aria-hidden="true">
                /
              </span>
            )}
            
            {isLast || !item.href ? (
              <span
                className={isLast ? 'text-carbon-200 font-semibold' : 'text-carbon-400'}
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-carbon-400 hover:text-volt-500 transition-colors"
              >
                {item.label}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}

