import React from 'react';

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>{title} Module</h2>
        <p style={styles.sub}>Feature implementation pending.</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '80%',
  } as React.CSSProperties,
  card: {
    background: '#fff',
    padding: '48px',
    borderRadius: 24,
    boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
    textAlign: 'center',
  } as React.CSSProperties,
  title: {
    color: '#1a1a2e',
    margin: '0 0 12px',
    fontSize: 24,
  } as React.CSSProperties,
  sub: {
    color: '#64748b',
    margin: 0,
  } as React.CSSProperties,
};
