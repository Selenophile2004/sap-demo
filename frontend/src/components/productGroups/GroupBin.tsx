import { useDroppable } from "@dnd-kit/core";
import { Box, Typography, Chip } from "@mui/material";
import { Package } from "lucide-react";
import type { ItemGroupSummary } from "../../lib/api/itemGroupsApi";
import { formatCompactRial, formatInt } from "../../lib/format";
import { surface } from "../../app/theme/palette";

interface Props {
  group: ItemGroupSummary;
  pulse: boolean;
  onClick: () => void;
}

export default function GroupBin({ group, pulse, onClick }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: group.name, data: { group: group.name } });

  return (
    <Box
      ref={setNodeRef}
      onClick={onClick}
      sx={{
        position: "relative",
        borderRadius: 1,
        p: 2,
        minWidth: 190,
        cursor: "pointer",
        border: `1.5px solid ${isOver ? group.color : surface.border}`,
        bgcolor: isOver ? `${group.color}1A` : surface.glassHover,
        boxShadow: isOver ? `0 0 0 4px ${group.color}25, 0 8px 24px rgba(0,0,0,0.3)` : "none",
        transition: "all .18s cubic-bezier(.34,1.56,.64,1)",
        transform: isOver ? "scale(1.04)" : pulse ? "scale(1.02)" : "scale(1)",
        animation: pulse ? "groupPulse .5s ease" : "none",
        "@keyframes groupPulse": {
          "0%": { boxShadow: `0 0 0 0 ${group.color}80` },
          "70%": { boxShadow: `0 0 0 14px ${group.color}00` },
          "100%": { boxShadow: `0 0 0 0 ${group.color}00` },
        },
        "&:hover": { borderColor: group.color },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            bgcolor: group.color,
            boxShadow: `0 0 8px ${group.color}`,
            flexShrink: 0,
          }}
        />
        <Typography variant="body2" fontWeight={700} noWrap title={group.name}>
          {group.name}
        </Typography>
      </Box>
      <Typography variant="subtitle2" fontWeight={800} sx={{ direction: "ltr" }}>
        {formatCompactRial(group.totalAmount)}
      </Typography>
      <Chip
        size="small"
        icon={<Package size={12} />}
        label={`${formatInt(group.itemCount)} کالا`}
        sx={{ mt: 1, bgcolor: surface.glassHover, height: 22, fontSize: 11 }}
      />
    </Box>
  );
}
