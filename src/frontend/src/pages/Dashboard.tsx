import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../context/auth';
import { api } from '../services/api';
import { Users, Bot, MessageSquare, Wifi, LogOut, Plus, QrCode } from 'lucide-react';

export function Dashboard() {
  const { user, token, logout } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [instances, setInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    if (!token) return;
    try {
      const [statsData, instancesData] = await Promise.all([
        api.getStats(token),
        api.getInstances(token)
      ]);
      setStats(statsData);
      setInstances(instancesData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (instanceName: string) => {
    if (!token) return;
    try {
      await fetch('http://localhost:3001/api/whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName, botId: '' })
      });
      alert('Conectando ao WhatsApp... Escaneie o QR Code quando aparecer.');
    } catch (error) {
      alert('Erro ao conectar');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-800">K-Bot SaaS</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">{user?.name}</span>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <LogOut size={18} />
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<Users size={24} />} label="Usuários" value={stats?.users || 0} color="blue" />
          <StatCard icon={<Bot size={24} />} label="Bots" value={stats?.bots || 0} color="purple" />
          <StatCard icon={<MessageSquare size={24} />} label="Clientes" value={stats?.clients || 0} color="green" />
          <StatCard icon={<Wifi size={24} />} label="Conectados" value={stats?.connectedInstances || 0} color="orange" />
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Instâncias WhatsApp</h3>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              <Plus size={18} />
              Nova Instância
            </button>
          </div>

          {instances.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <QrCode size={48} className="mx-auto mb-4 opacity-50" />
              <p>Nenhuma instância criada ainda</p>
              <p className="text-sm mt-2">Clique em "Nova Instância" para começar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-gray-600 font-medium">Nome</th>
                    <th className="text-left py-3 px-4 text-gray-600 font-medium">Telefone</th>
                    <th className="text-left py-3 px-4 text-gray-600 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-gray-600 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {instances.map((instance) => (
                    <tr key={instance.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{instance.instanceName}</td>
                      <td className="py-3 px-4">{instance.phoneNumber || '-'}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={instance.status} />
                      </td>
                      <td className="py-3 px-4">
                        {instance.status === 'disconnected' ? (
                          <button
                            onClick={() => handleConnect(instance.instanceName)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Conectar
                          </button>
                        ) : (
                          <button className="text-red-600 hover:text-red-800 font-medium">
                            Desconectar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className={`w-12 h-12 rounded-lg ${colors[color]} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-gray-500 text-sm">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    connected: 'bg-green-100 text-green-700',
    disconnected: 'bg-gray-100 text-gray-700',
    connecting: 'bg-yellow-100 text-yellow-700',
    failed: 'bg-red-100 text-red-700'
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status] || styles.disconnected}`}>
      {status === 'connected' ? 'Conectado' : 
       status === 'disconnected' ? 'Desconectado' :
       status === 'connecting' ? 'Conectando...' : 'Erro'}
    </span>
  );
}
