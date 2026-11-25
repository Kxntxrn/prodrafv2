export function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getStatusText(status: string): string {
  switch (status) {
    case 'pending':
      return 'รอการอนุมัติ';
    case 'approved':
      return 'อนุมัติแล้ว (รอรับของ)';
    case 'rejected':
      return 'ปฏิเสธคำขอ';
    case 'borrowed':
      return 'กำลังยืมอยู่';
    case 'returned':
      return 'คืนแล้ว';
    case 'overdue':
      return 'เกินกำหนดคืน';
    default:
      return status;
  }
}

export function getStatusClass(status: string): string {
  switch (status) {
    case 'pending':
      return 'status-badge maintenance';
    case 'approved':
    case 'borrowed':
    case 'returned':
      return 'status-badge available';
    case 'rejected':
    case 'overdue':
      return 'status-badge unavailable';
    default:
      return 'status-badge';
  }
}
