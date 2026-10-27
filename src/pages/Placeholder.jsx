import React from 'react';

const Placeholder = ({ title, icon: Icon, description, color }) => {
  return (
    <div style={{ padding: '2rem', animation: 'fadeIn 0.5s ease-in', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)' }}>
          {Icon && <Icon color={color || "var(--primary-color)"} size={32} />}
          {title}
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>{description}</p>
      </div>

      <div className="glass-panel" style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          {Icon && <Icon size={64} style={{ opacity: 0.2, marginBottom: '1rem' }} />}
          <h2>{title} Module</h2>
          <p>This section is under construction.</p>
        </div>
      </div>
    </div>
  );
};

export default Placeholder;
