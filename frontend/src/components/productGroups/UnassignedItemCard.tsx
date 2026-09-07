import { useDraggable } from "@dnd-kit/core";
import { Box, Typography } from "@mui/material";
import { GripVertical } from "lucide-react";
import type { ItemRow } from "../../lib/api/itemGroupsApi";
import { formatCompactRial } from "../../lib/format";
import { surface } from "../../app/theme/palette";

interface Props {
  item: ItemRow;
}

export default function UnassignedItemCard({ item }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.itemCode,
    data: { item },
  });

  return (
    <Box
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        p: 1.25,
        mb: 1,
        borderRadius: 1,
        bgcolor: surface.glassHover,
        border: `1px solid ${surface.border}`,
        cursor: "grab",
        touchAction: "none",
        opacity: isDragging ? 0.3 : 1,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition: "border-color .15s ease, background-color .15s ease",
        "&:hover": { borderColor: surface.borderStrong, bgcolor: surface.borderStrong },
        zIndex: isDragging ? 10 : "auto",
        position: "relative",
      }}
    >
      <GripVertical size={14} style={{ opacity: 0.4, flexShrink: 0 }} />
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography variant="body2" noWrap title={item.itemName}>
          {item.itemName}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ direction: "ltr", display: "block" }}>
          {formatCompactRial(item.totalAmount)}
        </Typography>
      </Box>
    </Box>
  );
}
