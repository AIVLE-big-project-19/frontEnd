import chatBotInstance from './chatBotInstance';

export const sendChatMessage = async (message, reportContext) => {
  const payload = reportContext ? { message, report_context: reportContext } : { message };
  const { data } = await chatBotInstance.post('/chat', payload, { skipErrorModal: true });
  return data;
};

export const sendChatPdf = async (file, message) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('message', message);

  const { data } = await chatBotInstance.post('/chat/pdf', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    skipErrorModal: true,
  });
  return data;
};
