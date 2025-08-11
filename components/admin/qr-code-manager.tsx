'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { 
  QrCode, 
  RefreshCw, 
  History, 
  ChevronLeft, 
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

interface RegenerationHistory {
  id: string;
  serviceType: string;
  serviceId: string;
  user?: {
    name: string;
    email: string;
  };
  regeneratedAt: Date;
  regeneratedBy?: {
    name: string;
    email: string;
  };
  reason?: string;
}

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Mock admin ID - in real app this would come from auth
const ADMIN_ID = '507f1f77bcf86cd799439012';

export function QRCodeManager() {
  const [history, setHistory] = useState<RegenerationHistory[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [regenerating, setRegenerating] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  
  // Regeneration form state
  const [serviceType, setServiceType] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchHistory();
  }, [currentPage]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });

      const response = await fetch(`/api/v1/admin/qr/regenerate?${params}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch QR code history');
      }

      setHistory(result.data.history);
      setPagination(result.data.pagination);
    } catch (error: any) {
      console.error('QR history fetch error:', error);
      setError(error.message || 'Failed to load QR code history');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!serviceType || !serviceId) {
      toast.error('Please provide service type and service ID');
      return;
    }

    try {
      setRegenerating(true);

      const response = await fetch('/api/v1/admin/qr/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          serviceType,
          serviceId,
          adminId: ADMIN_ID,
          reason: reason.trim() || undefined
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to regenerate QR code');
      }

      toast.success('QR code regenerated successfully');
      
      // Reset form
      setServiceType('');
      setServiceId('');
      setReason('');
      setShowRegenerateDialog(false);
      
      // Refresh history
      fetchHistory();

    } catch (error: any) {
      console.error('QR regeneration error:', error);
      toast.error(error.message || 'Failed to regenerate QR code');
    } finally {
      setRegenerating(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getServiceTypeBadge = (serviceType: string) => {
    const colors = {
      convention: 'bg-blue-100 text-blue-800',
      dinner: 'bg-green-100 text-green-800',
      accommodation: 'bg-purple-100 text-purple-800',
      brochure: 'bg-orange-100 text-orange-800'
    };

    return (
      <Badge className={colors[serviceType as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {serviceType}
      </Badge>
    );
  };

  if (loading && history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>QR Code Management</CardTitle>
          <CardDescription>Loading QR code data...</CardDescription>
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
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Regenerate QR Code Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                QR Code Management
              </CardTitle>
              <CardDescription>
                Regenerate QR codes for attendee services when needed
              </CardDescription>
            </div>
            <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate QR Code
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Regenerate QR Code</DialogTitle>
                  <DialogDescription>
                    Generate a new QR code for a specific service. This will invalidate the old QR code.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="serviceType">Service Type</Label>
                    <Select value={serviceType} onValueChange={setServiceType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select service type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="convention">Convention Registration</SelectItem>
                        <SelectItem value="dinner">Dinner Reservation</SelectItem>
                        <SelectItem value="brochure">Brochure Order</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serviceId">Service ID</Label>
                    <Input
                      id="serviceId"
                      placeholder="Enter the service record ID"
                      value={serviceId}
                      onChange={(e) => setServiceId(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason (Optional)</Label>
                    <Textarea
                      id="reason"
                      placeholder="Explain why the QR code needs to be regenerated..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowRegenerateDialog(false)}
                    disabled={regenerating}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleRegenerate}
                    disabled={regenerating || !serviceType || !serviceId}
                  >
                    {regenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerate
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Regenerating a QR code will invalidate the previous code. 
              Make sure to notify the attendee about the new QR code.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* QR Code Regeneration History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Regeneration History
          </CardTitle>
          <CardDescription>
            Track all QR code regenerations and their reasons
            {pagination && ` (${pagination.totalRecords} total)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8">
              <QrCode className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No regeneration history</h3>
              <p className="text-muted-foreground">
                QR code regenerations will appear here when they occur.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Regenerated By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div className="space-y-1">
                            {getServiceTypeBadge(record.serviceType)}
                            <div className="text-xs text-muted-foreground">
                              ID: {record.serviceId.slice(-8)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {record.user ? (
                            <div>
                              <div className="font-medium">{record.user.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {record.user.email}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Unknown User</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {record.regeneratedBy ? (
                            <div>
                              <div className="font-medium">{record.regeneratedBy.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {record.regeneratedBy.email}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Unknown Admin</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(record.regeneratedAt).toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          {record.reason ? (
                            <div className="max-w-xs">
                              <p className="text-sm truncate" title={record.reason}>
                                {record.reason}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">No reason provided</span>
                          )}
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
                    Showing {((pagination.currentPage - 1) * 20) + 1} to{' '}
                    {Math.min(pagination.currentPage * 20, pagination.totalRecords)} of{' '}
                    {pagination.totalRecords} records
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}