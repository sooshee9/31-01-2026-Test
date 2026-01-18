


import PSIRModule from './modules/PSIRModule';
import VSIRModule from './modules/VSIRModule';
import StockModule from './modules/StockModule';
import ItemMasterModule from './modules/ItemMasterModule';

import React from 'react';
import { useState } from 'react';

import LoginPage from './LoginPage';
import IndentModule from './modules/IndentModule';
import PurchaseModule from './modules/PurchaseModule';
import VendorDeptModule from './modules/VendorDeptModule';
import VendorIssueModule from './modules/VendorIssueModule';
import InHouseIssueModule from './modules/InHouseIssueModule';
import { useUserRole } from './hooks/useUserRole';
import { useAccessControl } from './hooks/useAccessControl';
import './App.css';


const modules: Record<string, React.ReactElement> = {
  purchase: <PurchaseModule />,
  indent: <IndentModule />,
  vendorDept: <VendorDeptModule />,
  vendorIssue: <VendorIssueModule />,
  inHouseIssue: <InHouseIssueModule />,
  psir: <PSIRModule />,
  vsir: <VSIRModule />,
  stock: <StockModule />,
  itemMaster: <ItemMasterModule />,
};


function App() {
  const [activeModule, setActiveModule] = useState<'sales' | 'dc' | 'acuInventory' | 'acuInventoryDashboard' | 'purchase' | 'salesDashboard' | 'debitNote' | 'indent' | 'vendorDept' | 'vendorIssue' | 'inHouseIssue' | 'psir' | 'vsir' | 'stock' | 'itemMaster'>('purchase');
  const [user, setUser] = useState<any>(null);
  const { userProfile, loading: roleLoading } = useUserRole(user);
  const accessControl = useAccessControl(userProfile);

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  if (roleLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#f6f8fa',
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#1a237e' }}>Loading user permissions...</h2>
          <p style={{ color: '#666' }}>Please wait</p>
        </div>
      </div>
    );
  }

  // Check if current module is accessible, if not set to first accessible module
  const accessibleModules = accessControl.getAccessibleModules();
  if (accessibleModules.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#f6f8fa',
      }}>
        <div style={{ textAlign: 'center', background: '#fff', padding: 40, borderRadius: 8, boxShadow: '0 2px 12px #0002' }}>
          <h2 style={{ color: '#d32f2f' }}>Access Denied</h2>
          <p style={{ color: '#666' }}>You do not have access to any modules. Please contact your administrator.</p>
          <button onClick={() => setUser(null)} style={{ background: '#3949ab', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', marginTop: 16, cursor: 'pointer' }}>Logout</button>
        </div>
      </div>
    );
  }

  const currentModuleAccessible = !activeModule || accessControl.hasAccessToModule(activeModule);
  const displayModule = currentModuleAccessible ? activeModule : (accessibleModules[0] as any);

  return (
    <div className="erp-app" style={{ fontFamily: 'Segoe UI, Arial, sans-serif', background: '#f6f8fa', minHeight: '100vh' }}>
      <header style={{ background: '#1a237e', color: '#fff', padding: '20px 32px 8px 32px', boxShadow: '0 2px 8px #0001' }}>
        <h1 style={{ margin: 0, fontSize: 28, letterSpacing: 1, textAlign: 'center' }}>ACU ERP System</h1>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 10 }}>
          <span style={{ fontWeight: 500, fontSize: 16 }}>{user.email}</span>
          {userProfile && <span style={{ fontSize: 14, opacity: 0.9, textTransform: 'capitalize', background: '#3949ab', padding: '4px 12px', borderRadius: 4 }}>{userProfile.role}</span>}
          <button onClick={() => setUser(null)} style={{ background: '#fff', color: '#1a237e', border: 'none', borderRadius: 4, padding: '6px 14px', fontWeight: 500, cursor: 'pointer' }}>Logout</button>
        </div>
      </header>
      <main style={{ maxWidth: 900, margin: '32px auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 12px #0002', padding: 32, minHeight: 400 }}>
        {modules[displayModule]}
      </main>
      <footer style={{
        position: 'fixed',
        left: 0,
        bottom: 0,
        width: '100%',
        background: '#1a237e',
        color: '#fff',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '12px 0',
        boxShadow: '0 -2px 8px #0001',
        zIndex: 100
      }}>
        <nav style={{ display: 'flex', gap: 24, overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: 4, maxWidth: '100vw' }}>
          {accessControl.getVisibleModuleButtons().map((module) => (
            <button
              key={module.id}
              onClick={() => setActiveModule(module.id as any)}
              title={module.description}
              style={{
                background: displayModule === module.id ? '#3949ab' : '#fff',
                color: displayModule === module.id ? '#fff' : '#1a237e',
                border: 'none',
                borderRadius: 4,
                padding: '10px 28px',
                fontWeight: 500,
                fontSize: 16,
                cursor: 'pointer',
                transition: 'background 0.2s, color 0.2s',
              }}
            >
              {module.label}
            </button>
          ))}
        </nav>
      </footer>
    </div>
  );
}

export default App;
