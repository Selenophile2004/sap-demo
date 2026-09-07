import { Box, Paper, Typography } from "@mui/material";
import type { ComponentType } from "react";

interface Props {
  title: string;
  icon: ComponentType<{ size?: number }>;
}

export default function ComingSoonCard({ title, icon: Icon }: Props) {
  return (
    <Paper
      elevation={0}
      sx={{
        position: "relative",
        p: 3,
        borderRadius: 1,
        overflow: "hidden",
        minHeight: 120,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundImage:
          "linear-gradient(135deg, rgba(248,177,123,0.10), rgba(234,34,40,0.06))",
        transition: "transform .25s ease, border-color .25s ease",
        "&:hover": { transform: "translateY(-2px)" },
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 10,
          insetInlineEnd: 10,
          fontSize: 10,
          fontWeight: 700,
          bgcolor: "secondary.main",
          color: "#1a1a1a",
          px: 1,
          py: 0.3,
          borderRadius: 999,
        }}
      >
        به‌زودی
      </Box>
      <Icon size={26} />
      <Typography variant="subtitle2" sx={{ mt: 1 }}>
        {title}
      </Typography>
    </Paper>
  );
}
