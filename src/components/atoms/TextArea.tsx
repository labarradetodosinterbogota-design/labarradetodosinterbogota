import React from 'react';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, helpText, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-dark-900 mb-1.5">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          className={`w-full px-3 py-2 border rounded-lg text-base transition-colors resize-vertical ${
            error
              ? 'border-red-500 bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200'
              : 'border-dark-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-opacity-20 focus:border-primary-400'
          } ${className}`.trim()}
          {...props}
        />
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        {helpText && !error && <p className="text-dark-500 text-sm mt-1">{helpText}</p>}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';
