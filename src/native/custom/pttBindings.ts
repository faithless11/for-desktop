/**
 * Push-to-talk bindings of the global hook (uiohook codes).
 * Pure module, unit tested with `node --test`.
 */

/**
 * Binding as stored by the web app (`NativePttBinding` there)
 */
export type NativePttBinding =
  | { kind: "key"; keycode: number; label: string }
  | { kind: "mouse"; button: number; label: string };

/**
 * Input event reported by the hook
 */
export type HookEvent =
  | { type: "key"; keycode: number }
  | { type: "mouse"; button: number };

/**
 * Language used for labels
 */
export type LabelLanguage = "en" | "de";

/**
 * uiohook keycode of Escape (cancels the capture)
 */
export const ESCAPE_KEYCODE = 1;

/**
 * uiohook mouse buttons that can never be bound (left, right click)
 */
const REJECTED_BUTTONS = [1, 2];

/**
 * Build a keycode → name lookup from uiohook's UiohookKey (name → keycode)
 * @param keys UiohookKey
 */
export function keyNameMap(keys: Record<string, number>): Map<number, string> {
  const names = new Map<number, string>();
  for (const [name, code] of Object.entries(keys)) {
    if (!names.has(code)) names.set(code, name);
  }
  return names;
}

/**
 * Human readable name of a uiohook mouse button
 */
function mouseLabel(button: number, lang: LabelLanguage): string {
  if (button === 3) return lang === "de" ? "Mittlere Maustaste" : "Middle mouse";
  return `${lang === "de" ? "Maus" : "Mouse"} ${button}`;
}

/**
 * Create a binding from a hook event
 * @returns Binding, or null if it cannot be bound (Escape, left/right click)
 */
export function bindingFromHookEvent(
  event: HookEvent,
  names: Map<number, string>,
  lang: LabelLanguage,
): NativePttBinding | null {
  if (event.type === "key") {
    if (event.keycode === ESCAPE_KEYCODE) return null;
    return {
      kind: "key",
      keycode: event.keycode,
      label: names.get(event.keycode) ?? `Key ${event.keycode}`,
    };
  }
  if (REJECTED_BUTTONS.includes(event.button)) return null;
  return {
    kind: "mouse",
    button: event.button,
    label: mouseLabel(event.button, lang),
  };
}

/**
 * Whether a hook event belongs to the binding
 */
export function matches(binding: NativePttBinding, event: HookEvent): boolean {
  return binding.kind === "key"
    ? event.type === "key" && event.keycode === binding.keycode
    : event.type === "mouse" && event.button === binding.button;
}
