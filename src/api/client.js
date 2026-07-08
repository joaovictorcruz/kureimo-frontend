const BASE_URL = import.meta.env.VITE_API_BASE_URL;
export const SIGNALR_URL = import.meta.env.VITE_SIGNALR_URL;

// Função injetada pelo AuthContext para fornecer o access token do Logto
let getAccessTokenFn = null;
export function setAccessTokenProvider(fn) {
  getAccessTokenFn = fn;
}

async function getAuthHeader() {
  if (!getAccessTokenFn) return {};
  try {
    const token = await getAccessTokenFn('https://kureimo-api.com');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

const request = async (method, path, body) => {
  const authHeader = await getAuthHeader();
  const headers = { 'Content-Type': 'application/json', ...authHeader };

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Sem conexão com o servidor. Verifique sua internet.');
  }

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));

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
  const authHeader = await getAuthHeader();

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: authHeader,
      body: formData,
    });
  } catch {
    throw new Error('Sem conexão com o servidor. Verifique sua internet.');
  }

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));

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

export const usersApi = {
  me:               ()          => request('GET',  '/users/me'),
  completeOnboarding: (dto)     => request('POST', '/users/me/complete-onboarding', dto),
  get:              (id)        => request('GET',  `/users/${id}`),
  getProfile: (id) => request('GET', `/users/${id}/profile`),
  update:           (id, dto)   => request('PUT',  `/users/${id}`, dto),
  updateProfilePic: (id, fd)    => requestFormData('PUT', `/users/${id}/profile-pic`, fd),
  delete:           (id)        => request('DELETE', `/users/${id}`),
  getReviews:         (id, page = 1, pageSize = 5) =>
    request('GET', `/users/${id}/reviews?page=${page}&pageSize=${pageSize}`),
  submitReview:       (id, dto)        => request('POST', `/users/${id}/reviews`, dto),
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
  claim:          (photocardId) => request('POST',   `/claims/${photocardId}`),
  unclaim:        (photocardId) => request('DELETE', `/claims/${photocardId}`),
  getByPhotocard: (photocardId) => request('GET',    `/claims/photocard/${photocardId}`),
};

export async function getTokenForSignalR() {
  return getAccessTokenFn ? await getAccessTokenFn('https://kureimo-api.com') : '';
}