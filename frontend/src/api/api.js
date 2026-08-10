import axios from 'axios';


// ============================================================
// API CONFIGURATION
// ============================================================

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:5000/api/v1';


// ============================================================
// MAIN API INSTANCE
// ============================================================

const api = axios.create({
  baseURL: API_BASE_URL,

  headers: {
    'Content-Type': 'application/json',
  },

  timeout: 120000,
});


// ============================================================
// REFRESH TOKEN API
// ============================================================

const refreshApi = axios.create({
  baseURL: API_BASE_URL,

  headers: {
    'Content-Type': 'application/json',
  },

  timeout: 30000,
});


// ============================================================
// TOKEN HELPERS
// ============================================================

const getAccessToken = () => {
  return localStorage.getItem(
    'orion_access_token'
  );
};


const getRefreshToken = () => {
  return localStorage.getItem(
    'orion_refresh_token'
  );
};


const clearTokens = () => {
  localStorage.removeItem(
    'orion_access_token'
  );

  localStorage.removeItem(
    'orion_refresh_token'
  );
};


// ============================================================
// REQUEST INTERCEPTOR
// ============================================================

api.interceptors.request.use(
  (config) => {

    const accessToken =
      getAccessToken();

    if (accessToken) {

      config.headers =
        config.headers || {};

      config.headers.Authorization =
        `Bearer ${accessToken}`;
    }

    return config;
  },

  (error) => {
    return Promise.reject(error);
  }
);


// ============================================================
// REFRESH STATE
// ============================================================

let refreshPromise = null;


// ============================================================
// REFRESH ACCESS TOKEN
// ============================================================

const refreshAccessToken = async () => {

  // Prevent multiple simultaneous refresh requests
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken =
    getRefreshToken();

  if (!refreshToken) {
    throw new Error(
      'No refresh token available.'
    );
  }

  refreshPromise = (async () => {

    try {

      console.log(
        'OrionAI: refreshing access token...'
      );

      /*
       * Flask-JWT-Extended expects the refresh
       * JWT in the Authorization header.
       */

      const response =
        await refreshApi.post(
          '/auth/refresh',
          {},
          {
            headers: {
              Authorization:
                `Bearer ${refreshToken}`,
            },
          }
        );

      const newAccessToken =
        response.data?.access_token;

      if (!newAccessToken) {
        throw new Error(
          'Refresh endpoint did not return an access token.'
        );
      }

      localStorage.setItem(
        'orion_access_token',
        newAccessToken
      );

      console.log(
        'OrionAI: access token refreshed successfully.'
      );

      return newAccessToken;

    } catch (error) {

      console.error(
        'OrionAI: token refresh failed:',
        error.response?.data ||
        error.message
      );

      clearTokens();

      window.dispatchEvent(
        new CustomEvent(
          'orion:unauthorized'
        )
      );

      throw error;

    } finally {

      refreshPromise = null;
    }

  })();

  return refreshPromise;
};


// ============================================================
// RESPONSE INTERCEPTOR
// ============================================================

api.interceptors.response.use(

  (response) => {
    return response;
  },

  async (error) => {

    const originalRequest =
      error.config;

    // --------------------------------------------------------
    // Network error
    // --------------------------------------------------------

    if (!error.response) {

      console.error(
        'OrionAI network error:',
        error.message
      );

      return Promise.reject(
        error
      );
    }

    const status =
      error.response.status;


    // --------------------------------------------------------
    // Only handle 401
    // --------------------------------------------------------

    if (status !== 401) {
      return Promise.reject(
        error
      );
    }


    // --------------------------------------------------------
    // Never refresh the refresh endpoint
    // --------------------------------------------------------

    if (
      originalRequest?.url?.includes(
        '/auth/refresh'
      )
    ) {

      clearTokens();

      return Promise.reject(
        error
      );
    }


    // --------------------------------------------------------
    // Prevent infinite retry
    // --------------------------------------------------------

    if (
      originalRequest?._retry
    ) {

      return Promise.reject(
        error
      );
    }

    originalRequest._retry =
      true;


    try {

      const newAccessToken =
        await refreshAccessToken();


      // ------------------------------------------------------
      // Update original request
      // ------------------------------------------------------

      originalRequest.headers =
        originalRequest.headers || {};

      originalRequest.headers.Authorization =
        `Bearer ${newAccessToken}`;


      // ------------------------------------------------------
      // Retry original request
      // ------------------------------------------------------

      console.log(
        'OrionAI: retrying request:',
        originalRequest.url
      );

      return api(
        originalRequest
      );

    } catch (refreshError) {

      console.error(
        'OrionAI: unable to refresh session:',
        refreshError
      );

      return Promise.reject(
        error
      );
    }
  }
);


// ============================================================
// EXPORT
// ============================================================

export default api;