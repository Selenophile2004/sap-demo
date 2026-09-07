import { salesDb, pnlDb, getDb } from "../db";
import { mappingsDb } from "../db/mappingsDb";

const SEED_COLORS = [
  "#EA2228", "#F8B17B", "#4ADE80", "#60A5FA", "#C084FC", "#F472B6", "#FACC15",
  "#34D399", "#38BDF8", "#FB923C", "#A78BFA", "#F87171", "#2DD4BF", "#94A3B8",
];

// اتحاد دو طبقه‌بندی موجود در فایل‌های دیگر سازمان (سود و زیان محصول/بازاریاب + تارگت)
// به‌عنوان نقطه‌ی شروع؛ کاربر می‌تواند از UI گروه اضافه/حذف کند.
function seedGroupsIfEmpty() {
  const db = mappingsDb();
  const count = (db.prepare("SELECT COUNT(*) AS c FROM item_groups").get() as { c: number }).c;
  if (count > 0) return;

  const pnlGroups = pnlDb()
    .prepare("SELECT DISTINCT item_group FROM pnl_product_marketer_lines WHERE item_group IS NOT NULL")
    .all()
    .map((r: any) => r.item_group as string);

  const targetsRows = getDb("targets.db")
    .prepare("SELECT DISTINCT item_group FROM target_visitor WHERE item_group IS NOT NULL")
    .all()
    .map((r: any) => r.item_group as string);

  const union = Array.from(new Set([...pnlGroups, ...targetsRows])).sort();
  const insert = db.prepare("INSERT OR IGNORE INTO item_groups (name, color, sort_order) VALUES (?, ?, ?)");
  const tx = db.transaction((names: string[]) => {
    names.forEach((name, i) => insert.run(name, SEED_COLORS[i % SEED_COLORS.length], i));
  });
  tx(union);
}

export interface ItemGroupSummary {
  name: string;
  color: string;
  itemCount: number;
  totalAmount: number;
  totalQty: number;
}

export interface ItemRow {
  itemCode: string;
  itemName: string;
  totalAmount: number;
  totalQty: number;
  suggestedGroup: string | null;
  assignedGroup: string | null;
  resolvedGroup: string;
}

function loadAllItems(): ItemRow[] {
  const salesRows = salesDb()
    .prepare(
      `SELECT item_code AS itemCode, item_name AS itemName,
              SUM(net_amount) AS totalAmount,
              SUM(qty_normalized_count_signed) AS totalQty
       FROM sales_lines GROUP BY item_code, item_name`
    )
    .all() as { itemCode: string; itemName: string; totalAmount: number; totalQty: number }[];

  const suggestedRows = pnlDb()
    .prepare(
      `SELECT item_code AS itemCode, item_group AS itemGroup FROM pnl_product_marketer_lines
       WHERE item_group IS NOT NULL GROUP BY item_code`
    )
    .all() as { itemCode: string; itemGroup: string }[];
  const suggestedMap = new Map(suggestedRows.map((r) => [r.itemCode, r.itemGroup]));

  const overrideRows = mappingsDb()
    .prepare("SELECT item_code AS itemCode, item_group AS itemGroup FROM item_group_overrides")
    .all() as { itemCode: string; itemGroup: string }[];
  const overrideMap = new Map(overrideRows.map((r) => [r.itemCode, r.itemGroup]));

  return salesRows.map((r) => {
    const suggested = suggestedMap.get(r.itemCode) ?? null;
    const assigned = overrideMap.get(r.itemCode) ?? null;
    return {
      ...r,
      suggestedGroup: suggested,
      assignedGroup: assigned,
      resolvedGroup: assigned ?? suggested ?? "بدون گروه",
    };
  });
}

export function getGroupsSummary() {
  seedGroupsIfEmpty();
  const groups = mappingsDb()
    .prepare("SELECT name, color FROM item_groups ORDER BY sort_order")
    .all() as { name: string; color: string }[];

  const items = loadAllItems();
  const byGroup = new Map<string, { itemCount: number; totalAmount: number; totalQty: number }>();
  for (const it of items) {
    const key = it.resolvedGroup;
    const entry = byGroup.get(key) ?? { itemCount: 0, totalAmount: 0, totalQty: 0 };
    entry.itemCount += 1;
    entry.totalAmount += it.totalAmount ?? 0;
    entry.totalQty += it.totalQty ?? 0;
    byGroup.set(key, entry);
  }

  const groupSummaries: ItemGroupSummary[] = groups.map((g) => ({
    name: g.name,
    color: g.color,
    ...(byGroup.get(g.name) ?? { itemCount: 0, totalAmount: 0, totalQty: 0 }),
  }));

  const unassigned = byGroup.get("بدون گروه") ?? { itemCount: 0, totalAmount: 0, totalQty: 0 };
  const totalItems = items.length;
  const totalAmount = items.reduce((s, i) => s + (i.totalAmount ?? 0), 0);
  const categorizedAmount = totalAmount - unassigned.totalAmount;

  return {
    groups: groupSummaries,
    unassigned: { name: "بدون گروه", color: "#4B5563", ...unassigned },
    totalItems,
    categorizedPct: totalAmount > 0 ? (categorizedAmount / totalAmount) * 100 : 0,
  };
}

export function getItems(search?: string, group?: string): ItemRow[] {
  const items = loadAllItems();
  let filtered = items;
  if (group) {
    filtered = filtered.filter((i) => i.resolvedGroup === group);
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (i) => i.itemName.toLowerCase().includes(q) || i.itemCode.toLowerCase().includes(q)
    );
  }
  return filtered.sort((a, b) => (b.totalAmount ?? 0) - (a.totalAmount ?? 0));
}

export function assignItemGroup(itemCode: string, group: string) {
  mappingsDb()
    .prepare(
      `INSERT INTO item_group_overrides (item_code, item_group, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(item_code) DO UPDATE SET item_group = excluded.item_group, updated_at = CURRENT_TIMESTAMP`
    )
    .run(itemCode, group);
}

export function createGroup(name: string, color: string) {
  const db = mappingsDb();
  const maxOrder = (db.prepare("SELECT MAX(sort_order) AS m FROM item_groups").get() as { m: number | null }).m ?? -1;
  db.prepare("INSERT OR IGNORE INTO item_groups (name, color, sort_order) VALUES (?, ?, ?)").run(
    name,
    color,
    maxOrder + 1
  );
}

export function deleteGroup(name: string) {
  const db = mappingsDb();
  db.prepare("DELETE FROM item_groups WHERE name = ?").run(name);
  db.prepare("DELETE FROM item_group_overrides WHERE item_group = ?").run(name);
}

export function getGroupDistribution() {
  seedGroupsIfEmpty();
  const items = loadAllItems();
  const byGroup = new Map<string, number>();
  for (const it of items) {
    byGroup.set(it.resolvedGroup, (byGroup.get(it.resolvedGroup) ?? 0) + (it.totalAmount ?? 0));
  }
  return Array.from(byGroup.entries()).map(([group, amount]) => ({ group, amount }));
}
