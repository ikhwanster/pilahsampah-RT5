/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const getAuthHeader = () => {
  const userId = localStorage.getItem('rt005_user_id');
  const userEmail = localStorage.getItem('rt005_user_email') || '';
  return userId ? { 'x-citizen-id': userId, 'x-citizen-email': userEmail } : {};
};

export const api = {
  async get(url: string) {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    const text = await res.text();
    if (!res.ok) {
      let err: any = {};
      try {
        err = JSON.parse(text);
      } catch (e) {}
      throw new Error(err.error || `HTTP error! status: ${res.status}`);
    }
    try {
      return JSON.parse(text);
    } catch (parseErr) {
      console.error(`Failed to parse JSON response from GET ${url}. Raw response:`, text);
      throw new Error(`Server returned non-JSON response (possibly HTML or authentication/redirect page). Status: ${res.status}`);
    }
  },

  async post(url: string, data: any) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    const text = await res.text();
    if (!res.ok) {
      let err: any = {};
      try {
        err = JSON.parse(text);
      } catch (e) {}
      throw new Error(err.error || `HTTP error! status: ${res.status}`);
    }
    try {
      return JSON.parse(text);
    } catch (parseErr) {
      console.error(`Failed to parse JSON response from POST ${url}. Raw response:`, text);
      throw new Error(`Server returned non-JSON response (possibly HTML or authentication/redirect page). Status: ${res.status}`);
    }
  },

  async put(url: string, data?: any) {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    const text = await res.text();
    if (!res.ok) {
      let err: any = {};
      try {
        err = JSON.parse(text);
      } catch (e) {}
      throw new Error(err.error || `HTTP error! status: ${res.status}`);
    }
    try {
      return JSON.parse(text);
    } catch (parseErr) {
      console.error(`Failed to parse JSON response from PUT ${url}. Raw response:`, text);
      throw new Error(`Server returned non-JSON response (possibly HTML or authentication/redirect page). Status: ${res.status}`);
    }
  },
};
