
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { User, Savings, Loan, Transaction } from '../../../server/src/schema';

interface MemberDashboardProps {
  user: User | null;
  savings: Savings[];
  loans: Loan[];
  transactions: Transaction[];
}

export function MemberDashboard({ user, savings, loans, transactions }: MemberDashboardProps) {
  if (!user) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  // Calculate totals
  const totalSavings = savings.reduce((sum, saving) => sum + saving.balance, 0);
  const totalLoans = loans.reduce((sum, loan) => sum + loan.remaining_balance, 0);
  const active_loans = loans.filter(loan => loan.status === 'ACTIVE').length;

  // Get latest transactions
  const latestTransactions = transactions
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <Card className="border-red-200 bg-gradient-to-r from-red-600 to-red-800 text-white">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Selamat datang, {user.name}! 👋
          </CardTitle>
          <CardDescription className="text-red-100">
            Anggota #{user.member_number} • Bergabung sejak {user.date_joined.toLocaleDateString('id-ID')}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Key Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              Total Simpanan
            </CardTitle>
            <span className="text-2xl">💰</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {formatCurrency(totalSavings)}
            </div>
            <p className="text-xs text-green-600 mt-1">
              Akumulasi semua jenis simpanan
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              Pinjaman Aktif
            </CardTitle>
            <span className="text-2xl">🏦</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {formatCurrency(totalLoans)}
            </div>
            <p className="text-xs text-blue-600 mt-1">
              {active_loans} pinjaman sedang berjalan
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              Status Keanggotaan
            </CardTitle>
            <span className="text-2xl">👤</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700 mb-2">
              <Badge 
                variant={user.status === 'ACTIVE' ? 'default' : 'secondary'}
                className={user.status === 'ACTIVE' ? 'bg-green-600' : 'bg-yellow-600'}
              >
                {user.status === 'ACTIVE' ? '✅ Aktif' : '⏳ Pending'}
              </Badge>
            </div>
            <p className="text-xs text-purple-600 mt-1">
              {user.verified_at ? 'Terverifikasi' : 'Menunggu verifikasi'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Savings Breakdown */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-800 flex items-center gap-2">
            💰 Rincian Simpanan
          </CardTitle>
          <CardDescription>
            Detail simpanan berdasarkan jenis
          </CardDescription>
        </CardHeader>
        <CardContent>
          {savings.length > 0 ? (
            <div className="space-y-4">
              {['MANDATORY', 'VOLUNTARY', 'SPECIAL'].map(type => {
                const typeSavings = savings.filter(s => s.type === type);
                const typeTotal = typeSavings.reduce((sum, s) => sum + s.balance, 0);
                const typeLabels = {
                  MANDATORY: '📋 Simpanan Wajib',
                  VOLUNTARY: '💝 Simpanan Sukarela',
                  SPECIAL: '⭐ Simpanan Khusus'
                };
                
                if (typeTotal > 0) {
                  return (
                    <div key={type} className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
                      <div>
                        <p className="font-medium text-gray-900">{typeLabels[type as keyof typeof typeLabels]}</p>
                        <p className="text-sm text-gray-600">{typeSavings.length} transaksi</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-red-700">{formatCurrency(typeTotal)}</p>
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">💳 Belum ada simpanan</p>
              <p className="text-sm text-gray-400">Mulai menabung untuk membangun masa depan yang lebih baik!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loan Status */}
      {loans.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              🏦 Status Pinjaman
            </CardTitle>
            <CardDescription>
              Informasi pinjaman yang sedang berjalan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loans.map((loan: Loan) => {
                const progressPercentage = ((loan.amount - loan.remaining_balance) / loan.amount) * 100;
                const statusColors = {
                  PENDING: 'bg-yellow-600',
                  APPROVED: 'bg-blue-600',
                  ACTIVE: 'bg-green-600',
                  COMPLETED: 'bg-gray-600',
                  OVERDUE: 'bg-red-600',
                  REJECTED: 'bg-red-600'
                };
                const statusLabels = {
                  PENDING: '⏳ Menunggu',
                  APPROVED: '✅ Disetujui',
                  ACTIVE: '🔄 Aktif',
                  COMPLETED: '✅ Selesai',
                  OVERDUE: '⚠️ Terlambat',
                  REJECTED: '❌ Ditolak'
                };

                return (
                  <div key={loan.id} className="p-4 border border-red-100 rounded-lg bg-red-50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-medium text-gray-900">Pinjaman #{loan.id}</p>
                        <p className="text-sm text-gray-600">
                          {loan.term_months} bulan • {loan.interest_rate}% per tahun
                        </p>
                      </div>
                      <Badge className={statusColors[loan.status]}>
                        {statusLabels[loan.status]}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Jumlah Pinjaman:</span>
                        <span className="font-medium">{formatCurrency(loan.amount)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Sisa Pinjaman:</span>
                        <span className="font-medium text-red-600">{formatCurrency(loan.remaining_balance)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Cicilan Bulanan:</span>
                        <span className="font-medium">{formatCurrency(loan.monthly_payment)}</span>
                      </div>
                      
                      {loan.status === 'ACTIVE' && (
                        <div className="mt-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Progress Pembayaran:</span>
                            <span className="font-medium">{progressPercentage.toFixed(1)}%</span>
                          </div>
                          <Progress value={progressPercentage} className="h-2" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-800 flex items-center gap-2">
            📝 Transaksi Terbaru
          </CardTitle>
          <CardDescription>
            5 transaksi terakhir dalam akun Anda
          </CardDescription>
        </CardHeader>
        <CardContent>
          {latestTransactions.length > 0 ? (
            <div className="space-y-3">
              {latestTransactions.map((transaction: Transaction) => {
                const typeLabels = {
                  SAVINGS_DEPOSIT: '💰 Setoran Simpanan',
                  LOAN_DISBURSEMENT: '🏦 Pencairan Pinjaman',
                  LOAN_PAYMENT: '💳 Pembayaran Pinjaman',
                  SHU_DISTRIBUTION: '🎯 Distribusi SHU',
                  ADMINISTRATIVE: '📋 Administrasi'
                };

                return (
                  <div key={transaction.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                      <p className="font-medium text-gray-900">
                        {typeLabels[transaction.type]}
                      </p>
                      <p className="text-sm text-gray-600">{transaction.description}</p>
                      <p className="text-xs text-gray-500">
                        {transaction.created_at.toLocaleDateString('id-ID')} • 
                        {transaction.created_at.toLocaleTimeString('id-ID')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${
                        transaction.type === 'SAVINGS_DEPOSIT' || transaction.type === 'SHU_DISTRIBUTION' 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {transaction.type === 'SAVINGS_DEPOSIT' || transaction.type === 'SHU_DISTRIBUTION' ? '+' : '-'}
                        {formatCurrency(Math.abs(transaction.amount))}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">📝 Belum ada transaksi</p>
              <p className="text-sm text-gray-400">Transaksi Anda akan muncul di sini</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-800 flex items-center gap-2">
            ⚡ Aksi Cepat
          </CardTitle>
          <CardDescription>
            Akses cepat ke fitur utama untuk anggota
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors cursor-pointer">
              <div className="text-2xl mb-2">💰</div>
              <div className="text-sm font-medium text-green-800">Setor Simpanan</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer">
              <div className="text-2xl mb-2">🏦</div>
              <div className="text-sm font-medium text-blue-800">Ajukan Pinjaman</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors cursor-pointer">
              <div className="text-2xl mb-2">🗳️</div>
              <div className="text-sm font-medium text-purple-800">Ikuti Voting</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200 hover:bg-red-100 transition-colors cursor-pointer">
              <div className="text-2xl mb-2">📊</div>
              <div className="text-sm font-medium text-red-800">Lihat SHU</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
