'use client';

import AdminWrapper from '@/components/admin/admin-wrapper';
import { HighSpeedTicketHub } from '@/components/admin/high-speed-ticket-hub';

export default function AdminTicketsPage() {
  return (
    <AdminWrapper>
      <HighSpeedTicketHub />
    </AdminWrapper>
  );
}