'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  MessageCircle, 
  Check, 
  X, 
  Clock, 
  Heart,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface GoodwillMessage {
  _id: string;
  message: string;
  donationAmount: number;
  attributionName?: string;
  anonymous: boolean;
  approved: boolean;
  confirmedAt: Date;
  user: {
    name: string;
    email: string;
  };
}

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalMessages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Mock admin ID - in real app this would come from auth
const ADMIN_ID = '507f1f77bcf86cd799439012';

export function GoodwillManager() {
  const [messages, setMessages] = useState<GoodwillMessage[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, [currentPage]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        status: 'pending' // Only show pending messages
      });

      const response = await fetch(`/api/v1/goodwill?${params}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch messages');
      }

      setMessages(result.data.messages || []);
      setPagination(result.data.pagination);
    } catch (error: any) {
      console.error('Messages fetch error:', error);
      setError(error.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSingleApproval = async (messageId: string, approved: boolean, reason?: string) => {
    try {
      setProcessing(true);

      const response = await fetch(`/api/v1/goodwill/${messageId}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          approved,
          approvedBy: ADMIN_ID,
          reason
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update message');
      }

      toast.success(approved ? 'Message approved!' : 'Message rejected');
      
      // Remove the message from the list
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
      
      // Clear selection if this message was selected
      setSelectedMessages(prev => prev.filter(id => id !== messageId));

    } catch (error: any) {
      console.error('Approval error:', error);
      toast.error(error.message || 'Failed to update message');
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkApproval = async () => {
    if (selectedMessages.length === 0) {
      toast.error('Please select messages to process');
      return;
    }

    if (approvalAction === 'reject' && !rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setProcessing(true);

      const response = await fetch('/api/v1/goodwill/bulk-approve', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messageIds: selectedMessages,
          approved: approvalAction === 'approve',
          approvedBy: ADMIN_ID,
          reason: approvalAction === 'reject' ? rejectionReason : undefined
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to process messages');
      }

      toast.success(
        approvalAction === 'approve' 
          ? `${result.data.processedCount} messages approved!`
          : `${result.data.processedCount} messages rejected`
      );
      
      // Remove processed messages from the list
      setMessages(prev => prev.filter(msg => !selectedMessages.includes(msg._id)));
      
      // Clear selections and close dialog
      setSelectedMessages([]);
      setShowApprovalDialog(false);
      setRejectionReason('');

    } catch (error: any) {
      console.error('Bulk approval error:', error);
      toast.error(error.message || 'Failed to process messages');
    } finally {
      setProcessing(false);
    }
  };

  const handleSelectMessage = (messageId: string, selected: boolean) => {
    if (selected) {
      setSelectedMessages(prev => [...prev, messageId]);
    } else {
      setSelectedMessages(prev => prev.filter(id => id !== messageId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedMessages(messages.map(msg => msg._id));
    } else {
      setSelectedMessages([]);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedMessages([]); // Clear selections when changing pages
  };

  if (loading && messages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Goodwill Messages</CardTitle>
          <CardDescription>Loading pending messages...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 border rounded-lg">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-16 w-full mb-2" />
                <Skeleton className="h-4 w-1/2" />
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Goodwill Messages
              </CardTitle>
              <CardDescription>
                Review and approve pending goodwill messages
                {pagination && ` (${pagination.totalMessages} total)`}
              </CardDescription>
            </div>
            {selectedMessages.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {selectedMessages.length} selected
                </Badge>
                <Button
                  onClick={() => {
                    setApprovalAction('approve');
                    setShowApprovalDialog(true);
                  }}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve Selected
                </Button>
                <Button
                  onClick={() => {
                    setApprovalAction('reject');
                    setShowApprovalDialog(true);
                  }}
                  size="sm"
                  variant="destructive"
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject Selected
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No pending messages</h3>
              <p className="text-muted-foreground">
                All goodwill messages have been reviewed.
              </p>
            </div>
          ) : (
            <>
              {/* Select All */}
              <div className="flex items-center space-x-2 mb-4 p-3 bg-gray-50 rounded-lg">
                <Checkbox
                  checked={selectedMessages.length === messages.length}
                  onCheckedChange={handleSelectAll}
                />
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Select all messages on this page
                </span>
              </div>

              {/* Messages List */}
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message._id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        checked={selectedMessages.includes(message._id)}
                        onCheckedChange={(checked) => handleSelectMessage(message._id, checked as boolean)}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-3">
                        {/* Message Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              <Heart className="h-3 w-3 mr-1" />
                              ${message.donationAmount}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(message.confirmedAt).toLocaleDateString()}
                          </div>
                        </div>

                        {/* Message Content */}
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <p className="text-gray-700 italic">"{message.message}"</p>
                          <div className="text-xs text-gray-500 mt-2">
                            - {message.anonymous ? 'Anonymous' : message.attributionName}
                          </div>
                        </div>

                        {/* User Info */}
                        <div className="text-sm text-muted-foreground">
                          Submitted by: {message.user.name} ({message.user.email})
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={() => handleSingleApproval(message._id, true)}
                            disabled={processing}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            onClick={() => handleSingleApproval(message._id, false, 'Content not suitable')}
                            disabled={processing}
                            size="sm"
                            variant="destructive"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-muted-foreground">
                    Showing {((pagination.currentPage - 1) * 10) + 1} to{' '}
                    {Math.min(pagination.currentPage * 10, pagination.totalMessages)} of{' '}
                    {pagination.totalMessages} messages
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

      {/* Bulk Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === 'approve' ? 'Approve Messages' : 'Reject Messages'}
            </DialogTitle>
            <DialogDescription>
              You are about to {approvalAction} {selectedMessages.length} message(s).
              {approvalAction === 'approve' 
                ? ' Approved messages will be displayed publicly.'
                : ' This action cannot be undone.'
              }
            </DialogDescription>
          </DialogHeader>
          
          {approvalAction === 'reject' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for rejection:</label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a reason for rejecting these messages..."
                rows={3}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApprovalDialog(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkApproval}
              disabled={processing || (approvalAction === 'reject' && !rejectionReason.trim())}
              className={approvalAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
              variant={approvalAction === 'reject' ? 'destructive' : 'default'}
            >
              {processing ? 'Processing...' : `${approvalAction === 'approve' ? 'Approve' : 'Reject'} ${selectedMessages.length} Messages`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}