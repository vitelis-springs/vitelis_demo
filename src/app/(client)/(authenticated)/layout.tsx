'use client';

import { Layout } from 'antd';
import Sidebar from '../../../components/ui/sidebar';
import { ReactNode } from 'react';

const { Content } = Layout;

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return (
    <Layout style={{ minHeight: '100vh', background: '#141414' }}>
      <Sidebar />
      <Content style={{
        padding: 0,
        background: '#141414',
        width: '100%'
      }}>
        {children}
      </Content>
    </Layout>
  );
}
