import axios from 'axios';

const URL = 'https://ark.cn-beijing.volces.com/api/v3/responses';
const KEY = 'c3b75580-8bcd-42a4-993c-e9ccf8dd5c99';

export const getVerifyCodeByDouBao = async (url: string) => {
  try {
    const response = await axios.post(
      URL,
      {
        model: 'doubao-seed-1-8-251228',
        max_tokens: 100, // 仅要答案时设极小值，减少模型生成冗余内容的耗时
        temperature: 0.1, // 极低随机性，确保模型严格遵循指令，只输出答案
        stream: false, // 非流式返回（直接要完整答案时更适用）
        top_p: 0.1, // 进一步限制模型采样范围，聚焦核心答案
        presence_penalty: 0,
        frequency_penalty: 0,
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_image', image_url: url },
              {
                type: 'input_text',
                text: '帮我识别图中的3组字母，只返回最终结果，返回格式: a,b,c',
              },
            ],
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${KEY}`,
        },
      }
    );
    console.log(JSON.stringify(response?.data?.output), 'response');
    return response?.data?.output;
  } catch (err) {
    console.log('豆包识别验证码失败', err);
    return '';
  }
};
