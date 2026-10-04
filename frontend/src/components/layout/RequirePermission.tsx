import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../app/store/authStore";

export default function RequirePermission({ permission }: { permission: string }) {
  const allowed = useAuthStore((state) => state.user?.permissions.includes(permission) ?? false);
  return allowed ? <Outlet /> : <Navigate to="/" replace />;
}
