'use client';

import Image from 'next/image';
import { Check, Star, X } from 'lucide-react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAdminReviews } from '@/hooks/useAdminReviews';
import type { AdminReviewStatus } from '@/services/admin';

const STATUS_OPTIONS: Array<{ value: AdminReviewStatus; label: string }> = [
  { value: 'pending', label: 'Menunggu' },
  { value: 'approved', label: 'Disetujui' },
  { value: 'rejected', label: 'Ditolak' },
  { value: 'all', label: 'Semua' },
];

const STATUS_LABELS: Record<Exclude<AdminReviewStatus, 'all'>, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
};

function getReviewStatusBadge(status?: string): string {
  if (status === 'approved') return 'bg-green-100 text-green-800';
  if (status === 'rejected') return 'bg-red-100 text-red-800';
  return 'bg-orange-100 text-orange-800';
}

function getReviewStatusLabel(status?: string): string {
  if (status === 'approved' || status === 'rejected' || status === 'pending') {
    return STATUS_LABELS[status];
  }
  return STATUS_LABELS.pending;
}

export default function AdminReviewsPage(): React.ReactElement {
  const {
    reviews,
    status,
    currentPage,
    totalPages,
    isLoading,
    processingId,
    setCurrentPage,
    handleStatusChange,
    moderateReview,
  } = useAdminReviews();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Product Reviews</h1>
          <p className="mt-2 text-gray-600">
            Moderasi review sebelum tampil di halaman produk.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={status === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStatusChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        <div className="overflow-hidden rounded-lg border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Review</th>
                  <th className="px-4 py-3">Produk</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      Memuat review...
                    </td>
                  </tr>
                ) : reviews.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      Belum ada review pada filter ini.
                    </td>
                  </tr>
                ) : (
                  reviews.map((review) => (
                    <tr key={review.id} className="align-top">
                      <td className="max-w-md px-4 py-4">
                        <div className="mb-1 flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                        {review.title && <p className="font-medium text-gray-900">{review.title}</p>}
                        {review.review_text && (
                          <p className="mt-1 line-clamp-3 text-gray-600">{review.review_text}</p>
                        )}
                        {review.image_urls && review.image_urls.length > 0 && (
                          <div className="mt-3 flex gap-2">
                            {review.image_urls.slice(0, 3).map((imageUrl) => (
                              <div key={imageUrl} className="relative h-14 w-14 overflow-hidden rounded-md border bg-gray-50">
                                <Image
                                  src={imageUrl}
                                  alt="Foto review produk"
                                  fill
                                  sizes="56px"
                                  className="object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="mt-2 text-xs text-gray-400">
                          {new Date(review.created_at).toLocaleString('id-ID')}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-gray-700">
                        {review.product_name || review.product_id}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-900">{review.user_name || 'Customer'}</p>
                        {review.user_email && <p className="text-xs text-gray-500">{review.user_email}</p>}
                      </td>
                      <td className="px-4 py-4">
                        <Badge className={getReviewStatusBadge(review.status)}>
                          {getReviewStatusLabel(review.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={processingId === review.id || review.status === 'approved'}
                            onClick={() => void moderateReview(review.id, 'approved')}
                            className="gap-1"
                          >
                            <Check className="h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={processingId === review.id || review.status === 'rejected'}
                            onClick={() => void moderateReview(review.id, 'rejected')}
                            className="gap-1"
                          >
                            <X className="h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
