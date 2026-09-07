import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  Box,
  Typography,
  TextField,
  Button,
  LinearProgress,
  Paper,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Search, Plus, ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { itemGroupsApi, type GroupsSummaryResponse, type ItemRow, type ItemGroupSummary } from "../../lib/api/itemGroupsApi";
import UnassignedItemCard from "../../components/productGroups/UnassignedItemCard";
import GroupBin from "../../components/productGroups/GroupBin";
import AddGroupDialog from "../../components/productGroups/AddGroupDialog";
import GroupDetailDialog from "../../components/productGroups/GroupDetailDialog";
import { formatPercent } from "../../lib/format";
import { surface } from "../../app/theme/palette";

export default function ProductGroupsPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<GroupsSummaryResponse | null>(null);
  const [unassigned, setUnassigned] = useState<ItemRow[]>([]);
  const [search, setSearch] = useState("");
  const [activeItem, setActiveItem] = useState<ItemRow | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [detailGroup, setDetailGroup] = useState<ItemGroupSummary | null>(null);
  const [pulsingGroup, setPulsingGroup] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const loadSummary = useCallback(async () => {
    const s = await itemGroupsApi.summary();
    setSummary(s);
  }, []);

  const loadUnassigned = useCallback(async (q: string) => {
    const rows = await itemGroupsApi.items(q || undefined, "بدون گروه", 250);
    setUnassigned(rows);
  }, []);

  useEffect(() => {
    loadSummary();
    loadUnassigned("");
  }, [loadSummary, loadUnassigned]);

  useEffect(() => {
    const t = setTimeout(() => loadUnassigned(search), 250);
    return () => clearTimeout(t);
  }, [search, loadUnassigned]);

  function handleDragStart(e: DragStartEvent) {
    setActiveItem((e.active.data.current?.item as ItemRow) ?? null);
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveItem(null);
    const groupName = e.over?.data.current?.group as string | undefined;
    const item = e.active.data.current?.item as ItemRow | undefined;
    if (!groupName || !item) return;

    setUnassigned((prev) => prev.filter((i) => i.itemCode !== item.itemCode));
    setPulsingGroup(groupName);
    setTimeout(() => setPulsingGroup(null), 550);

    await itemGroupsApi.assign(item.itemCode, groupName);
    loadSummary();
  }

  async function handleCreateGroup(name: string, color: string) {
    await itemGroupsApi.createGroup(name, color);
    setAddOpen(false);
    loadSummary();
  }

  const allGroupsForSelect = useMemo(
    () => (summary ? [...summary.groups, summary.unassigned] : []),
    [summary]
  );

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <IconButton size="small" onClick={() => navigate("/sales")}>
          <ArrowRight size={18} />
        </IconButton>
        <Typography variant="h5" fontWeight={800}>
          مدیریت گروه‌بندی کالا
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        کالاهای «بدون گروه» را با درگ‌ودراپ به گروه کالایی مناسب منتقل کنید. برای اصلاح یا جابه‌جایی کالاهای
        دسته‌بندی‌شده هم روی هر گروه کلیک کنید.
      </Typography>

      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 1, mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Sparkles size={16} color="#F8B17B" />
            <Typography variant="body2" fontWeight={700}>
              {formatPercent(summary?.categorizedPct)} از ارزش فروش دسته‌بندی شده
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {summary?.unassigned.itemCount ?? 0} کالای بدون گروه از {summary?.totalItems ?? 0} کالا
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={summary?.categorizedPct ?? 0}
          sx={{
            height: 8,
            borderRadius: 999,
            bgcolor: surface.glassHover,
            "& .MuiLinearProgress-bar": {
              borderRadius: 999,
              backgroundImage: "linear-gradient(90deg, #7900DD, #F8B17B)",
            },
          }}
        />
      </Paper>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start", flexDirection: { xs: "column", lg: "row" } }}>
          <Paper
            elevation={0}
            sx={{ p: 2, borderRadius: 1, width: { xs: "100%", lg: 340 }, flexShrink: 0 }}
          >
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
              بدون گروه
            </Typography>
            <TextField
              size="small"
              fullWidth
              placeholder="جستجوی کالا…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ mb: 2 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={16} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Box sx={{ maxHeight: 560, overflowY: "auto", pr: 0.5 }}>
              {unassigned.map((item) => (
                <UnassignedItemCard key={item.itemCode} item={item} />
              ))}
              {unassigned.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
                  چیزی پیدا نشد 🎉
                </Typography>
              )}
            </Box>
          </Paper>

          <Box sx={{ flexGrow: 1, display: "flex", flexWrap: "wrap", gap: 1.5, minWidth: 0 }}>
            {summary?.groups.map((g) => (
              <GroupBin
                key={g.name}
                group={g}
                pulse={pulsingGroup === g.name}
                onClick={() => setDetailGroup(g)}
              />
            ))}
            <Button
              onClick={() => setAddOpen(true)}
              startIcon={<Plus size={16} />}
              sx={{
                minWidth: 190,
                minHeight: 96,
                borderRadius: 1,
                border: `1.5px dashed ${surface.borderStrong}`,
                color: "text.secondary",
                "&:hover": { borderColor: "secondary.main", color: "secondary.main" },
              }}
            >
              گروه جدید
            </Button>
          </Box>
        </Box>

        <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(.2,1,.4,1)" }}>
          {activeItem && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1,
                bgcolor: surface.glassStrong,
                border: "1.5px solid rgba(248,177,123,0.6)",
                boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
                transform: "rotate(-3deg) scale(1.05)",
                minWidth: 220,
              }}
            >
              <Typography variant="body2" fontWeight={700} noWrap>
                {activeItem.itemName}
              </Typography>
            </Box>
          )}
        </DragOverlay>
      </DndContext>

      <AddGroupDialog open={addOpen} onClose={() => setAddOpen(false)} onCreate={handleCreateGroup} />
      <GroupDetailDialog
        group={detailGroup}
        allGroups={allGroupsForSelect}
        onClose={() => setDetailGroup(null)}
        onChanged={() => {
          loadSummary();
          loadUnassigned(search);
        }}
      />
    </Box>
  );
}
