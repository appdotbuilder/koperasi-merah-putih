
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/utils/trpc';

interface DashboardStats {
  total_members: number;
  active_members: number;
  total_savings: number;
  total_loans: number;
  active_loans: number;
  overdue_payments: number;
  pending_loan_applications: number;
  total_shu_distributed: number;
  cash_balance: number;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    total_members: 0,
    active_members: 0,
    total_savings: 0,
    total_loans: 0,
    active_loans: 0,
    overdue_payments: 0,
    pending_loan_applications: 0,
    total_shu_distributed: 0,
    cash_balance: 0
  });
  const [loading, setLoading] = useState(false);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const dashboardStats = await trpc.getDashboardStats.query();
      setStats(dashboardStats);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  const StatCard = ({ 
    title, 
    value, 
    subtitle, 
    icon, 
    color = 'default',
    isCurrency = false 
  }: {
    title: string;
    value: number;
    subtitle: string;
    icon: string;
    color?: 'default' | 'success' | 'warning' | 'danger';
    isCurrency?: boolean;
  }) => {
    const colorClasses = {
      default: 'border-red-200 bg-gradient-to-br from-red-50 to-white',
      success: 'border-green-200 bg-gradient-to-br from-green-50 to-white',
      warning: 'border-yellow-200 bg-gradient-to-br from-yellow-50 to-white',
      danger: 'border-red-300 bg-gradient-to-br from-red-100 to-white'
    };

    return (
      <Card className={`${colorClasses[color]} hover:shadow-md transition-shadow`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-700">
            {title}
          </CardTitle>
          <span className="text-2xl">{icon}</span>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">
            {isCurrency ? formatCurrency(value) : value.toLocaleString('id-ID')}
          </div>
          <p className="text-xs text-gray-600 mt-1">
            {subtitle}
          </p>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="border-red-200">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <Card className="border-red-200 bg-gradient-to-r from-red-600 to-red-800 text-white">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            👑 Dashboard Administrator
          </CardTitle>
          <CardDescription className="text-red-100">
            Selamat datang di sistem manajemen Koperasi Merah Putih
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Key Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Anggota"
          value={stats.total_members}
          subtitle="Terdaftar di koperasi"
          icon="👥"
          color="default"
        />
        
        <StatCard
          title="Anggota Aktif"
          value={stats.active_members}
          subtitle="Status aktif"
          icon="✅"
          color="success"
        />
        
        <StatCard
          title="Total Simpanan"
          value={stats.total_savings}
          subtitle="Akumulasi simpanan"
          icon="💰"
          color="success"
          isCurrency={true}
        />
        
        <StatCard
          title="Saldo Kas"
          value={stats.cash_balance}
          subtitle="Kas koperasi"
          icon="🏦"
          color="default"
          isCurrency={true}
        />
      </div>

      {/* Loan Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Pinjaman"
          value={stats.total_loans}
          subtitle="Nilai pinjaman"
          icon="📊"
          color="default"
          isCurrency={true}
        />
        
        <StatCard
          title="Pinjaman Aktif"
          value={stats.active_loans}
          subtitle="Sedang berjalan"
          icon="🔄"
          color="warning"
        />
        
        <StatCard
          title="Pembayaran Terlambat"
          value={stats.overdue_payments}
          subtitle="Perlu tindak lanjut"
          icon="⚠️"
          color="danger"
        />
        
        <StatCard
          title="Pengajuan Pending"
          value={stats.pending_loan_applications}
          subtitle="Menunggu persetujuan"
          icon="⏳"
          color="warning"
        />
      </div>

      {/* SHU Information */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-800 flex items-center gap-2">
            🎯 Sisa Hasil Usaha (SHU)
          </CardTitle>
          <CardDescription>
            Informasi distribusi SHU kepada anggota
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-800">
                {formatCurrency(stats.total_shu_distributed)}
              </div>
              <div className="text-sm text-green-600 mt-1">
                Total SHU Terdistribusi
              </div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-800">
                {new Date().getFullYear()}
              </div>
              <div className="text-sm text-blue-600 mt-1">
                Tahun Perhitungan
              </div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-800">
                {stats.active_members}
              </div>
              <div className="text-sm text-red-600 mt-1">
                Anggota Penerima
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-800 flex items-center gap-2">
            ⚡ Tindakan Cepat
          </CardTitle>
          <CardDescription>
            Akses cepat ke fungsi penting administrator
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200 hover:bg-red-100 transition-colors cursor-pointer">
              <div className="text-2xl mb-2">👥</div>
              <div className="text-sm font-medium text-red-800">Kelola Anggota</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors cursor-pointer">
              <div className="text-2xl mb-2">✅</div>
              <div className="text-sm font-medium text-green-800">Setujui Pinjaman</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer">
              <div className="text-2xl mb-2">📊</div>
              <div className="text-sm font-medium text-blue-800">Lihat Laporan</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors cursor-pointer">
              <div className="text-2xl mb-2">🗳️</div>
              <div className="text-sm font-medium text-purple-800">Buat Voting</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
