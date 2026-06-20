import apiClient from '../apiClient';
import type {
  LoginPayload,
  LoginResponse,
  RegisterPayload,
  RegisterResponse,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  VerifyOtpPayload,
  OtpVerifyResponse,
  RecoverUsernamePayload,
  RecoverEmailPayload,
} from '../../types/auth';

/** POST /auth/login — SRS §11.1 */
export const authLogin = async (payload: LoginPayload): Promise<LoginResponse> => {
  const res = await apiClient.post('/auth/login', payload);
  return res.data;
};

/** POST /auth/logout — SRS §11.1 */
export const authLogout = async (): Promise<void> => {
  await apiClient.post('/auth/logout', {});
};

/** POST /auth/register — SRS §11.1 */
export const authRegister = async (payload: RegisterPayload): Promise<RegisterResponse> => {
  const res = await apiClient.post('/auth/register', payload);
  return res.data;
};

/** POST /auth/verify-otp — SRS §11.1 */
export const authVerifyOtp = async (payload: VerifyOtpPayload): Promise<OtpVerifyResponse> => {
  const res = await apiClient.post('/auth/verify-otp', payload);
  return res.data;
};

/** POST /auth/forgot-password — SRS §11.1 */
export const authForgotPassword = async (payload: ForgotPasswordPayload): Promise<void> => {
  await apiClient.post('/auth/forgot-password', payload);
};

/** POST /auth/reset-password — SRS §11.1 */
export const authResetPassword = async (payload: ResetPasswordPayload): Promise<void> => {
  await apiClient.post('/auth/reset-password', payload);
};

/** POST /auth/recover-username — SRS §11.1 */
export const authRecoverUsername = async (payload: RecoverUsernamePayload): Promise<void> => {
  await apiClient.post('/auth/recover-username', payload);
};

/** POST /auth/recover-email — SRS §11.1 */
export const authRecoverEmail = async (payload: RecoverEmailPayload): Promise<void> => {
  await apiClient.post('/auth/recover-email', payload);
};

/** GET /users/me — bukan untuk username/email avail; namun mock punya fungsi cek availability */
export const checkUsernameAvailable = async (username: string): Promise<boolean> => {
  // Kontrak ketersediaan username/email real belum ada di SRS bagian 11.
  // Untuk menjaga signature, tetap panggil endpoint terdekat bila tersedia.
  // Jika backend belum punya, implementasi ini perlu disesuaikan.
  const res = await apiClient.get('/auth/check-username', { params: { username } });
  return res.data.available;
};

export const checkEmailAvailable = async (email: string): Promise<boolean> => {
  const res = await apiClient.get('/auth/check-email', { params: { email } });
  return res.data.available;
};

