export const PASSWORD_RULE_MESSAGE = '비밀번호는 영문, 숫자, 특수문자를 포함한 8~16자여야 합니다.';

export const isValidPassword = (password) => {
  const validLength = password.length >= 8 && password.length <= 16;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  return validLength && hasLetter && hasDigit && hasSpecial;
};
