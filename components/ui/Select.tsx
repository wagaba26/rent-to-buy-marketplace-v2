'use client'

import { SelectHTMLAttributes, forwardRef } from 'react'
import { motion } from 'framer-motion'

export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string
  error?: string
  helperText?: string
  fullWidth?: boolean
  options: SelectOption[]
  placeholder?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = false,
      options,
      placeholder,
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
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`
    const widthClass = fullWidth ? 'w-full' : ''

    const baseStyles = 'px-4 py-3 bg-carbon-950 border rounded-sm text-carbon-50 focus:outline-none focus:ring-2 focus:ring-volt-500 focus:border-volt-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed appearance-none cursor-pointer'
    const errorStyles = error ? 'border-error focus:border-error focus:ring-error' : 'border-carbon-700'

    const combinedClassName = `${baseStyles} ${errorStyles} ${widthClass} ${className}`

    return (
      <div className={`${widthClass}`}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-carbon-300 mb-2"
          >
            {label}
            {props.required && <span className="text-error ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          <motion.select
            ref={ref}
            id={selectId}
            className={combinedClassName}
            whileFocus={{ scale: 1.01 }}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </motion.select>

          {/* Custom dropdown arrow */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-carbon-400">
            <svg className="icon icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1 text-sm text-error"
          >
            {error}
          </motion.p>
        )}

        {helperText && !error && (
          <p className="mt-1 text-sm text-carbon-400">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

export default Select

