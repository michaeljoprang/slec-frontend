import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
      <h2>404 - Not Found</h2>
      <p>Halaman yang Anda cari tidak dapat ditemukan.</p>
      <Link href="/" style={{ marginTop: '20px', color: '#1e40af', textDecoration: 'none' }}>
        Kembali ke Dashboard
      </Link>
    </div>
  );
}
