'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  Download,
  QrCode,
  Mail,
  Phone,
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';

interface AttendeeData {
  userId: string;
  name: string;
  email: string;
  phone: string;
  registrationDate: Date;
  services: {
    convention: boolean;
    dinner: boolean;
    accommodation: boolean;
    brochure: boolean;
    goodwill: boolean;
    donation: boolean;
    badge: boolean;
  };
  totalSpent: number;
  qrCodes: Array<{
    service: string;
    code: string;
    used: boolean;
  }>;
}

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalAttendees: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  limit: number;
}

export function AttendeeTable() {
  const [attendees, setAttendees] = useState<AttendeeData[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchAttendees();
  }, [currentPage, searchTerm, serviceFilter]);

  const fetchAttendees = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        search: searchTerm,
        service: serviceFilter
      });

      const response = await fetch(`/api/v1/admin/attendees?${params}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch attendees');
      }

      setAttendees(result.data.attendees);
      setPagination(result.data.pagination);
    } catch (error: any) {
      console.error('Attendees fetch error:', error);
      setError(error.message || 'Failed to load attendees');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleServiceFilter = (value: string) => {
    setServiceFilter(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const exportAttendees = async () => {
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        service: serviceFilter,
        export: 'true'
      });

      const response = await fetch(`/api/v1/admin/attendees?${params}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      // Create CSV content
      const csvContent = [
        ['Name', 'Email', 'Phone', 'Registration Date', 'Services', 'Total Spent'].join(','),
        ...result.data.attendees.map((attendee: AttendeeData) => [
          attendee.name,
          attendee.email,
          attendee.phone,
          new Date(attendee.registrationDate).toLocaleDateString(),
          Object.entries(attendee.services)
            .filter(([_, value]) => value)
            .map(([key, _]) => key)
            .join('; '),
          `$${attendee.totalSpent}`
        ].join(','))
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attendees_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Attendees exported successfully');
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Failed to export attendees');
    }
  };

  const getServiceBadges = (services: AttendeeData['services']) => {
    return Object.entries(services)
      .filter(([_, value]) => value)
      .map(([key, _]) => (
        <Badge key={key} variant="secondary" className="text-xs">
          {key}
        </Badge>
      ));
  };

  if (loading && attendees.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Attendees</CardTitle>
          <CardDescription>Loading attendee data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Attendees</CardTitle>
            <CardDescription>
              Manage convention attendees and their services
              {pagination && ` (${pagination.totalAttendees} total)`}
            </CardDescription>
          </div>
          <Button onClick={exportAttendees} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={serviceFilter} onValueChange={handleServiceFilter}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              <SelectItem value="convention">Convention</SelectItem>
              <SelectItem value="dinner">Dinner</SelectItem>
              <SelectItem value="accommodation">Accommodation</SelectItem>
              <SelectItem value="brochure">Brochure</SelectItem>
              <SelectItem value="goodwill">Goodwill</SelectItem>
              <SelectItem value="donation">Donation</SelectItem>
              <SelectItem value="badge">Badge</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Attendee</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Services</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead>Registration Date</TableHead>
                <TableHead>QR Codes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendees.map((attendee) => (
                <TableRow key={attendee.userId}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{attendee.name}</div>
                      <div className="text-sm text-muted-foreground">
                        ID: {attendee.userId.slice(-8)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center text-sm">
                        <Mail className="h-3 w-3 mr-1" />
                        {attendee.email}
                      </div>
                      <div className="flex items-center text-sm">
                        <Phone className="h-3 w-3 mr-1" />
                        {attendee.phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {getServiceBadges(attendee.services)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <DollarSign className="h-3 w-3 mr-1" />
                      {attendee.totalSpent.toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(attendee.registrationDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        <QrCode className="h-3 w-3 mr-1" />
                        {attendee.qrCodes.length}
                      </Badge>
                      {attendee.qrCodes.some(qr => qr.used) && (
                        <Badge variant="secondary" className="text-xs">
                          Used
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.currentPage * pagination.limit, pagination.totalAttendees)} of{' '}
              {pagination.totalAttendees} attendees
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={!pagination.hasPrevPage || loading}
                variant="outline"
                size="sm"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      variant={pagination.currentPage === page ? "default" : "outline"}
                      size="sm"
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              <Button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={!pagination.hasNextPage || loading}
                variant="outline"
                size="sm"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}