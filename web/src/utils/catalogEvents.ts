/** Fired when categories, purposes, or cash movement labels change (any tab). */
export const catalogChanged = new EventTarget();

export function notifyCatalogChanged() {
  catalogChanged.dispatchEvent(new Event('change'));
}