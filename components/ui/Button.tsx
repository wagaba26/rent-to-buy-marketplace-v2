'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'type'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type']
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      className = '',
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles = 'font-primary font-semibold transition-all duration-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2'
    
    const variants = {
      primary: 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-md hover:shadow-glow hover:scale-105',
      secondary: 'bg-bg-secondary text-text-primary border border-border-primary hover:border-primary/50 hover:bg-bg-tertiary',
      outline: 'border-2 border-border-secondary text-text-primary hover:border-primary hover:text-primary-light bg-transparent',
      ghost: 'text-text-secondary hover:text-primary-light hover:bg-bg-secondary bg-transparent',
      danger: 'bg-error text-white hover:bg-red-600 shadow-md hover:shadow-lg',
    }
    
    const sizes = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg',
    }
    
    const widthClass = fullWidth ? 'w-full' : ''
    
    const combinedClassName = `${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`
    
    return (
      <motion.button
        ref={ref}
        type={type}
        className={combinedClassName}
        disabled={disabled || loading}
        whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
        whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
        {...props}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Loading...</span>
          </>
        ) : (
          children
        )}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'

export default Button
