import { isValidPassword, PASSWORD_RULE_MESSAGE } from './passwordRules';

test('8~16자, 영문/숫자/특수문자를 모두 포함하면 유효하다', () => {
  expect(isValidPassword('Password1!')).toBe(true);
});

test('길이가 8자 미만이면 무효하다', () => {
  expect(isValidPassword('Pass1!')).toBe(false);
});

test('길이가 16자 초과면 무효하다', () => {
  expect(isValidPassword('Password123456789!')).toBe(false);
});

test('특수문자가 없으면 무효하다', () => {
  expect(isValidPassword('Password123')).toBe(false);
});

test('숫자가 없으면 무효하다', () => {
  expect(isValidPassword('Password!!!')).toBe(false);
});

test('영문이 없으면 무효하다', () => {
  expect(isValidPassword('12345678!')).toBe(false);
});

test('메시지 상수가 올바르다', () => {
  expect(PASSWORD_RULE_MESSAGE).toBe('비밀번호는 영문, 숫자, 특수문자를 포함한 8~16자여야 합니다.');
});
