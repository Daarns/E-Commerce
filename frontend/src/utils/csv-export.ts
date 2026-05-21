/**
 * CSV Export utility functions
 */
import type { AdminUser } from '@/services/admin';

export interface CSVExportOptions {
  filename?: string;
  headers?: string[];
}

/**
 * Convert array of objects to CSV string
 */
export function arrayToCSV<T extends object>(
  data: T[],
  columns: (keyof T)[],
  columnLabels?: Record<string, string>
): string {
  if (data.length === 0) {
    return '';
  }

  // Create header row
  const headers = columns.map((col) => {
    const label = columnLabels?.[String(col)] || String(col);
    return escapeCSVField(label);
  });

  // Create data rows
  const rows = data.map((item) =>
    columns.map((col) => {
      const value = item[col];
      return escapeCSVField(formatCSVValue(value));
    })
  );

  // Combine headers and rows
  const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
  return csv;
}

/**
 * Escape CSV field (handle commas, quotes, newlines)
 */
function escapeCSVField(field: string): string {
  if (field === null || field === undefined) {
    return '';
  }

  const stringField = String(field);

  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }

  return stringField;
}

/**
 * Format value for CSV (handle dates, numbers, etc)
 */
function formatCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  // Format dates
  if (value instanceof Date) {
    return value.toLocaleDateString('id-ID');
  }

  // Format numbers with proper formatting
  if (typeof value === 'number') {
    return value.toString();
  }

  // Convert booleans to readable text
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return String(value);
}

/**
 * Download CSV file
 */
export function downloadCSV(
  csv: string,
  filename: string = 'export.csv'
): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export users to CSV
 */
export function exportUsersToCSV(
  users: AdminUser[],
  filename: string = `users-${new Date().toISOString().split('T')[0]}.csv`
): void {
  const columns: (keyof AdminUser)[] = [
    'name',
    'email',
    'role',
    'status',
    'total_orders',
    'total_spent',
    'last_login',
    'created_at',
  ];

  const columnLabels: Record<string, string> = {
    name: 'Name',
    email: 'Email',
    role: 'Role',
    status: 'Status',
    total_orders: 'Total Orders',
    total_spent: 'Total Spent (Rp)',
    last_login: 'Last Login',
    created_at: 'Joined Date',
  };

  const csv = arrayToCSV(users, columns, columnLabels);
  downloadCSV(csv, filename);
}
