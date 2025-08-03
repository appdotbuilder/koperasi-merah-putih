
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/utils/trpc';
import type { User, Voting, Vote, CreateVotingInput } from '../../../server/src/schema';

interface VotingSystemProps {
  currentUser: User | null;
}

interface VotingResult {
  voting_id: number;
  total_votes: number;
  results: Array<{
    option: string;
    votes: number;
    percentage: number;
  }>;
}

interface VotingWithResults extends Voting {
  votingResults?: VotingResult | null;
  userVote?: Vote | null;
}

export function VotingSystem({ currentUser }: VotingSystemProps) {
  const [votings, setVotings] = useState<VotingWithResults[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVote, setSelectedVote] = useState<{ [votingId: number]: string }>({});

  const [formData, setFormData] = useState<CreateVotingInput>({
    title: '',
    description: '',
    options: ['', ''],
    start_date: new Date(),
    end_date: new Date()
  });

  const loadVotings = useCallback(async () => {
    setIsLoading(true);
    try {
      const votingList = await trpc.getVotings.query();
      
      // Load results for each voting
      const votingsWithResults = await Promise.all(
        votingList.map(async (voting: Voting) => {
          try {
            const results = await trpc.getVotingResults.query({ votingId: voting.id });
            return {
              ...voting,
              votingResults: results,
              userVote: null // This would need to be implemented in the backend
            };
          } catch {
            return {
              ...voting,
              votingResults: null,
              userVote: null
            };
          }
        })
      );
      
      setVotings(() => votingsWithResults);
    } catch (error) {
      console.error('Failed to load votings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVotings();
  }, [loadVotings]);

  const handleCreateVoting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || currentUser.role !== 'ADMIN') return;

    setIsLoading(true);
    try {
      await trpc.createVoting.mutate({
        ...formData,
        createdBy: currentUser.id
      });
      
      setFormData({
        title: '',
        description: '',
        options: ['', ''],
        start_date: new Date(),
        end_date: new Date()
      });
      setIsCreateDialogOpen(false);
      loadVotings();
    } catch (error) {
      console.error('Failed to create voting:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCastVote = async (votingId: number) => {
    if (!currentUser || !selectedVote[votingId]) return;

    setIsLoading(true);
    try {
      await trpc.castVote.mutate({
        voting_id: votingId,
        user_id: currentUser.id,
        selected_option: selectedVote[votingId]
      });
      
      // Remove from selectedVote state
      setSelectedVote(prev => {
        const updated = { ...prev };
        delete updated[votingId];
        return updated;
      });
      
      loadVotings();
    } catch (error) {
      console.error('Failed to cast vote:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addOption = () => {
    setFormData((prev: CreateVotingInput) => ({
      ...prev,
      options: [...prev.options, '']
    }));
  };

  const removeOption = (index: number) => {
    if (formData.options.length > 2) {
      setFormData((prev: CreateVotingInput) => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index)
      }));
    }
  };

  const updateOption = (index: number, value: string) => {
    setFormData((prev: CreateVotingInput) => ({
      ...prev,
      options: prev.options.map((option, i) => i === index ? value : option)
    }));
  };

  const getVotingStatusLabel = (voting: VotingWithResults) => {
    const now = new Date();
    const startDate = new Date(voting.start_date);
    const endDate = new Date(voting.end_date);

    if (voting.status === 'CANCELLED') {
      return { label: '❌ Dibatalkan', color: 'bg-red-600' };
    }
    
    if (now < startDate) {
      return { label: '⏳ Belum Dimulai', color: 'bg-gray-600' };
    }
    
    if (now > endDate) {
      return { label: '✅ Selesai', color: 'bg-gray-600' };
    }
    
    return { label: '🗳️ Sedang Berlangsung', color: 'bg-green-600' };
  };

  const canVote = (voting: VotingWithResults) => {
    const now = new Date();
    const startDate = new Date(voting.start_date);
    const endDate = new Date(voting.end_date);
    
    return voting.status === 'ACTIVE' && 
           now >= startDate && 
           now <= endDate && 
           !voting.userVote;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-red-200">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-red-800 flex items-center gap-2">
                🗳️ Sistem Voting Digital
              </CardTitle>
              <CardDescription>
                Partisipasi demokratis dalam pengambilan keputusan koperasi
              </CardDescription>
            </div>
            {currentUser?.role === 'ADMIN' && (
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    ➕ Buat Voting Baru
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <form onSubmit={handleCreateVoting}>
                    <DialogHeader>
                      <DialogTitle className="text-purple-800">Buat Voting Baru</DialogTitle>
                      <DialogDescription>
                        Buat voting untuk keputusan penting koperasi
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[400px] overflow-y-auto">
                      <div className="grid gap-2">
                        <Label htmlFor="title">Judul Voting</Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData((prev: CreateVotingInput) => ({ ...prev, title: e.target.value }))
                          }
                          placeholder="Masukkan judul voting"
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="description">Deskripsi</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setFormData((prev: CreateVotingInput) => ({ ...prev, description: e.target.value }))
                          }
                          placeholder="Jelaskan detail voting..."
                          rows={3}
                          required
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label>Pilihan Voting</Label>
                        {formData.options.map((option, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={option}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                                updateOption(index, e.target.value)
                              }
                              placeholder={`Pilihan ${index + 1}`}
                              required
                            />
                            {formData.options.length > 2 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => removeOption(index)}
                                className="shrink-0"
                              >
                                ❌
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addOption}
                          className="w-full"
                        >
                          ➕ Tambah Pilihan
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="start_date">Tanggal Mulai</Label>
                          <Input
                            id="start_date"
                            type="datetime-local"
                            value={formData.start_date.toISOString().slice(0, 16)}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setFormData((prev: CreateVotingInput) => ({ 
                                ...prev, 
                                start_date: new Date(e.target.value) 
                              }))
                            }
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="end_date">Tanggal Selesai</Label>
                          <Input
                            id="end_date"
                            type="datetime-local"
                            value={formData.end_date.toISOString().slice(0, 16)}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setFormData((prev: CreateVotingInput) => ({ 
                                ...prev, 
                                end_date: new Date(e.target.value) 
                              }))
                            }
                            required
                          />
                        </div>
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
                        disabled={isLoading || formData.options.some(opt => !opt.trim())} 
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {isLoading ? 'Membuat...' : 'Buat Voting'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-white rounded-lg border border-purple-200">
              <div className="text-2xl font-bold text-purple-800">
                {votings.length}
              </div>
              <div className="text-sm text-purple-600">Total Voting</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-white rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-800">
                {votings.filter(v => {
                  const now = new Date();
                  return v.status === 'ACTIVE' && 
                         now >= new Date(v.start_date) && 
                         now <= new Date(v.end_date);
                }).length}
              </div>
              <div className="text-sm text-green-600">Sedang Berlangsung</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-white rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-800">
                {votings.filter(v => v.userVote).length}
              </div>
              <div className="text-sm text-blue-600">Sudah Saya Vote</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-red-50 to-white rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-800">
                {votings.reduce((sum, v) => sum + (v.votingResults?.total_votes || 0), 0)}
              </div>
              <div className="text-sm text-red-600">Total Suara</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voting List */}
      <div className="grid gap-6">
        {votings.length > 0 ? (
          votings
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .map((voting: VotingWithResults) => {
              const statusInfo = getVotingStatusLabel(voting);
              const canUserVote = canVote(voting);
              
              return (
                <Card key={voting.id} className="border-red-200 hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-xl text-gray-900 mb-2">
                          {voting.title}
                        </CardTitle>
                        <CardDescription className="text-gray-600 mb-3">
                          {voting.description}
                        </CardDescription>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>📅 Mulai: {formatDate(voting.start_date)}</span>
                          <span>🏁 Selesai: {formatDate(voting.end_date)}</span>
                        </div>
                      </div>
                      <Badge className={statusInfo.color}>
                        {statusInfo.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {canUserVote ? (
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-900">🗳️ Berikan Suara Anda:</h4>
                        <RadioGroup
                          value={selectedVote[voting.id] || ''}
                          onValueChange={(value: string) =>
                            setSelectedVote(prev => ({ ...prev, [voting.id]: value }))
                          }
                        >
                          {voting.options.map((option: string, index: number) => (
                            <div key={index} className="flex items-center space-x-2">
                              <RadioGroupItem 
                                value={option} 
                                id={`${voting.id}-${index}`}
                                className="border-red-300"
                              />
                              <Label 
                                htmlFor={`${voting.id}-${index}`}
                                className="text-gray-900 cursor-pointer flex-1 p-2 rounded hover:bg-gray-50"
                              >
                                {option}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                        <div className="flex justify-end">
                          <Button
                            onClick={() => handleCastVote(voting.id)}
                            disabled={isLoading || !selectedVote[voting.id]}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            {isLoading ? 'Mengirim...' : '🗳️ Kirim Suara'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-semibold text-gray-900">📊 Hasil Voting:</h4>
                          <span className="text-sm text-gray-600">
                            Total suara: {voting.votingResults?.total_votes || 0}
                          </span>
                        </div>
                        
                        {voting.userVote && (
                          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                            <p className="text-sm text-green-800">
                              ✅ Anda telah memilih: <strong>{voting.userVote.selected_option}</strong>
                            </p>
                          </div>
                        )}

                        <div className="space-y-3">
                          {voting.options.map((option: string, index: number) => {
                            const resultItem = voting.votingResults?.results?.find(r => r.option === option);
                            const voteCount = resultItem?.votes || 0;
                            const percentage = resultItem?.percentage || 0;
                            
                            return (
                              <div key={index} className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-900 font-medium">{option}</span>
                                  <div className="text-right">
                                    <span className="text-sm font-semibold text-gray-900">
                                      {voteCount} suara
                                    </span>
                                    <span className="text-xs text-gray-600 ml-2">
                                      ({percentage.toFixed(1)}%)
                                    </span>
                                  </div>
                                </div>
                                <Progress 
                                  value={percentage} 
                                  className="h-3"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
        ) : (
          <Card className="border-red-200">
            <CardContent className="text-center py-12">
              <div className="text-4xl mb-4">🗳️</div>
              <p className="text-gray-500 font-medium mb-2">Belum ada voting tersedia</p>
              <p className="text-gray-400 text-sm mb-4">
                {currentUser?.role === 'ADMIN' 
                  ? 'Buat voting pertama untuk keputusan koperasi'
                  : 'Voting akan muncul di sini ketika ada keputusan yang perlu diambil'
                }
              </p>
              {currentUser?.role === 'ADMIN' && (
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  ➕ Buat Voting Pertama
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {isLoading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          <p className="text-gray-500 mt-2">Memuat voting...</p>
        </div>
      )}

      {/* Information Panel */}
      <Card className="border-red-200 bg-gradient-to-r from-purple-50 to-white">
        <CardHeader>
          <CardTitle className="text-purple-800 flex items-center gap-2">
            💡 Informasi Voting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-purple-800 mb-2">🗳️ Hak dan Kewajiban</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Setiap anggota aktif berhak memberikan suara</li>
                <li>• Satu anggota satu suara untuk setiap voting</li>
                <li>• Suara bersifat rahasia dan tidak dapat diubah</li>
                <li>• Hasil voting mengikat untuk semua anggota</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-blue-800 mb-2">📋 Jenis Keputusan</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Perubahan Anggaran Dasar dan Anggaran Rumah Tangga</li>
                <li>• Pemilihan pengurus dan pengawas</li>
                <li>• Penetapan kebijakan simpan pinjam</li>
                <li>• Keputusan strategis lainnya</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
