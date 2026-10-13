import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Trophy,
  CheckCircle,
  Users,
  Calendar,
  LogOut,
  Menu,
  X,
  Shield,
  UserCog
} from 'lucide-react';

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [adminUser, setAdminUser] = useState(null);

  useEffect(() => {
    // Check if admin is logged in
    const token = localStorage.getItem('adminAccessToken');
    const user = localStorage.getItem('adminUser');

    if (!token || !user) {
      navigate('/admin/login');
      return;
    }

    setAdminUser(JSON.parse(user));
  }, [navigate]);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('adminAccessToken');
      localStorage.removeItem('adminRefreshToken');
      localStorage.removeItem('adminUser');
      navigate('/admin/login');
    }
  };

  const menuItems = [
    {
      path: '/admin/dashboard',
      icon: LayoutDashboard,
      label: 'Dashboard',
      color: 'blue'
    },
    {
      path: '/admin/tournaments/approvals',
      icon: CheckCircle,
      label: 'Approvals',
      color: 'green',
      badge: true
    },
    {
      path: '/admin/tournaments',
      icon: Trophy,
      label: 'Tournaments',
      color: 'purple'
    },
    {
      path: '/admin/matches',
      icon: Calendar,
      label: 'Matches',
      color: 'orange'
    },
    {
      path: '/admin/users',
      icon: Users,
      label: 'Users',
      color: 'indigo'
    },
    {
      path: '/admin/admins',
      icon: UserCog,
      label: 'Admin Management',
      color: 'red',
      superAdminOnly: true
    }
  ];

  const isActive = (path) => location.pathname === path;

  if (!adminUser) {
    return null; // Loading or redirecting
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-gradient-to-b from-primary-600 to-teal-800 text-white transition-all duration-300 z-40 shadow-2xl ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-primary-500/30">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="font-bold text-lg">Admin Panel</h1>
                  <p className="text-xs text-primary-200">SportLife</p>
                </div>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {menuItems
            .filter(item => !item.superAdminOnly || adminUser?.role === 'super_admin')
            .map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    active
                      ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm'
                      : 'text-primary-100 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && (
                    <span className="font-medium">{item.label}</span>
                  )}
                  {sidebarOpen && item.badge && (
                    <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      New
                    </span>
                  )}
                </button>
              );
            })}
        </nav>

        {/* User Info & Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-primary-500/30">
          {sidebarOpen ? (
            <div className="mb-3">
              <p className="text-sm font-medium text-white">{adminUser.first_name} {adminUser.last_name}</p>
              <p className="text-xs text-primary-200">{adminUser.email}</p>
            </div>
          ) : null}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-300 hover:bg-white/10 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {menuItems.find(item => isActive(item.path))?.label || 'Admin Panel'}
              </h2>
              <p className="text-sm text-gray-600">Manage your SportLife platform</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {adminUser.first_name} {adminUser.last_name}
                </p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                {adminUser.first_name?.[0]}{adminUser.last_name?.[0]}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-3">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
