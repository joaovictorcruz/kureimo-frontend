const ENV = import.meta.env.MODE;

const BASE_URL =
  ENV === 'production'
    ? 'https://api.kureimo.com'
    : 'https://localhost:7011';

export const SIGNALR_URL = `${BASE_URL}/hubs/set`;

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
    const message = data?.error || data?.detail || data?.title || data?.message || 'Erro inesperado.';
    const err = new Error(message);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
};

// Requisição multipart/form-data (sem Content-Type para o browser setar o boundary)
const requestFormData = async (method, path, formData) => {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: formData,
  });

  if (res.status === 204) return null;

  const data = await res.json();
  if (!res.ok) {
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
  create: (formData) => requestFormData('POST', '/sets', formData),
  update: (accessToken, dto) => request('PUT', `/sets/${accessToken}`, dto),
  updateImage: (accessToken, formData) => requestFormData('PUT', `/sets/${accessToken}/image`, formData),
  addPhotocard: (accessToken, dto) => request('POST', `/sets/${accessToken}/photocards`, dto),
  updatePhotocard: (accessToken, photocardId, dto) =>
    request('PUT', `/sets/${accessToken}/photocards/${photocardId}`, dto),
  deletePhotocard: (accessToken, photocardId) =>
    request('DELETE', `/sets/${accessToken}/photocards/${photocardId}`),
  reorderPhotocards: (accessToken, orderedIds) =>
    request('PUT', `/sets/${accessToken}/photocards/reorder`, { orderedIds }),
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
  updateProfilePic: (id, formData) => requestFormData('PUT', `/users/${id}/profile-pic`, formData),
  delete: (id) => request('DELETE', `/users/${id}`),
};