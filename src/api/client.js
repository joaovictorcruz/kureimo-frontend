const ENV = import.meta.env.MODE;

const BASE_URL =
  ENV === 'production'
    ? 'https://api.kureimo.com'
    : 'https://localhost:7011';

export const SIGNALR_URL = `${BASE_URL}/hubs/claims`;

const getToken = () => localStorage.getItem('kureimo_token');

const request = async (method, path, body) => {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const data = await res.json();
  if (!res.ok) {
    // Normaliza o campo de mensagem independente do formato da API
    const message = data?.error || data?.detail || data?.title || data?.message || 'Erro inesperado.';
    const err = new Error(message);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
};

// Auth
export const authApi = {
  register: (dto) => request('POST', '/auth/register', dto),
  login: (dto) => request('POST', '/auth/login', dto),
};

// Sets
export const setsApi = {
  getByToken: (accessToken) => request('GET', `/sets/${accessToken}`),
  getMine: (page = 1, pageSize = 10) => request('GET', `/sets/mine?page=${page}&pageSize=${pageSize}`),
  create: (dto) => request('POST', '/sets', dto),
  update: (accessToken, dto) => request('PUT', `/sets/${accessToken}`, dto),
  addPhotocard: (accessToken, dto) => request('POST', `/sets/${accessToken}/photocards`, dto),
  publish: (accessToken) => request('POST', `/sets/${accessToken}/publish`),
  open: (accessToken) => request('POST', `/sets/${accessToken}/open`),
  close: (accessToken) => request('POST', `/sets/${accessToken}/close`),
  cancel: (accessToken) => request('DELETE', `/sets/${accessToken}/cancel`),
  deleteOne: (accessToken) => request('DELETE', `/sets/${accessToken}`),
  deleteHistory: () => request('DELETE', '/sets/history'),
};

// Claims
export const claimsApi = {
  claim: (photocardId) => request('POST', `/claims/${photocardId}`),
  getByPhotocard: (photocardId) => request('GET', `/claims/photocard/${photocardId}`),
};

// Users
export const usersApi = {
  get: (id) => request('GET', `/users/${id}`),
  update: (id, dto) => request('PUT', `/users/${id}`, dto),
  updatePassword: (id, dto) => request('PUT', `/users/${id}/password`, dto),
  delete: (id) => request('DELETE', `/users/${id}`),
};