// src/AI/request.ts
import axios from 'axios';

const KEY = 'sk-a383696181d247b38af3088bd628bde6';

// 中文注释：防抖缓存接口
interface DebounceCache {
  promise: Promise<string | null>; // 中文注释：上次请求的 Promise
  timestamp: number; // 中文注释：缓存时间戳（毫秒）
}
// 中文注释：url -> 防抖缓存
const debounceMap = new Map<string, DebounceCache>();
// 中文注释：防抖间隔：10 秒
const DEBOUNCE_MS = 10_000;

/**
 * 中文注释：带 10 秒防抖的验证码 AI 识别
 * 同一 url 在 10 秒内多次调用，直接返回上次的 Promise
 */
export function getVerifyCodeAiRes(url: string): Promise<string | null> {
  const now = Date.now();
  const cached = debounceMap.get(url);

  // 中文注释：缓存未过期，直接返回
  if (cached && now - cached.timestamp < DEBOUNCE_MS) {
    // console.log(`[防抖] 10 秒内重复调用，直接返回缓存 | url=${url}`);
    return cached.promise;
  }

  // 中文注释：真正发起请求
  const promise = (async (): Promise<string | null> => {
    try {
      const response = await axios.post(
        'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        {
          model: 'qwen3-vl-plus',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url } },
                {
                  type: 'text',
                  text: '帮我识别图中左边的字母，然后对比右边的三个选项，选一个与左边最相似的答案出来，选项用I、II、III表示。只输出最相似的那个选项',
                  // text: '帮我识别图中左边的3个字母，然后对比右边的三个选项，选一个左边最相似的出来，列出左边最确定能识别到的字母c,列出选项与左边字母的相似度a，输出最相似的选项，选项依次用I、II、III表示。最终的输出结果有两个，第一个是最相似的选项，第二个是各自的相似度。格式为：最相似的选项|(I,a;II,a;III,a;c)',
                  // text: '请不要依赖右侧‘正确答案是’的提示，仅根据左侧验证码图像的视觉特征，逐字分析每个字符，并从右侧三个选项中，为每个位置选出视觉上最相似的字母。最后输出一个由这些最相似字母组成的‘视觉匹配答案’，并标注每个字符的相似度。或者用OCR+人工校正的方式识别左边字符，再与右边选项做编辑距离或形状匹配',
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
      console.log('AI 识别结果', res);
      const x = res.split('|')[0];
      return x;
    } catch (error) {
      console.log('AI Request Failed:', error);
      return null;
    }
  })();

  // 中文注释：更新缓存
  debounceMap.set(url, { promise, timestamp: now });
  return promise;
}
