const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = {
  async login(email: string, password: string) {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Login falhou');
    }
    return res.json();
  },

  async loginWithGoogle(tokenId: string, userInfo: any) {
    const res = await fetch(`${API_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenId, ...userInfo })
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Login com Google falhou');
    }
    return res.json();
  },

  async register(data: { name: string; email: string; password: string }) {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Registro falhou');
    }
    return res.json();
  },

  async logout(token: string) {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  async getMe(token: string) {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Não autorizado');
    return res.json();
  },

  async getStats(token: string) {
    const res = await fetch(`${API_URL}/api/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Erro ao buscar estatísticas');
    return res.json();
  },

  async getClients(token: string) {
    const res = await fetch(`${API_URL}/api/clients`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Erro ao buscar clientes');
    return res.json();
  },

  async createClient(token: string, data: any) {
    const res = await fetch(`${API_URL}/api/clients`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Erro ao criar cliente');
    }
    return res.json();
  },

  async updateClient(token: string, id: string, data: any) {
    const res = await fetch(`${API_URL}/api/clients/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Erro ao atualizar cliente');
    }
    return res.json();
  },

  async deleteClient(token: string, id: string) {
    const res = await fetch(`${API_URL}/api/clients/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Erro ao remover cliente');
    }
    return res.json();
  },

  async getBots(token: string) {
    const res = await fetch(`${API_URL}/api/bots`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Erro ao buscar bots');
    return res.json();
  },

  async createBot(token: string, data: any) {
    const res = await fetch(`${API_URL}/api/bots`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Erro ao criar bot');
    }
    return res.json();
  },

  async updateBot(token: string, id: string, data: any) {
    const res = await fetch(`${API_URL}/api/bots/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Erro ao atualizar bot');
    }
    return res.json();
  },

  async deleteBot(token: string, id: string) {
    const res = await fetch(`${API_URL}/api/bots/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Erro ao remover bot');
    }
    return res.json();
  },

  async getInstances(token: string) {
    const res = await fetch(`${API_URL}/api/instances`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Erro ao buscar instâncias');
    return res.json();
  },

  async createInstance(token: string, data: any) {
    const res = await fetch(`${API_URL}/api/instances`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Erro ao criar instância');
    }
    return res.json();
  },

  async updateInstanceStatus(token: string, id: string, status: string, qrCode?: string) {
    const res = await fetch(`${API_URL}/api/instances/${id}/status`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ status, qrCode })
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Erro ao atualizar status');
    }
    return res.json();
  },

  async disconnectInstance(token: string, id: string) {
    const res = await fetch(`${API_URL}/api/instances/${id}/disconnect`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      }
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Erro ao desconectar');
    }
    return res.json();
  },

  async getApiKeys(token: string) {
    const res = await fetch(`${API_URL}/api/api-keys`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Erro ao buscar API Keys');
    return res.json();
  },

  async createApiKey(token: string, data: any) {
    const res = await fetch(`${API_URL}/api/api-keys`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Erro ao criar API Key');
    }
    return res.json();
  },

  async deleteApiKey(token: string, id: string) {
    const res = await fetch(`${API_URL}/api/api-keys/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Erro ao remover API Key');
    }
    return res.json();
  },

  async getResellers(token: string) {
    const res = await fetch(`${API_URL}/api/resellers`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Erro ao buscar revendedores');
    return res.json();
  },

  async createReseller(token: string, data: any) {
    const res = await fetch(`${API_URL}/api/resellers`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Erro ao criar revendedor');
    }
    return res.json();
  }
};
