const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = {
  async login(email: string, password: string) {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error('Login falhou');
    return res.json();
  },

  async register(data: { name: string; email: string; password: string }) {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Registro falhou');
    return res.json();
  },

  async getStats(token: string) {
    const res = await fetch(`${API_URL}/api/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.json();
  },

  async getClients(token: string) {
    const res = await fetch(`${API_URL}/api/clients`, {
      headers: { Authorization: `Bearer ${token}` }
    });
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
    return res.json();
  },

  async getBots(token: string) {
    const res = await fetch(`${API_URL}/api/bots`, {
      headers: { Authorization: `Bearer ${token}` }
    });
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
    return res.json();
  },

  async getInstances(token: string) {
    const res = await fetch(`${API_URL}/api/instances`, {
      headers: { Authorization: `Bearer ${token}` }
    });
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
    return res.json();
  }
};
