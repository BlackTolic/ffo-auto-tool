import axios from 'axios';

const KEY = 'sk-a383696181d247b38af3088bd628bde6';

export async function getVerifyCodeAiRes(url: string) {
  try {
    const response = await axios.post(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      {
        model: 'qwen-vl-max',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url } },
              {
                type: 'text',
                text: '帮我识别图中左边的验证码，根据左边识别的内容选择右边的选项，如果选择第一个选择输出“I”，如果选择第二个选择输出“II”，如果选择第三个选择输出“III”,只能输出I、II、III这3个字符中的一个',
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

    // console.log('AI 识别结果', response.data);
    const res = response.data.choices[0].message.content;
    return res;
  } catch (error) {
    // console.error('AI Request Failed:', error?.response ?? '66');
    console.log('AI Request Failed:', error);
    return null;
  }
}

// main();
