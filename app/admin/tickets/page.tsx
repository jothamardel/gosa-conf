'use client';

import { useState } from 'react';
import AdminWrapper from '@/components/admin/admin-wrapper';
import { TicketSearch } from '@/components/admin/ticket-search';

export default function AdminTicketsPage() {
  return (
    <AdminWrapper>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ticket Search</h1>
          <p className="text-gray-600 mt-1">
            Search and manage tickets by payment reference
          </p>
        </div>

        <TicketSearch />
      </div>
    </AdminWrapper>
  );
}