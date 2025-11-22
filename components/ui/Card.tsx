'use client'

import { HTMLAttributes, forwardRef } from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'

export interface CardProps extends HTMLMotionProps<'div'> {
  variant?: 'default' | 'outlined' | 'elevated' | 'glass'
  hover?: boolean
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = 'default',
      hover = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseStyles = 'rounded-2xl transition-all duration-300'
    
    const variants = {
      default: 'bg-bg-secondary border border-border-primary',
      outlined: 'bg-transparent border-2 border-border-secondary',
      elevated: 'bg-bg-secondary border border-border-primary shadow-xl',
      glass: 'glass border border-border-primary',
    }
    
    const hoverStyles = hover
      ? 'hover:border-primary/50 hover:shadow-xl hover:-translate-y-1 cursor-pointer'
      : ''
    
    const combinedClassName = `${baseStyles} ${variants[variant]} ${hoverStyles} ${className}`
    
    return (
      <motion.div
        ref={ref}
        className={combinedClassName}
        whileHover={hover ? { y: -4 } : {}}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)

Card.displayName = 'Card'

export default Card
