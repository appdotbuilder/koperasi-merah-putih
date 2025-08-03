
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/utils/trpc';
import type { User, Savings, CreateSavingsInput, SavingsType } from '../../../server/src/schema';

interface SavingsManagementProps {
  currentUser: User | null;
  savings: Savings[];
  onSavingsUpdate: () => void;
}

export function SavingsManagement({ currentUser, savings, onSavingsUpdate }: SavingsManagementProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<SavingsType | 'ALL'>('ALL');

  const [formData, setFormData] = useState<CreateSavingsInput>({
    user_id: currentUser?.id || 0,
    type: 'VOLUNTARY',
    amount: 0,
    description: null
  });

  const handleCreateSavings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsLoading(true);
    try {
      await trpc.createSavings.mutate({
        ...formData,
        user_id: currentUser.id
      });
      setFormData({
        user_id: currentUser.id,
        type: 'VOLUNTARY',
        amount: 0,
        description: null
      });
      setIsCreateDialogOpen(false);
      onSavingsUpdate();
    } catch (error) {
      console.error('Failed to create savings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  const filteredSavings = typeFilter === 'ALL' 
    ? savings 
    : savings.filter(saving => saving.type === typeFilter);

  const getSavingsTypeLabel = (type: SavingsType) => {
    const labels = {
      MANDATORY: '📋 Simpanan Wajib',
      VOLUNTARY: '💝 Simpanan Sukarela',
      SPECIAL: '⭐ Simpanan Khusus'
    };
    return labels[type];
  };

  const getSavingsTypeColor = (type: SavingsType) => {
    const colors = {
      MANDATORY: 'bg-blue-600',
      VOLUNTARY: 'bg-green-600',
      SPECIAL: 'bg-purple-600'
    };
    return colors[type];
  };

  // Calculate totals by type
  const totalsByType = {
    MANDATORY: savings.filter(s => s.type === 'MANDATORY').reduce((sum, s) => sum + s.balance, 0),
    VOLUNTARY: savings.filter(s => s.type === 'VOLUNTARY').reduce((sum, s) => sum + s.balance, 0),
    SPECIAL: savings.filter(s => s.type === 'SPECIAL').reduce((sum, s) => sum + s.balance, 0)
  };

  const grandTotal = Object.values(totalsByType).reduce((sum, total) => sum + total, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-red-200">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-red-800 flex items-center gap-2">
                💰 {currentUser?.role === 'ADMIN' ? 'Manajemen Simpanan' : 'Simpanan Saya'}
              </CardTitle>
              <CardDescription>
                {currentUser?.role === 'ADMIN' 
                  ? 'Kelola simpanan semua anggota koperasi'
                  : 'Riwayat dan detail simpanan pribadi Anda'
                }
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  ➕ {currentUser?.role === 'ADMIN' ? 'Tambah Simpanan' : 'Setor Simpanan'}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleCreateSavings}>
                  <DialogHeader>
                    <DialogTitle className="text-green-800">Tambah Simpanan Baru</DialogTitle>
                    <DialogDescription>
                      Masukkan detail setoran simpanan
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="type">Jenis Simpanan</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value: SavingsType) =>
                          setFormData((prev: CreateSavingsInput) => ({ ...prev, type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih jenis simpanan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MANDATORY">📋 Simpanan Wajib</SelectItem>
                          <SelectItem value="VOLUNTARY">💝 Simpanan Sukarela</SelectItem>
                          <SelectItem value="SPECIAL">⭐ Simpanan Khusus</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="amount">Jumlah Setoran</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={formData.amount}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateSavingsInput) => ({ 
                            ...prev, 
                            amount: parseFloat(e.target.value) || 0 
                          }))
                        }
                        placeholder="0"
                        min="1"
                        step="1000"
                        required
                      />
                      <p className="text-xs text-gray-500">
                        Minimum setoran: {formatCurrency(50000)}
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Keterangan (Opsional)</Label>
                      <Textarea
                        id="description"
                        value={formData.description || ''}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setFormData((prev: CreateSavingsInput) => ({ 
                            ...prev, 
                            description: e.target.value || null 
                          }))
                        }
                        placeholder="Catatan untuk setoran ini..."
                        rows={3}
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
                      disabled={isLoading || formData.amount < 50000} 
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isLoading ? 'Menyimpan...' : 'Setor Simpanan'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-white rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-800">
                {formatCurrency(grandTotal)}
              </div>
              <div className="text-sm text-green-600">Total Simpanan</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-white rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-800">
                {formatCurrency(totalsByType.MANDATORY)}
              </div>
              <div className="text-sm text-blue-600">Simpanan Wajib</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-white rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-800">
                {formatCurrency(totalsByType.VOLUNTARY)}
              </div>
              <div className="text-sm text-green-600">Simpanan Sukarela</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-white rounded-lg border border-purple-200">
              <div className="text-2xl font-bold text-purple-800">
                {formatCurrency(totalsByType.SPECIAL)}
              </div>
              <div className="text-sm text-purple-600">Simpanan Khusus</div>
            </div>
          </div>

          {/* Filter */}
          <div className="flex justify-between items-center mb-6">
            <Select value={typeFilter || 'ALL'} onValueChange={(value: SavingsType | 'ALL') => setTypeFilter(value)}>
              <SelectTrigger className="w-[200px] border-red-200">
                <SelectValue placeholder="Filter jenis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Jenis</SelectItem>
                <SelectItem value="MANDATORY">📋 Simpanan Wajib</SelectItem>
                <SelectItem value="VOLUNTARY">💝 Simpanan Sukarela</SelectItem>
                <SelectItem value="SPECIAL">⭐ Simpanan Khusus</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-gray-600">
              {filteredSavings.length} transaksi ditemukan
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Savings List */}
      <div className="grid gap-4">
        {filteredSavings.length > 0 ? (
          filteredSavings
            .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
            .map((saving: Savings) => (
            <Card key={saving.id} className="border-red-200 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-xl">
                        {saving.type === 'MANDATORY' ? '📋' : 
                         saving.type === 'VOLUNTARY' ? '💝' : '⭐'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {getSavingsTypeLabel(saving.type)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Transaksi #{saving.id} • {saving.transaction_date.toLocaleDateString('id-ID')}
                      </p>
                      {saving.description && (
                        <p className="text-sm text-gray-500 mt-1">{saving.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right space-y-2">
                    <Badge className={getSavingsTypeColor(saving.type)}>
                      {saving.type === 'MANDATORY' ? '📋 Wajib' : 
                       saving.type === 'VOLUNTARY' ? '💝 Sukarela' : '⭐ Khusus'}
                    </Badge>
                    <div>
                      <p className="text-sm text-gray-600">Setoran:</p>
                      <p className="text-lg font-bold text-green-600">
                        +{formatCurrency(saving.amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Saldo:</p>
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(saving.balance)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-red-200">
            <CardContent className="text-center py-12">
              <div className="text-4xl mb-4">💰</div>
              <p className="text-gray-500 font-medium mb-2">
                {typeFilter !== 'ALL' ? 'Tidak ada simpanan untuk jenis ini' : 'Belum ada simpanan'}
              </p>
              <p className="text-gray-400 text-sm mb-4">
                {typeFilter !== 'ALL' 
                  ? 'Coba ubah filter atau tambah simpanan baru' 
                  : 'Mulai menabung untuk membangun masa depan yang lebih baik!'
                }
              </p>
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                ➕ Setor Simpanan Pertama
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Information Panel */}
      <Card className="border-red-200 bg-gradient-to-r from-blue-50 to-white">
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center gap-2">
            💡 Informasi Simpanan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold text-blue-800 mb-2">📋 Simpanan Wajib</h4>
              <p className="text-sm text-gray-600">
                Simpanan yang wajib disetor setiap bulan sesuai ketentuan koperasi. 
                Bersifat mengikat dan tidak dapat ditarik sewaktu-waktu.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-green-800 mb-2">💝 Simpanan Sukarela</h4>
              <p className="text-sm text-gray-600">
                Simpanan atas kehendak sendiri dengan jumlah dan waktu setor yang fleksibel. 
                Dapat ditarik sesuai syarat dan ketentuan yang berlaku.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-purple-800 mb-2">⭐ Simpanan Khusus</h4>
              <p className="text-sm text-gray-600">
                Simpanan untuk tujuan tertentu seperti simpanan hari raya, 
                pendidikan, atau program khusus lainnya.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
