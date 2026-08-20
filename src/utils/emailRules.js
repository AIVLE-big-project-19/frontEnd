export const EMAIL_FORMAT_MESSAGE = '올바른 이메일 형식이 아닙니다.';

export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
