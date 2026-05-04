interface FormFieldProps {
  label: string;
  type?: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'file';
  value?: string;
  onChange?: (val: string) => void;
  placeholder?: string;
  options?: { value: string; label: string }[];
  error?: string;
  disabled?: boolean;
  fileName?: string;
}

export default function FormField({
  label, type = 'text', value = '', onChange, placeholder,
  options, error, disabled, fileName,
}: FormFieldProps) {
  const id = `ff-${label.replace(/\s/g, '-')}`;

  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      {type === 'textarea' ? (
        <textarea
          id={id}
          value={value}
          onChange={e => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={4}
        />
      ) : type === 'select' ? (
        <select id={id} value={value} onChange={e => onChange?.(e.target.value)} disabled={disabled}>
          <option value="">{placeholder || '선택하세요'}</option>
          {options?.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : type === 'file' ? (
        <div className="file-field">
          <label htmlFor={id} className="btn btn-sm btn-outline" style={{ cursor: 'pointer' }}>
            <i className="fa-solid fa-paperclip" /> 파일 선택
          </label>
          <input
            id={id}
            type="file"
            style={{ display: 'none' }}
            onChange={e => {
              const f = e.target.files?.[0];
              onChange?.(f?.name || '');
            }}
            disabled={disabled}
          />
          {fileName && <span className="file-name">{fileName}</span>}
        </div>
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={e => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
        />
      )}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
