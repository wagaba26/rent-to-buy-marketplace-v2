'use client'

import { TextareaHTMLAttributes, forwardRef } from 'react'
import { motion } from 'framer-motion'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
  fullWidth?: boolean
  rows?: number
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = false,
      rows = 4,
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
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`
    const widthClass = fullWidth ? 'w-full' : ''

    const baseStyles = 'px-4 py-3 bg-carbon-950 border rounded-sm text-carbon-50 placeholder-carbon-500 focus:outline-none focus:ring-2 focus:ring-volt-500 focus:border-volt-500 transition-all duration-300 resize-y disabled:opacity-50 disabled:cursor-not-allowed'
    const errorStyles = error ? 'border-error focus:border-error focus:ring-error' : 'border-carbon-700'

    const combinedClassName = `${baseStyles} ${errorStyles} ${widthClass} ${className}`

    return (
      <div className={`${widthClass}`}>
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-carbon-300 mb-2"
          >
            {label}
            {props.required && <span className="text-error ml-1">*</span>}
          </label>
        )}

        <motion.textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={combinedClassName}
          whileFocus={{ scale: 1.01 }}
          {...props}
        />

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

Textarea.displayName = 'Textarea'

export default Textarea

