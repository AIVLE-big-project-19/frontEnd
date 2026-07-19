import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import SignupPage from './SignupPage';
import * as authApi from '../api/authApi';
import * as termsApi from '../api/termsApi';

vi.mock('../api/authApi');
vi.mock('../api/termsApi');

const renderSignup = () =>
  render(
    <MemoryRouter initialEntries={['/signup']}>
      <Routes>
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<div>로그인페이지</div>} />
      </Routes>
    </MemoryRouter>
  );

// 이메일 인증 + 아이디 중복확인까지 완료하는 헬퍼
const completeVerifications = async () => {
  authApi.sendEmailCode.mockResolvedValue({ success: true });
  authApi.verifyEmailCode.mockResolvedValue({ success: true });
  authApi.checkLoginId.mockResolvedValue({ success: true, data: { available: true } });

  await userEvent.type(screen.getByLabelText('이메일'), 'user@example.com');
  await userEvent.click(screen.getByRole('button', { name: '인증코드 발송' }));
  await userEvent.type(screen.getByLabelText('인증코드'), '123456');
  await userEvent.click(screen.getByRole('button', { name: '인증 확인' }));
  await waitFor(() => expect(screen.getByText('이메일 인증이 완료되었습니다.')).toBeInTheDocument());

  await userEvent.type(screen.getByLabelText('아이디'), 'tester01');
  await userEvent.click(screen.getByRole('button', { name: '중복확인' }));
  await waitFor(() => expect(screen.getByText('사용 가능한 아이디입니다.')).toBeInTheDocument());
};

const agreeToRequiredTerms = async () => {
  await userEvent.click(screen.getByLabelText('[필수] 이용약관 동의'));
  await userEvent.click(screen.getByLabelText('[필수] 개인정보 수집·이용 동의'));
};

beforeEach(() => {
  vi.clearAllMocks();
});

test('처음에는 가입하기 버튼이 비활성화되어 있다', () => {
  renderSignup();
  expect(screen.getByRole('button', { name: '가입하기' })).toBeDisabled();
});

test('이메일 인증과 아이디 중복확인, 필수 약관 동의 후 가입이 성공하면 로그인 페이지로 이동한다', async () => {
  authApi.signup.mockResolvedValue({ success: true });
  renderSignup();

  await completeVerifications();
  await agreeToRequiredTerms();
  await userEvent.type(screen.getByLabelText('비밀번호'), 'Password1!');
  await userEvent.type(screen.getByLabelText('비밀번호 확인'), 'Password1!');
  await userEvent.type(screen.getByLabelText('이름'), '홍길동');

  const submit = screen.getByRole('button', { name: '가입하기' });
  expect(submit).toBeEnabled();
  await userEvent.click(submit);

  await waitFor(() => expect(screen.getByText('로그인페이지')).toBeInTheDocument());
  expect(authApi.signup).toHaveBeenCalledWith({
    loginId: 'tester01', email: 'user@example.com', password: 'Password1!', name: '홍길동',
    termsAgreed: true, privacyAgreed: true, marketingAgreed: false,
  });
});

test('아이디가 중복이면 사용 불가 메시지를 보여준다', async () => {
  authApi.checkLoginId.mockResolvedValue({ success: true, data: { available: false } });
  renderSignup();

  await userEvent.type(screen.getByLabelText('아이디'), 'tester01');
  await userEvent.click(screen.getByRole('button', { name: '중복확인' }));

  await waitFor(() => expect(screen.getByText('이미 사용 중인 아이디입니다.')).toBeInTheDocument());
  expect(screen.getByRole('button', { name: '가입하기' })).toBeDisabled();
});

test('인증코드 발송 쿨다운(429) 시 서버 메시지를 보여준다', async () => {
  authApi.sendEmailCode.mockRejectedValue({
    response: { status: 429, data: { success: false, message: '잠시 후 다시 시도해주세요.' } },
  });
  renderSignup();

  await userEvent.type(screen.getByLabelText('이메일'), 'user@example.com');
  await userEvent.click(screen.getByRole('button', { name: '인증코드 발송' }));

  await waitFor(() => expect(screen.getByText('잠시 후 다시 시도해주세요.')).toBeInTheDocument());
});

test('인증코드가 틀리면 에러 메시지를 보여준다', async () => {
  authApi.sendEmailCode.mockResolvedValue({ success: true });
  authApi.verifyEmailCode.mockRejectedValue({
    response: { status: 400, data: { success: false, message: '인증번호가 일치하지 않거나 만료되었습니다.' } },
  });
  renderSignup();

  await userEvent.type(screen.getByLabelText('이메일'), 'user@example.com');
  await userEvent.click(screen.getByRole('button', { name: '인증코드 발송' }));
  await userEvent.type(screen.getByLabelText('인증코드'), '000000');
  await userEvent.click(screen.getByRole('button', { name: '인증 확인' }));

  await waitFor(() =>
    expect(screen.getByText('인증번호가 일치하지 않거나 만료되었습니다.')).toBeInTheDocument()
  );
});

