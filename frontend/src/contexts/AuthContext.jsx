import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Demo users for testing (replace with Firebase Auth in production)
const DEMO_USERS = {
  'admin@po.com': { password: 'admin123', role: 'Admin', name: 'Admin User' },
  'production@po.com': { password: 'prod123', role: 'Production Team', name: 'Production Manager' },
  'printing@po.com': { password: 'print123', role: 'Printing Team', name: 'Print Operator' },
  'dispatch@po.com': { password: 'dispatch123', role: 'Dispatch Team', name: 'Dispatch Manager' },
  'viewer@po.com': { password: 'view123', role: 'Viewer', name: 'Viewer User' },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('po_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const demoUser = DEMO_USERS[email];
    if (demoUser && demoUser.password === password) {
      const userData = {
        email,
        name: demoUser.name,
        role: demoUser.role,
        loginTime: new Date().toISOString(),
      };
      setUser(userData);
      localStorage.setItem('po_user', JSON.stringify(userData));
      return userData;
    }
    throw new Error('Invalid email or password');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('po_user');
  };

  const hasPermission = (requiredRoles) => {
    if (!user) return false;
    if (user.role === 'Admin') return true;
    return requiredRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
