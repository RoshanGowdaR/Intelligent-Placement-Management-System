export const APP_WEB_URL = typeof window !== "undefined" ? window.location.origin : "https://intelligent-placement.vercel.app";

export const getAuthRedirects = () => ({
  signupVerify: `${APP_WEB_URL}/login`,
  passwordRecovery: `${APP_WEB_URL}/reset-password`,
});

