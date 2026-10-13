import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useEffect, useState } from 'react';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useSelector((state) => state.auth);
  const [adminAuth, setAdminAuth] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check admin authentication
    const adminAccessToken = localStorage.getItem('adminAccessToken');
    const adminUser = localStorage.getItem('adminUser');
    
    // console.log('ProtectedRoute - Auth check:', {
    //   isAuthenticated,
    //   hasAdminToken: !!adminAccessToken,
    //   hasAdminUser: !!adminUser,
    //   loading
    // });
    
    setAdminAuth(!!adminAccessToken && !!adminUser);
    setChecking(false);
  }, [isAuthenticated, loading]);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Allow access if either player or admin is authenticated
  if (!isAuthenticated && !adminAuth) {
    
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
