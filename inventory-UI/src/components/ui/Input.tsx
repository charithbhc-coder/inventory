import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  prefixIcon?: React.ReactNode;
  onToggleVisibility?: () => void;
  isPassword?: boolean;
  showPassword?: boolean;
}

export default function Input({
  label,
  error,
  prefixIcon,
  isPassword,
  showPassword,
  onToggleVisibility,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="input-group">
      {label && <label className="input-label">{label}</label>}
      <div className="input-wrapper">
        {prefixIcon && <span className="input-icon">{prefixIcon}</span>}
        <input
          className={`input ${error ? 'input-error' : ''} ${isPassword ? 'has-right-icon' : ''} ${!prefixIcon ? 'no-prefix' : ''} ${className}`}
          style={!prefixIcon ? { paddingLeft: 16 } : {}}
          type={isPassword ? (showPassword ? 'text' : 'password') : props.type}
          {...props}
        />
        {isPassword && (
          <button type="button" className="input-icon-right" onClick={onToggleVisibility}>
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <p className="input-error-msg">{error}</p>}
    </div>
  );
}

export function PasswordInput(props: Omit<InputProps, 'isPassword'>) {
  const [show, setShow] = useState(false);
  return (
    <Input
      {...props}
      isPassword
      showPassword={show}
      onToggleVisibility={() => setShow((v) => !v)}
    />
  );
}
