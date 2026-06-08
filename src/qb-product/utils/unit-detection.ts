// Tokens matched as whole words — longer alternatives listed first to avoid
// shorter tokens matching inside them (e.g. "kg" matching inside "pkg")
const UNIT_TOKENS = [
  'kilogram', 'kilograms',
  'litre', 'litres', 'liter', 'liters', 'ltr',
  'dozen', 'doz',
  'pack', 'packs', 'pkt',
  'case', 'cases',
  'gram', 'grams',
  'pound', 'pounds',
  'ounce', 'ounces',
  'unit', 'units',
  'each', 'ea',
  'box', 'boxes',
  'bag', 'bags',
  'kgs', 'kg',
  'lbs', 'lb',
  'gm', 'gr',
  'pcs', 'pc',
  'bx', 'cs', 'ml',
];

function tokenRegex(token: string): RegExp {
  // Negative lookbehind/lookahead for a-z to enforce word boundaries
  return new RegExp(`(?<![a-z])${token}(?![a-z])`, 'i');
}

function normalizeUnit(raw: string): string {
  return raw.trim().toLowerCase();
}

function scanForTokens(text: string): string[] {
  if (!text?.trim()) return [];
  const found: string[] = [];
  for (const token of UNIT_TOKENS) {
    if (tokenRegex(token).test(text)) {
      const n = normalizeUnit(token);
      if (!found.includes(n)) found.push(n);
    }
  }
  return found;
}

function detectFromSubItemName(itemName: string, parentName: string): string[] {
  if (!parentName) return [];
  const suffix = itemName.replace(new RegExp(`^${parentName}\\s*[-–_\\s]\\s*`, 'i'), '').trim();
  if (!suffix || suffix === itemName) {
    const parts = itemName.split(/[-–_\s]+/);
    const last = parts[parts.length - 1]?.trim();
    return last && last !== itemName ? [normalizeUnit(last)] : [];
  }
  return [normalizeUnit(suffix)];
}

export interface QBItemForUnitDetection {
  Id: string;
  Name: string;
  Type?: string;
  Sku?: string;
  SubItem?: boolean;
  ParentRef?: { value?: string; name?: string };
  UnitOfMeasureSetRef?: { value?: string; name?: string };
}

export function detectOrderingUnits(
  item: QBItemForUnitDetection,
  uomSetCache: Map<string, string[]>,
): string[] {
  // 1. UOM set (QB Plus/Advanced only)
  const setId = item.UnitOfMeasureSetRef?.value;
  if (setId && uomSetCache.has(setId)) {
    const units = uomSetCache.get(setId)!;
    if (units.length > 0) return units;
  }

  // 2. Sub-item name suffix
  if (item.SubItem && item.ParentRef?.name) {
    const fromName = detectFromSubItemName(item.Name, item.ParentRef.name);
    if (fromName.length > 0) return fromName;
  }

  // 3. SKU token scan
  if (item.Sku) {
    const fromSku = scanForTokens(item.Sku);
    if (fromSku.length > 0) return fromSku;
  }

  // 4. Item name token scan (last resort)
  const fromName = scanForTokens(item.Name);
  if (fromName.length > 0) return fromName;

  // 5. Default
  return ['each'];
}
