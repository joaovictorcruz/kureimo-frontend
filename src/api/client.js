const BASE_URL = import.meta.env.VITE_API_BASE_URL;
export const SIGNALR_URL = import.meta.env.VITE_SIGNALR_URL;

// Rotas de autenticação não devem disparar session-invalid em 401
// (credenciais erradas não == sessão expirada)
const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'];

function dispatchSessionInvalid(reason) {
  window.dispatchEvent(
    new CustomEvent('kureimo:session-invalid', { detail: { reason } })
  );
}

const request = async (method, path, body) => {
  const headers = { 'Content-Type': 'application/json' };
  const isAuthPath = AUTH_PATHS.includes(path);

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    if (!isAuthPath) dispatchSessionInvalid('network');
    throw new Error('Sem conexão com o servidor. Verifique sua internet.');
  }

  if (res.status === 401) {
    if (!isAuthPath) {
      dispatchSessionInvalid('expired');
    }
    const errData = await res.json().catch(() => ({}));
    const message =
      errData?.error || errData?.detail || errData?.title || errData?.message || 'Credenciais inválidas.';
    const err = new Error(message);
    err.status = 401;
    err.body   = errData;
    throw err;
  }

  if (res.status === 204) return null;

  const data = await res.json();
  if (!res.ok) {
    const message =
      data?.error || data?.detail || data?.title || data?.message || 'Erro inesperado.';
    const err = new Error(message);
    err.status = res.status;
    err.body   = data;
    throw err;
  }
  return data;
};

const requestFormData = async (method, path, formData) => {
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      credentials: 'include',
      body: formData,
    });
  } catch {
    dispatchSessionInvalid('network');
    throw new Error('Sem conexão com o servidor. Verifique sua internet.');
  }

  if (res.status === 401) {
    dispatchSessionInvalid('expired');
    throw new Error('Sessão expirada.');
  }

  if (res.status === 204) return null;

  const data = await res.json();
  if (!res.ok) {
    const message =
      data?.error || data?.detail || data?.title || data?.message || 'Erro inesperado.';
    const err = new Error(message);
    err.status = res.status;
    err.body   = data;
    throw err;
  }
  return data;
};

export const authApi = {
  login:          (dto)             => request('POST', '/auth/login', dto),
  register:       (dto)             => request('POST', '/auth/register', dto),
  me:             ()                => request('GET',  '/auth/me'),
  logout:         ()                => request('POST', '/auth/logout'),
  forgotPassword: (email)           => request('POST', '/auth/forgot-password', { email }),
  resetPassword: (token, password) => request('POST', '/auth/reset-password', { token, password }),
  getSignalRToken: ()                => request('GET',  '/auth/signalr-token'),
};

export const setsApi = {
  getByToken:        (accessToken)             => request('GET',    `/sets/${accessToken}`),
  getMine:           (page = 1, pageSize = 10) => request('GET',    `/sets/mine?page=${page}&pageSize=${pageSize}`),
  create:            (formData)                => requestFormData('POST', '/sets', formData),
  update:            (accessToken, dto)        => request('PUT',    `/sets/${accessToken}`, dto),
  updateImage:       (accessToken, formData)   => requestFormData('PUT', `/sets/${accessToken}/image`, formData),
  addPhotocard:      (accessToken, dto)        => request('POST',   `/sets/${accessToken}/photocards`, dto),
  updatePhotocard:   (accessToken, pcId, dto)  => request('PUT',    `/sets/${accessToken}/photocards/${pcId}`, dto),
  deletePhotocard:   (accessToken, pcId)       => request('DELETE', `/sets/${accessToken}/photocards/${pcId}`),
  reorderPhotocards: (accessToken, orderedIds) => request('PUT',    `/sets/${accessToken}/photocards/reorder`, { orderedIds }),
  publish:           (accessToken)             => request('POST',   `/sets/${accessToken}/publish`),
  open:              (accessToken)             => request('POST',   `/sets/${accessToken}/open`),
  close:             (accessToken)             => request('POST',   `/sets/${accessToken}/close`),
  cancel:            (accessToken)             => request('DELETE', `/sets/${accessToken}/cancel`),
  deleteOne:         (accessToken)             => request('DELETE', `/sets/${accessToken}`),
  deleteHistory:     ()                        => request('DELETE', '/sets/history'),
};

export const claimsApi = {
  claim:          (photocardId) => request('POST', `/claims/${photocardId}`),
  getByPhotocard: (photocardId) => request('GET',  `/claims/photocard/${photocardId}`),
};

export const usersApi = {
  get: (id) =>
    id ? request('GET', `/users/${id}`) : request('GET', '/users/me'),

  update: (id, dto) =>
    id ? request('PUT', `/users/${id}`, dto) : request('PUT', '/users/me', dto),

  updatePassword: (id, dto) =>
    id
      ? request('PUT', `/users/${id}/password`, dto)
      : request('PUT', '/users/me/password', dto),

  updateProfilePic: (id, fd) =>
    id
      ? requestFormData('PUT', `/users/${id}/profile-pic`, fd)
      : requestFormData('PUT', '/users/me/profile-pic', fd),

  delete: (id) =>
    id ? request('DELETE', `/users/${id}`) : request('DELETE', '/users/me'),
};