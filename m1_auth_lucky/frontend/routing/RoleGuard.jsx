import { useAuth } from '../context/AuthContext';
import ForbiddenPage from '../pages/ForbiddenPage';

/** Renders children only for the allowed roles; everyone else sees a friendly 403 page. */
export default function RoleGuard({ roles, children }) {
  const { role } = useAuth();
  if (roles && !roles.includes(role)) return <ForbiddenPage requiredRoles={roles} />;
  return children;
}
