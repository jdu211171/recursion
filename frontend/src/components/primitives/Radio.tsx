import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'

/**
 * Radio
 * A minimalist primitive radio input that mirrors the styling philosophy of the Checkbox component.
 *
 * Styling expectation:
 *  - Add CSS targeting `.radio` similar to `.checkbox`, but typically with a fully rounded shape (e.g., border-radius: 999px).
 *  - Use the `::before` pseudo-element for the inner filled dot (scales from 0 to 1 when checked).
 *
 * Example CSS you can add (adapt to your design system):
 *
 * .radio {
 *   appearance: none;
 *   width: 16px;
 *   height: 16px;
 *   border-radius: 999px;
 *   border: 1px solid var(--border);
 *   background: linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04));
 *   display: inline-grid;
 *   place-items: center;
 *   cursor: pointer;
 *   transition: box-shadow var(--speed) var(--easing), border-color var(--speed) var(--easing),
 *               background var(--speed) var(--easing), transform 80ms ease;
 * }
 * .radio:hover { box-shadow: 0 0 0 3px rgba(var(--glow-strong), 0.12); }
 * .radio:active { transform: translateY(1px); }
 * .radio:focus-visible { outline: 2px solid rgba(var(--glow-strong), .65); outline-offset: 2px; }
 * .radio::before {
 *   content: "";
 *   width: 8px;
 *   height: 8px;
 *   border-radius: 999px;
 *   transform: scale(0);
 *   transition: transform var(--speed) var(--easing), background var(--speed) var(--easing),
 *               box-shadow var(--speed) var(--easing);
 * }
 * .radio:checked {
 *   border-color: rgba(255, 220, 130, 0.70);
 *   background: linear-gradient(180deg, rgba(255, 235, 160, 0.38), rgba(255, 235, 160, 0.18));
 *   box-shadow: 0 0 0 4px rgba(var(--glow-strong), 0.18), inset 0 1px 0 rgba(255,255,255,0.18);
 * }
 * .radio:checked::before {
 *   transform: scale(1);
 *   background: #ffe27d;
 *   box-shadow: 0 0 8px rgba(var(--glow-strong), 0.65);
 * }
 *
 * Accessibility:
 *  - Use with a <label> element for each radio or wrap in a fieldset/legend for grouped context.
 *  - Pass along name prop so radios are grouped correctly.
 */
export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /**
   * When true, renders a visually hidden radio (still focusable) allowing custom wrappers.
   * Provide your own styling via wrapper if used.
   */
  visuallyHidden?: boolean
}

const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(props, ref) {
  const { className = '', visuallyHidden = false, ...rest } = props
  if (visuallyHidden) {
    return (
      <input
        ref={ref}
        type="radio"
        className={className}
        style={{
          position: 'absolute',
          opacity: 0,
          width: 0,
          height: 0,
          margin: 0,
          padding: 0,
          pointerEvents: 'none'
        }}
        {...rest}
      />
    )
  }
  return <input ref={ref} type="radio" {...rest} className={`radio ${className}`.trim()} />
})

export default Radio