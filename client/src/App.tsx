
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { User, UserRole, Savings, Loan, Notification, Transaction } from '../../server/src/schema';

// Component imports
import { UserManagement } from '@/components/UserManagement';
import { SavingsManagement } from '@/components/SavingsManagement';
import { LoanManagement } from '@/components/LoanManagement';
import { VotingSystem } from '@/components/VotingSystem';
import { MemberDashboard } from '@/components/MemberDashboard';
import { AdminDashboard } from '@/components/AdminDashboard';
import { NotificationCenter } from '@/components/NotificationCenter';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [userSavings, setUserSavings] = useState<Savings[]>([]);
  const [userLoans, setUserLoans] = useState<Loan[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Authentication state
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      // Load user-specific data
      if (currentUser.role === 'MEMBER') {
        const [savings, loans, userNotifications, userTransactions] = await Promise.all([
          trpc.getUserSavings.query({ userId: currentUser.id }),
          trpc.getLoans.query({ userId: currentUser.id }),
          trpc.getUserNotifications.query({ userId: currentUser.id }),
          trpc.getTransactions.query({ userId: currentUser.id })
        ]);
        
        setUserSavings(savings);
        setUserLoans(loans);
        setNotifications(userNotifications);
        setTransactions(userTransactions);
      } else {
        // Admin loads all data
        const [allUsers, allLoans, allTransactions] = await Promise.all([
          trpc.getUsers.query(),
          trpc.getLoans.query(),
          trpc.getTransactions.query()
        ]);
        
        setUsers(allUsers);
        setUserLoans(allLoans);
        setTransactions(allTransactions);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogin = (role: UserRole) => {
    // Create demo user data based on role
    const demoUser: User = {
      id: role === 'ADMIN' ? 1 : 2,
      member_number: role === 'ADMIN' ? 'ADM001' : 'MBR001',
      name: role === 'ADMIN' ? 'Administrator Koperasi' : 'Budi Santoso',
      email: role === 'ADMIN' ? 'admin@koperasi.id' : 'budi@example.com',
      phone: '+62812345678',
      address: 'Jakarta, Indonesia',
      identity_number: '1234567890123456',
      role: role,
      status: 'ACTIVE',
      date_joined: new Date('2024-01-01'),
      verified_at: new Date('2024-01-01'),
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01')
    };
    
    setCurrentUser(demoUser);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsLoggedIn(false);
    setUsers([]);
    setUserSavings([]);
    setUserLoans([]);
    setNotifications([]);
    setTransactions([]);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50">
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-md border-red-200 shadow-xl">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-red-600 to-red-800 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-white">🏛️</span>
              </div>
              <div className="space-y-2">
                <CardTitle className="text-2xl font-bold text-red-800">
                  Koperasi Merah Putih
                </CardTitle>
                <CardDescription className="text-red-600">
                  Sistem Manajemen Koperasi Digital
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm text-gray-600 text-center">
                  Pilih jenis akun untuk masuk ke sistem:
                </p>
                <Button 
                  onClick={() => handleLogin('ADMIN')}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3"
                  size="lg"
                >
                  🔑 Masuk sebagai Administrator
                </Button>
                <Button 
                  onClick={() => handleLogin('MEMBER')}
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50 font-semibold py-3"
                  size="lg"
                >
                  👤 Masuk sebagai Anggota
                </Button>
              </div>
              <Separator />
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  🇮🇩 Membangun Indonesia melalui gotong royong
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50">
      {/* Header */}
      <header className="bg-white border-b border-red-200 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-800 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold text-white">🏛️</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-red-800">Koperasi Merah Putih</h1>
                <p className="text-sm text-red-600">Sistem Manajemen Digital</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {currentUser && (
                <>
                  <NotificationCenter 
                    notifications={notifications}
                    onMarkAsRead={async (id: number) => {
                      try {
                        await trpc.markNotificationRead.mutate({ notificationId: id });
                        setNotifications(prev => 
                          prev.map(n => n.id === id ? { ...n, read: true } : n)
                        );
                      } catch (error) {
                        console.error('Failed to mark notification as read:', error);
                      }
                    }}
                  />
                  
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarFallback className="bg-red-100 text-red-800">
                        {currentUser.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{currentUser.name}</p>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={currentUser.role === 'ADMIN' ? 'default' : 'secondary'}
                          className={currentUser.role === 'ADMIN' ? 'bg-red-600' : 'bg-blue-600'}
                        >
                          {currentUser.role === 'ADMIN' ? '👑 Administrator' : '👤 Anggota'}
                        </Badge>
                        <span className="text-xs text-gray-500">#{currentUser.member_number}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    size="sm"
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Keluar
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 mb-6 bg-red-50 border border-red-200">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
              📊 Dashboard
            </TabsTrigger>
            
            {currentUser?.role === 'ADMIN' ? (
              <>
                <TabsTrigger value="users" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
                  👥 Anggota
                </TabsTrigger>
                <TabsTrigger value="savings" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
                  💰 Simpanan
                </TabsTrigger>
                <TabsTrigger value="loans" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
                  🏦 Pinjaman
                </TabsTrigger>
                <TabsTrigger value="voting" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
                  🗳️ Voting
                </TabsTrigger>
                <TabsTrigger value="reports" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
                  📈 Laporan
                </TabsTrigger>
              </>
            ) : (
              <>
                <TabsTrigger value="savings" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
                  💰 Simpanan Saya
                </TabsTrigger>
                <TabsTrigger value="loans" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
                  🏦 Pinjaman Saya
                </TabsTrigger>
                <TabsTrigger value="voting" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
                  🗳️ Voting
                </TabsTrigger>
                <TabsTrigger value="profile" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
                  👤 Profil
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {currentUser?.role === 'ADMIN' ? (
              <AdminDashboard />
            ) : (
              <MemberDashboard 
                user={currentUser}
                savings={userSavings}
                loans={userLoans}
                transactions={transactions}
              />
            )}
          </TabsContent>

          {currentUser?.role === 'ADMIN' && (
            <TabsContent value="users" className="space-y-6">
              <UserManagement users={users} onUserUpdate={loadData} />
            </TabsContent>
          )}

          <TabsContent value="savings" className="space-y-6">
            <SavingsManagement 
              currentUser={currentUser}
              savings={userSavings}
              onSavingsUpdate={loadData}
            />
          </TabsContent>

          <TabsContent value="loans" className="space-y-6">
            <LoanManagement 
              currentUser={currentUser}
              loans={userLoans}
              onLoanUpdate={loadData}
            />
          </TabsContent>

          <TabsContent value="voting" className="space-y-6">
            <VotingSystem currentUser={currentUser} />
          </TabsContent>

          {currentUser?.role === 'ADMIN' && (
            <TabsContent value="reports" className="space-y-6">
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-800">📈 Laporan Keuangan</CardTitle>
                  <CardDescription>
                    Laporan comprehensive koperasi
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">🚧 Fitur laporan sedang dalam pengembangan</p>
                    <p className="text-sm text-gray-400">
                      Akan tersedia: Neraca, Laba Rugi, Arus Kas, dan Laporan SHU
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {currentUser?.role === 'MEMBER' && (
            <TabsContent value="profile" className="space-y-6">
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-800">👤 Profil Anggota</CardTitle>
                  <CardDescription>
                    Informasi pribadi dan status keanggotaan
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Nama Lengkap</label>
                        <p className="text-lg font-semibold text-gray-900">{currentUser.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Nomor Anggota</label>
                        <p className="text-lg font-semibold text-red-600">{currentUser.member_number}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Email</label>
                        <p className="text-gray-900">{currentUser.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Telepon</label>
                        <p className="text-gray-900">{currentUser.phone}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Alamat</label>
                        <p className="text-gray-900">{currentUser.address}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">NIK</label>
                        <p className="text-gray-900">{currentUser.identity_number}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Status</label>
                        <Badge 
                          variant={currentUser.status === 'ACTIVE' ? 'default' : 'secondary'}
                          className={currentUser.status === 'ACTIVE' ? 'bg-green-600' : 'bg-yellow-600'}
                        >
                          {currentUser.status === 'ACTIVE' ? '✅ Aktif' : '⏳ Pending'}
                        </Badge>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Bergabung</label>
                        <p className="text-gray-900">{currentUser.date_joined.toLocaleDateString('id-ID')}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-red-200 mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              🇮🇩 Koperasi Merah Putih - Membangun Indonesia melalui Gotong Royong
            </p>
            <p className="text-xs text-gray-500">
              © 2024 Sistem Manajemen Koperasi Digital. Dibuat dengan ❤️ untuk Indonesia.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
