import type { AuthError } from '@supabase/supabase-js';

export function mapAuthError(error: AuthError | Error | { message?: string; status?: number; code?: string } | null | string): string {
  if (!error) return '';

  if (typeof error === 'string') {
    const lower = error.toLowerCase();
    if (lower.includes('rate limit') || lower.includes('too many requests')) {
      return 'Too many requests. Please wait and try again later.';
    }
    if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
      return 'Invalid email or password.';
    }
    if (lower.includes('email not confirmed')) {
      return 'Email not confirmed. Please check your inbox for the confirmation link before signing in.';
    }
    if (lower.includes('user already registered') || lower.includes('already exists')) {
      return 'An account with this email already exists. Please sign in instead.';
    }
    if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('unable to connect')) {
      return 'Unable to connect right now. Please try again.';
    }
    return error;
  }

  const errObj = error as Record<string, unknown>;
  const status = typeof errObj.status === 'number' ? errObj.status : undefined;
  const code = typeof errObj.code === 'string' ? errObj.code : '';
  const message = typeof error.message === 'string' ? error.message : '';
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes('phone') && (lowerMsg.includes('disabled') || lowerMsg.includes('not enabled'))) {
    return 'Mobile verification is not enabled. Please use email verification or contact support.';
  }
  if (lowerMsg.includes('sms') && (lowerMsg.includes('provider') || lowerMsg.includes('send') || lowerMsg.includes('delivery'))) {
    return 'Unable to send the verification code. Please try again later or use email verification.';
  }
  if (lowerMsg.includes('invalid phone') || lowerMsg.includes('phone number')) {
    return 'Enter a valid mobile number with its country code.';
  }
  if (lowerMsg.includes('expired') || lowerMsg.includes('invalid token') || lowerMsg.includes('otp')) {
    return 'That verification code is invalid or expired. Request a new code and try again.';
  }

  // Rate Limiting (429)
  if (
    status === 429 ||
    code === 'over_email_send_rate_limit' ||
    code === 'over_request_rate_limit' ||
    lowerMsg.includes('rate limit') ||
    lowerMsg.includes('too many requests')
  ) {
    return 'Too many requests. Please wait and try again later.';
  }

  // Invalid Credentials (400)
  if (
    status === 400 &&
    code === 'invalid_credentials' ||
    lowerMsg.includes('invalid login credentials') ||
    lowerMsg.includes('invalid credentials')
  ) {
    return 'Invalid email or password.';
  }

  // Email Not Confirmed
  if (code === 'email_not_confirmed' || lowerMsg.includes('email not confirmed')) {
    return 'Email not confirmed. Please check your inbox for the confirmation link before signing in.';
  }

  // User already exists during sign up
  if (code === 'user_already_exists' || lowerMsg.includes('user already registered') || lowerMsg.includes('already exists')) {
    return 'An account with this email already exists. Please sign in instead.';
  }

  // Network / Connection failures
  if (lowerMsg.includes('failed to fetch') || lowerMsg.includes('networkerror') || lowerMsg.includes('unable to connect')) {
    return 'Unable to connect right now. Please try again.';
  }

  // Default fallback
  return message || 'Something went wrong. Please try again.';
}