test('비밀번호가 조건(8~16자/영문/숫자/특수문자)을 만족하지 않으면 검증 에러를 보여주고 API를 호출하지 않는다', async () => {
  authApi.signup.mockResolvedValue({ success: true });
  renderSignup();

  await completeVerifications();
  await agreeToRequiredTerms();
  await userEvent.type(screen.getByLabelText('비밀번호'), 'short');
  await userEvent.type(screen.getByLabelText('비밀번호 확인'), 'short');
  await userEvent.type(screen.getByLabelText('이름'), '홍길동');
  await userEvent.click(screen.getByRole('button', { name: '가입하기' }));

  await waitFor(() =>
    expect(screen.getByText('비밀번호는 영문, 숫자, 특수문자를 포함한 8~16자여야 합니다.')).toBeInTheDocument()
  );
  expect(authApi.signup).not.toHaveBeenCalled();
});

test('비밀번호 확인이 일치하지 않으면 에러를 보여준다', async () => {
  renderSignup();

  await completeVerifications();
  await agreeToRequiredTerms();
  await userEvent.type(screen.getByLabelText('비밀번호'), 'password123');
  await userEvent.type(screen.getByLabelText('비밀번호 확인'), 'password124');
  await userEvent.type(screen.getByLabelText('이름'), '홍길동');
  await userEvent.click(screen.getByRole('button', { name: '가입하기' }));

  await waitFor(() =>
    expect(screen.getByText('비밀번호가 일치하지 않습니다.')).toBeInTheDocument()
  );
  expect(authApi.signup).not.toHaveBeenCalled();
});

test('아이디 값을 바꾸면 중복확인 상태가 리셋된다', async () => {
  authApi.checkLoginId.mockResolvedValue({ success: true, data: { available: true } });
  renderSignup();

  await userEvent.type(screen.getByLabelText('아이디'), 'tester01');
  await userEvent.click(screen.getByRole('button', { name: '중복확인' }));
  await waitFor(() => expect(screen.getByText('사용 가능한 아이디입니다.')).toBeInTheDocument());

  await userEvent.type(screen.getByLabelText('아이디'), 'x');
  expect(screen.queryByText('사용 가능한 아이디입니다.')).not.toBeInTheDocument();
});

test('필수 약관에 동의하지 않으면 가입하기 버튼이 비활성화된다', async () => {
  renderSignup();

  await completeVerifications();
  await userEvent.type(screen.getByLabelText('비밀번호'), 'Password1!');
  await userEvent.type(screen.getByLabelText('비밀번호 확인'), 'Password1!');
  await userEvent.type(screen.getByLabelText('이름'), '홍길동');

  expect(screen.getByRole('button', { name: '가입하기' })).toBeDisabled();
});

test('전체 동의 체크박스를 누르면 필수+선택 항목이 모두 체크된다', async () => {
  renderSignup();

  await userEvent.click(screen.getByLabelText('전체 동의합니다'));

  expect(screen.getByLabelText('[필수] 이용약관 동의')).toBeChecked();
  expect(screen.getByLabelText('[필수] 개인정보 수집·이용 동의')).toBeChecked();
  expect(screen.getByLabelText('[선택] 마케팅 정보 수신 동의')).toBeChecked();
});

test('개별 항목을 모두 체크하면 전체 동의도 자동으로 체크된다', async () => {
  renderSignup();

  await userEvent.click(screen.getByLabelText('[필수] 이용약관 동의'));
  await userEvent.click(screen.getByLabelText('[필수] 개인정보 수집·이용 동의'));
  expect(screen.getByLabelText('전체 동의합니다')).not.toBeChecked();

  await userEvent.click(screen.getByLabelText('[선택] 마케팅 정보 수신 동의'));
  expect(screen.getByLabelText('전체 동의합니다')).toBeChecked();
});

test('전문 보기 클릭 시 약관 모달이 뜬다', async () => {
  termsApi.getTerms.mockResolvedValue({ type: 'TERMS', version: '1.0', content: '본문' });
  renderSignup();

  await userEvent.click(screen.getAllByRole('button', { name: '전문 보기' })[0]);

  await waitFor(() => expect(screen.getByText('본문')).toBeInTheDocument());
  expect(termsApi.getTerms).toHaveBeenCalledWith('TERMS');
});

test('가입 요청이 400으로 실패하면 응답의 필드별 약관 동의 메시지를 보여준다(방어적 처리)', async () => {
  authApi.signup.mockRejectedValue({
    response: {
      status: 400,
      data: { success: false, message: '요청이 올바르지 않습니다.', data: { termsAgreed: '필수 약관에 동의해야 합니다.' } },
    },
  });
  renderSignup();

  await completeVerifications();
  await agreeToRequiredTerms();
  await userEvent.type(screen.getByLabelText('비밀번호'), 'Password1!');
  await userEvent.type(screen.getByLabelText('비밀번호 확인'), 'Password1!');
  await userEvent.type(screen.getByLabelText('이름'), '홍길동');
  await userEvent.click(screen.getByRole('button', { name: '가입하기' }));

  await waitFor(() =>
    expect(screen.getByText('필수 약관에 동의해야 합니다.')).toBeInTheDocument()
  );
});
