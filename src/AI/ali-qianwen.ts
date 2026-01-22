// src/AI/request.ts
import axios from 'axios';
const KEY = 'sk-a383696181d247b38af3088bd628bde6';
const URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
// const MODEL = 'qwen3-vl-plus';
const MODEL = '2-VL-72B';
export const getVerifyCodeByAliQW = async (url: string) => {
  try {
    const response = await axios.post(
      URL,
      {
        model: MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url } },
              {
                type: 'text',
                // text: '帮我识别图中左边的字母，然后对比右边的三个选项，选一个与左边最相似的答案出来，选项用I、II、III表示。只输出最相似的那个选项',
                // text: '帮我识别图中左边的3个字母，然后对比右边的三个选项，选一个左边最相似的出来，列出左边最确定能识别到的字母c,列出选项与左边字母的相似度a，输出最相似的选项，选项依次用I、II、III表示。最终的输出结果有两个，第一个是最相似的选项，第二个是各自的相似度。格式为：最相似的选项|(I,a;II,a;III,a;c)',
                // text: '请不要依赖右侧‘正确答案是’的提示，仅根据左侧验证码图像的视觉特征，逐字分析每个字符，并从右侧三个选项中，为每个位置选出视觉上最相似的字母。最后输出一个由这些最相似字母组成的‘视觉匹配答案’，并标注每个字符的相似度。或者用OCR+人工校正的方式识别左边字符，再与右边选项做编辑距离或形状匹配',
                text: '帮我识别图中的3组字母，返回格式: a,b,c',
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
    const res = response.data.choices[0].message.content;
    console.log(res, 'rs');
    return res;
  } catch (err) {
    console.warn('千问识别验证码失败:', String((err as any)?.message || err));
    return '';
  }
};
