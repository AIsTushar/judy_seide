import { sendEmail } from './brevo.config';
import {
  VERIFICATION_EMAIL_TEMPLATE,
  PASSWORD_RESET_REQUEST_TEMPLATE,
  PASSWORD_RESET_SUCCESS_TEMPLATE,
  WELCOME_EMAIL_TEMPLATE,
  CONTACT_FORM_TEMPLATE,
} from './emailTemplates';

export const sendVerificationEmail = async (to: string, token: string) => {
  const template = VERIFICATION_EMAIL_TEMPLATE.replace(
    '{verificationCode}',
    token,
  );

  const response = await sendEmail(
    [{ email: to }],
    'Verify Your Account',
    template,
  );

  return response;
};

export const sendWelcomeEmail = async (to: string, name: string) => {
  const template = WELCOME_EMAIL_TEMPLATE.replace('{name}', name);
  const response = await sendEmail(
    [{ email: to }],
    'Welcome to Your App',
    template,
  );

  return response;
};

//forgot password

export const sendPasswordResetEmail = async (to: string, token: string) => {
  const template = PASSWORD_RESET_REQUEST_TEMPLATE.replace('{resetURL}', token);
  const response = await sendEmail(
    [{ email: to }],
    'Password Reset Request',
    template,
  );

  return response;
};

export const sendPasswordResetSuccessEmail = async (to: string) => {
  const template = PASSWORD_RESET_SUCCESS_TEMPLATE;

  const response = await sendEmail(
    [{ email: to }],
    'Password Reset Success',
    template,
  );

  return response;
};

export const sendFeedbackEmail = async (
  name: string,
  email: string,
  subject: string,
  message: string,
) => {
  const template = CONTACT_FORM_TEMPLATE.replace('{name}', name)
    .replace('{subject}', subject)
    .replace('{message}', message)
    .replace(/{email}/g, email);

  const response = await sendEmail(
    [{ email: 'azizultushar98@gmail.com' }],
    `New Contact Message: ${subject}`,
    template,
  );

  return response;
};
