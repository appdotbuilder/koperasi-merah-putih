
import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { User, Loan, CreateLoanInput, LoanStatus } from '../../../server/src/schema';

interface LoanManagementProps {
  currentUser: User | null;
  loans: Loan[];
  onLoanUpdate: () => void;
}

interface LoanSimulation {
  monthly_payment: number;
  total_payment: number;
  total_interest: number;
  payment_schedule: Array<{
    month: number;
    principal: number;
    interest: number;
    total: number;
    remaining_balance: number;
  }>;
}

export function LoanManagement({ currentUser, loans, onLoanUpdate }: LoanManagementProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSimulationDialogOpen, setIsSimulationDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<LoanStatus | 'ALL'>('ALL');
  const [simulation, setSimulation] = useState<LoanSimulation | null>(null);

  const [formData, setFormData] = useState<CreateLoanInput>({
    user_id: currentUser?.id || 0,
    amount: 0,
    term_months: 12,
    purpose: ''
  });

  const [simulationData, setSimulationData] = useState({
    amount: 10000000,
    interestRate: 12,
    termMonths: 12
  });

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsLoading(true);
    try {
      await trpc.createLoan.mutate({
        ...formData,
        user_id: currentUser.id
      });
      setFormData({
        user_id: currentUser.id,
        amount: 0,
        term_months: 12,
        purpose: ''
      });
      setIsCreateDialogOpen(false);
      onLoanUpdate();
    } catch (error) {
      console.error('Failed to create loan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveLoan = async (loanId: number) => {
    if (!currentUser || currentUser.role !== 'ADMIN') return;

    setIsLoading(true);
    try {
      await trpc.approveLoan.mutate({
        loan_id: loanId,
        approved: true,
        interest_rate: 12, // Default interest rate
        approvedBy: currentUser.id
      });
      onLoanUpdate();
    } catch (error) {
      console.error('Failed to approve loan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSimulation = useCallback(async () => {
    if (simulationData.amount > 0 && simulationData.interestRate > 0 && simulationData.termMonths > 0) {
      try {
        const result = await trpc.calculateLoanSimulation.query({
          amount: simulationData.amount,
          interestRate: simulationData.interestRate,
          termMonths: simulationData.termMonths
        });
        setSimulation(() => result);
      } catch (error) {
        console.error('Failed to calculate loan simulation:', error);
      }
    }
  }, [simulationData]);

  useEffect(() => {
    if (isSimulationDialogOpen) {
      calculateSimulation();
    }
  }, [isSimulationDialogOpen, simulationData, calculateSimulation]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  const filteredLoans = statusFilter === 'ALL' 
    ? loans 
    : loans.filter(loan => loan.status === statusFilter);

  const getLoanStatusLabel = (status: LoanStatus) => {
    const labels = {
      PENDING: '⏳ Menunggu Persetujuan',
      APPROVED: '✅ Disetujui',
      REJECTED: '❌ Ditolak',
      ACTIVE: '🔄 Aktif',
      COMPLETED: '✅ Selesai',
      OVERDUE: '⚠️ Terlambat'
    };
    return labels[status];
  };

  const getLoanStatusColor = (status: LoanStatus) => {
    const colors = {
      PENDING: 'bg-yellow-600',
      APPROVED: 'bg-blue-600',
      REJECTED: 'bg-red-600',
      ACTIVE: 'bg-green-600',
      COMPLETED: 'bg-gray-600',
      OVERDUE: 'bg-red-600'
    };
    return colors[status];
  };

  // Calculate loan statistics
  const loanStats = {
    total: loans.reduce((sum, loan) => sum + loan.amount, 0),
    active: loans.filter(l => l.status === 'ACTIVE').length,
    pending: loans.filter(l => l.status === 'PENDING').length,
    remaining: loans.reduce((sum, loan) => sum + loan.remaining_balance, 0)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-red-200">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-red-800 flex items-center gap-2">
                🏦 {currentUser?.role === 'ADMIN' ? 'Manajemen Pinjaman' : 'Pinjaman Saya'}
              </CardTitle>
              <CardDescription>
                {currentUser?.role === 'ADMIN' 
                  ? 'Kelola pengajuan dan persetujuan pinjaman anggota'
                  : 'Riwayat dan status pinjaman pribadi Anda'
                }
              </CardDescription>
            
            </div>
            <div className="flex space-x-2">
              <Dialog open={isSimulationDialogOpen} onOpenChange={setIsSimulationDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50">
                    🧮 Simulasi Pinjaman
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle className="text-blue-800">🧮 Simulasi Pinjaman</DialogTitle>
                    <DialogDescription>
                      Hitung estimasi cicilan bulanan untuk pinjaman Anda
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="sim_amount">Jumlah Pinjaman</Label>
                      <Input
                        id="sim_amount"
                        type="number"
                        value={simulationData.amount}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setSimulationData(prev => ({ 
                            ...prev, 
                            amount: parseFloat(e.target.value) || 0 
                          }))
                        }
                        placeholder="0"
                        min="1000000"
                        step="1000000"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="sim_rate">Suku Bunga (% per tahun)</Label>
                      <Input
                        id="sim_rate"
                        type="number"
                        value={simulationData.interestRate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setSimulationData(prev => ({ 
                            ...prev, 
                            interestRate: parseFloat(e.target.value) || 0 
                          }))
                        }
                        placeholder="12"
                        min="1"
                        max="24"
                        step="0.5"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="sim_term">Jangka Waktu (bulan)</Label>
                      <Select
                        value={simulationData.termMonths.toString()}
                        onValueChange={(value: string) =>
                          setSimulationData(prev => ({ 
                            ...prev, 
                            termMonths: parseInt(value) 
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih jangka waktu" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="6">6 bulan</SelectItem>
                          <SelectItem value="12">12 bulan</SelectItem>
                          <SelectItem value="18">18 bulan</SelectItem>
                          <SelectItem value="24">24 bulan</SelectItem>
                          <SelectItem value="36">36 bulan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {simulation && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-blue-800 mb-3">Hasil Simulasi:</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Cicilan Bulanan:</span>
                            <span className="font-semibold text-blue-800">
                              {formatCurrency(simulation.monthly_payment)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Total Pembayaran:</span>
                            <span className="font-semibold text-gray-900">
                              {formatCurrency(simulation.total_payment)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Total Bunga:</span>
                            <span className="font-semibold text-red-600">
                              {formatCurrency(simulation.total_interest)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsSimulationDialogOpen(false)}
                    >
                      Tutup
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    ➕ Ajukan Pinjaman
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <form onSubmit={handleCreateLoan}>
                    <DialogHeader>
                      <DialogTitle className="text-blue-800">Pengajuan Pinjaman Baru</DialogTitle>
                      <DialogDescription>
                        Isi form pengajuan pinjaman dengan lengkap dan benar
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="amount">Jumlah Pinjaman</Label>
                        <Input
                          id="amount"
                          type="number"
                          value={formData.amount}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData((prev: CreateLoanInput) => ({ 
                              ...prev, 
                              amount: parseFloat(e.target.value) || 0 
                            }))
                          }
                          placeholder="0"
                          min="1000000"
                          step="1000000"
                          required
                        />
                        <p className="text-xs text-gray-500">
                          Minimum pinjaman: {formatCurrency(1000000)}
                        </p>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="term_months">Jangka Waktu</Label>
                        <Select
                          value={formData.term_months.toString()}
                          onValueChange={(value: string) =>
                            setFormData((prev: CreateLoanInput) => ({ 
                              ...prev, 
                              term_months: parseInt(value) 
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih jangka waktu" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="6">6 bulan</SelectItem>
                            <SelectItem value="12">12 bulan</SelectItem>
                            <SelectItem value="18">18 bulan</SelectItem>
                            <SelectItem value="24">24 bulan</SelectItem>
                            <SelectItem value="36">36 bulan</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="purpose">Tujuan Pinjaman</Label>
                        <Textarea
                          id="purpose"
                          value={formData.purpose}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setFormData((prev: CreateLoanInput) => ({ 
                              ...prev, 
                              purpose: e.target.value 
                            }))
                          }
                          placeholder="Jelaskan tujuan penggunaan pinjaman..."
                          rows={3}
                          required
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                      >
                        Batal
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={isLoading || formData.amount < 1000000} 
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isLoading ? 'Mengajukan...' : 'Ajukan Pinjaman'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-white rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-800">
                {formatCurrency(loanStats.total)}
              </div>
              <div className="text-sm text-blue-600">Total Pinjaman</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-white rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-800">
                {loanStats.active}
              </div>
              <div className="text-sm text-green-600">Pinjaman Aktif</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-white rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-800">
                {loanStats.pending}
              </div>
              <div className="text-sm text-yellow-600">Menunggu Persetujuan</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-red-50 to-white rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-800">
                {formatCurrency(loanStats.remaining)}
              </div>
              <div className="text-sm text-red-600">Sisa Pinjaman</div>
            </div>
          </div>

          {/* Filter */}
          <div className="flex justify-between items-center mb-6">
            <Select value={statusFilter} onValueChange={(value: LoanStatus | 'ALL') => setStatusFilter(value)}>
              <SelectTrigger className="w-[250px] border-red-200">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Status</SelectItem>
                <SelectItem value="PENDING">⏳ Menunggu Persetujuan</SelectItem>
                <SelectItem value="APPROVED">✅ Disetujui</SelectItem>
                <SelectItem value="ACTIVE">🔄 Aktif</SelectItem>
                <SelectItem value="COMPLETED">✅ Selesai</SelectItem>
                <SelectItem value="OVERDUE">⚠️ Terlambat</SelectItem>
                <SelectItem value="REJECTED">❌ Ditolak</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-gray-600">
              {filteredLoans.length} pinjaman ditemukan
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loans List */}
      <div className="grid gap-4">
        {filteredLoans.length > 0 ? (
          filteredLoans
            .sort((a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime())
            .map((loan: Loan) => {
              const progressPercentage = loan.amount > 0 
                ? ((loan.amount - loan.remaining_balance) / loan.amount) * 100 
                : 0;

              return (
                <Card key={loan.id} className="border-red-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xl">🏦</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            Pinjaman #{loan.id}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Diajukan pada {loan.applied_at.toLocaleDateString('id-ID')}
                          </p>
                          {loan.approved_at && (
                            <p className="text-sm text-green-600">
                              Disetujui pada {loan.approved_at.toLocaleDateString('id-ID')}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right space-y-2">
                        <Badge className={getLoanStatusColor(loan.status)}>
                          {getLoanStatusLabel(loan.status)}
                        </Badge>
                        {currentUser?.role === 'ADMIN' && loan.status === 'PENDING' && (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleApproveLoan(loan.id)}
                              disabled={isLoading}
                              className="bg-green-600 hover:bg-green-700 text-xs"
                            >
                              ✅ Setujui
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs border-red-300 text-red-700 hover:bg-red-50"
                            >
                              ❌ Tolak
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Jumlah Pinjaman</p>
                        <p className="font-bold text-lg text-blue-600">
                          {formatCurrency(loan.amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Sisa Pinjaman</p>
                        <p className="font-bold text-lg text-red-600">
                          {formatCurrency(loan.remaining_balance)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Cicilan Bulanan</p>
                        <p className="font-bold text-lg text-gray-900">
                          {formatCurrency(loan.monthly_payment)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Jangka Waktu</p>
                        <p className="font-bold text-lg text-gray-900">
                          {loan.term_months} bulan
                        </p>
                      </div>
                    </div>

                    {loan.status === 'ACTIVE' && (
                      <div className="mt-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600">Progress Pembayaran:</span>
                          <span className="font-medium">{progressPercentage.toFixed(1)}%</span>
                        </div>
                        <Progress value={progressPercentage} className="h-3" />
                      </div>
                    )}

                    <Separator className="my-4" />
                    
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Suku Bunga:</span> {loan.interest_rate}% per tahun
                      </div>
                      <div className="flex space-x-2">
                        {loan.status === 'ACTIVE' && (
                          <Button variant="outline" size="sm" className="text-xs">
                            📅 Lihat Jadwal
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="text-xs">
                          📄 Detail
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
        ) : (
          <Card className="border-red-200">
            <CardContent className="text-center py-12">
              <div className="text-4xl mb-4">🏦</div>
              <p className="text-gray-500 font-medium mb-2">
                {statusFilter !== 'ALL' ? 'Tidak ada pinjaman dengan status ini' : 'Belum ada pinjaman'}
              </p>
              <p className="text-gray-400 text-sm mb-4">
                {statusFilter !== 'ALL' 
                  ? 'Coba ubah filter atau buat pengajuan baru' 
                  : 'Ajukan pinjaman pertama Anda untuk memulai!'
                }
              </p>
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                ➕ Ajukan Pinjaman Sekarang
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Information Panel */}
      <Card className="border-red-200 bg-gradient-to-r from-blue-50 to-white">
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center gap-2">
            💡 Informasi Pinjaman
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-blue-800 mb-2">📋 Syarat Pengajuan</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Status anggota aktif minimal 6 bulan</li>
                <li>• Memiliki simpanan wajib yang cukup</li>
                <li>• Tidak memiliki tunggakan pinjaman</li>
                <li>• Melengkapi dokumen yang diperlukan</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-green-800 mb-2">💰 Ketentuan Pinjaman</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Pinjaman minimal: {formatCurrency(1000000)}</li>
                <li>• Pinjaman maksimal: 10x simpanan wajib</li>
                <li>• Suku bunga: 12-18% per tahun</li>
                <li>• Jangka waktu: 6-36 bulan</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
