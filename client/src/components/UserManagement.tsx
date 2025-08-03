
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import type { User, CreateUserInput, UserRole, UserStatus } from '../../../server/src/schema';

interface UserManagementProps {
  users: User[];
  onUserUpdate: () => void;
}

export function UserManagement({ users, onUserUpdate }: UserManagementProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'ALL'>('ALL');

  const [formData, setFormData] = useState<CreateUserInput>({
    name: '',
    email: '',
    phone: '',
    address: '',
    identity_number: '',
    role: 'MEMBER'
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await trpc.createUser.mutate(formData);
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        identity_number: '',
        role: 'MEMBER'
      });
      setIsCreateDialogOpen(false);
      onUserUpdate();
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyUser = async (userId: number) => {
    setIsLoading(true);
    try {
      await trpc.verifyUser.mutate({ userId });
      onUserUpdate();
    } catch (error) {
      console.error('Failed to verify user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUserStatus = async (userId: number, status: UserStatus) => {
    setIsLoading(true);
    try {
      await trpc.updateUser.mutate({ id: userId, status });
      onUserUpdate();
    } catch (error) {
      console.error('Failed to update user status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter((user: User) => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.member_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: UserStatus) => {
    const statusConfig = {
      ACTIVE: { label: '✅ Aktif', variant: 'default' as const, className: 'bg-green-600' },
      INACTIVE: { label: '⏸️ Tidak Aktif', variant: 'secondary' as const, className: 'bg-gray-600' },
      PENDING_VERIFICATION: { label: '⏳ Menunggu Verifikasi', variant: 'secondary' as const, className: 'bg-yellow-600' },
      SUSPENDED: { label: '🚫 Ditangguhkan', variant: 'destructive' as const, className: 'bg-red-600' }
    };
    
    const config = statusConfig[status];
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getRoleBadge = (role: UserRole) => {
    return role === 'ADMIN' ? (
      <Badge variant="default" className="bg-red-600">👑 Administrator</Badge>
    ) : (
      <Badge variant="secondary" className="bg-blue-600">👤 Anggota</Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-red-200">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-red-800 flex items-center gap-2">
                👥 Manajemen Anggota
              </CardTitle>
              <CardDescription>
                Kelola anggota koperasi dan administrator sistem
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-red-600 hover:bg-red-700">
                  ➕ Tambah Anggota
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleCreateUser}>
                  <DialogHeader>
                    <DialogTitle className="text-red-800">Tambah Anggota Baru</DialogTitle>
                    <DialogDescription>
                      Masukkan informasi lengkap anggota baru koperasi
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Nama Lengkap</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateUserInput) => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="Masukkan nama lengkap"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
                        }
                        placeholder="email@example.com"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phone">Nomor Telepon</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateUserInput) => ({ ...prev, phone: e.target.value }))
                        }
                        placeholder="+62812345678"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="address">Alamat</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateUserInput) => ({ ...prev, address: e.target.value }))
                        }
                        placeholder="Alamat lengkap"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="identity_number">Nomor Identitas (NIK)</Label>
                      <Input
                        id="identity_number"
                        value={formData.identity_number}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateUserInput) => ({ ...prev, identity_number: e.target.value }))
                        }
                        placeholder="1234567890123456"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="role">Peran</Label>
                      <Select
                        value={formData.role}
                        onValueChange={(value: UserRole) =>
                          setFormData((prev: CreateUserInput) => ({ ...prev, role: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih peran" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MEMBER">👤 Anggota</SelectItem>
                          <SelectItem value="ADMIN">👑 Administrator</SelectItem>
                        </SelectContent>
                      </Select>
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
                    <Button type="submit" disabled={isLoading} className="bg-red-600 hover:bg-red-700">
                      {isLoading ? 'Menyimpan...' : 'Simpan'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="🔍 Cari berdasarkan nama, email, atau nomor anggota..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="border-red-200 focus:border-red-400"
              />
            </div>
            <Select value={statusFilter || 'ALL'} onValueChange={(value: UserStatus | 'ALL') => setStatusFilter(value)}>
              <SelectTrigger className="w-full sm:w-[200px] border-red-200">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Status</SelectItem>
                <SelectItem value="ACTIVE">✅ Aktif</SelectItem>
                <SelectItem value="PENDING_VERIFICATION">⏳ Menunggu Verifikasi</SelectItem>
                <SelectItem value="INACTIVE">⏸️ Tidak Aktif</SelectItem>
                <SelectItem value="SUSPENDED">🚫 Ditangguhkan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-lg font-bold text-green-800">
                {users.filter(u => u.status === 'ACTIVE').length}
              </div>
              <div className="text-sm text-green-600">Anggota Aktif</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-lg font-bold text-yellow-800">
                {users.filter(u => u.status === 'PENDING_VERIFICATION').length}
              </div>
              <div className="text-sm text-yellow-600">Menunggu Verifikasi</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-lg font-bold text-blue-800">
                {users.filter(u => u.role === 'ADMIN').length}
              </div>
              <div className="text-sm text-blue-600">Administrator</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="text-lg font-bold text-red-800">
                {users.length}
              </div>
              <div className="text-sm text-red-600">Total Pengguna</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User List */}
      <div className="grid gap-4">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user: User) => (
            <Card key={user.id} className="border-red-200 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-lg font-bold text-red-800">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-500">#{user.member_number}</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">{user.phone}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="text-right space-y-2">
                      {getRoleBadge(user.role)}
                      {getStatusBadge(user.status)}
                    </div>
                    
                    <div className="flex flex-col space-y-2">
                      {user.status === 'PENDING_VERIFICATION' && (
                        <Button
                          size="sm"
                          onClick={() => handleVerifyUser(user.id)}
                          disabled={isLoading}
                          className="bg-green-600 hover:bg-green-700 text-xs"
                        >
                          ✅ Verifikasi
                        </Button>
                      )}
                      
                      {user.status === 'ACTIVE' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-xs border-yellow-300 text-yellow-700 hover:bg-yellow-50">
                              ⏸️ Nonaktifkan
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Nonaktifkan Anggota</AlertDialogTitle>
                              <AlertDialogDescription>
                                Apakah Anda yakin ingin menonaktifkan {user.name}? 
                                Anggota tidak akan bisa mengakses sistem sampai diaktifkan kembali.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleUpdateUserStatus(user.id, 'INACTIVE')}
                                className="bg-yellow-600 hover:bg-yellow-700"
                              >
                                Nonaktifkan
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      
                      {user.status === 'INACTIVE' && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateUserStatus(user.id, 'ACTIVE')}
                          disabled={isLoading}
                          className="bg-green-600 hover:bg-green-700 text-xs"
                        >
                          ✅ Aktifkan
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Alamat:</span>
                      <p className="text-gray-900">{user.address}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Bergabung:</span>
                      <p className="text-gray-900">{user.date_joined.toLocaleDateString('id-ID')}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-red-200">
            <CardContent className="text-center py-12">
              <div className="text-4xl mb-4">👥</div>
              <p className="text-gray-500 font-medium mb-2">
                {searchTerm || statusFilter !== 'ALL' ? 'Tidak ada anggota yang sesuai filter' : 'Belum ada anggota terdaftar'}
              </p>
              <p className="text-gray-400 text-sm">
                {searchTerm || statusFilter !== 'ALL' ? 'Coba ubah kriteria pencarian atau filter' : 'Tambah anggota baru untuk memulai'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
