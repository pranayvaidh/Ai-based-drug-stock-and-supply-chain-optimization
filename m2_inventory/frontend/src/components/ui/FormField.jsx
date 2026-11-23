import { Children, cloneElement, isValidElement, useId } from 'react';

/**
 * Label + control + error/hint. Links the label to the control automatically
 * (generates an id when the child has none) so screen readers and tests can find it.
 */
export default function FormField({ label, htmlFor, error, hint, required, children, className = '' }) {
  const autoId = useId();
  const only = Children.count(children) === 1 && isValidElement(children) ? children : null;
  const controlId = htmlFor || only?.props.id || autoId;
  const msgId = `${controlId}-msg`;
  const control = only && !only.props.id && !htmlFor
    ? cloneElement(only, { id: controlId, 'aria-describedby': error || hint ? msgId : undefined })
    : children;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={only || htmlFor ? controlId : undefined} className="mb-1 block text-xs font-medium text-slate-600">
          {label}{required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      {control}
      {error
        ? <p id={msgId} className="mt-1 text-xs text-red-600">{error}</p>
        : hint ? <p id={msgId} className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}
