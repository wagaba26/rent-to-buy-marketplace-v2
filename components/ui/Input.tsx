'use client'

import { InputHTMLAttributes, forwardRef } from 'react'
import { motion } from 'framer-motion'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  fullWidth?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = false,
      leftIcon,
      rightIcon,
      className = '',
      id,
      onAnimationStart,
      onDrag,
      onDragStart,
      onDragEnd,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
    const widthClass = fullWidth ? 'w-full' : ''

    const baseStyles = 'px-4 py-3 bg-bg-secondary border rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed'
    const errorStyles = error ? 'border-error focus:border-error focus:ring-error' : 'border-border-primary'
    const iconPadding = leftIcon ? 'pl-12' : rightIcon ? 'pr-12' : ''

    const combinedClassName = `${baseStyles} ${errorStyles} ${iconPadding} ${widthClass} ${className}`

    return (
      <div className={`${widthClass}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-text-secondary mb-2"
          >
            {label}
            {props.required && <span className="text-error ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-text-tertiary">
              {leftIcon}
            </div>
          )}

          <motion.input
            ref={ref}
            id={inputId}
            className={combinedClassName}
            whileFocus={{ scale: 1.01 }}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-text-tertiary">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 text-sm text-error flex items-center gap-1"
          >
            <svg className="icon icon-xs" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </motion.p>
        )}

        {helperText && !error && (
          <p className="mt-2 text-sm text-text-tertiary">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
