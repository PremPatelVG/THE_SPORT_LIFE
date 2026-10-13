import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const AuthRedirect = ({ to = '/dashboard' }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);

  if (isAuthenticated) {
    return <Navigate to={to} replace />;
  }

  return <Navigate to="/login" replace />;
};

export default AuthRedirect;
