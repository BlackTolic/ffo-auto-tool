import axios from 'axios';
import { logger } from '../utils/logger';
// const fs = require('fs');
const apiUrl = 'http://api.ttshitu.com/predict';

const ACCOUNT = 'BlackTolic';
const PASSWORD = 'Zk617938';
// const imageFile = 'captcha.gif'; //填写自己的文件路径
// let buff = fs.readFileSync(imageFile);
// let base64data = buff.toString('base64');

//一、图片文字类型(默认 3 数英混合)：
//1 : 纯数字
//1001：纯数字2
//2 : 纯英文
//1002：纯英文2
//3 : 数英混合
//1003：数英混合2
//4 : 闪动GIF
//7 : 无感学习(独家)
//11 : 计算题
//1005:  快速计算题
//16 : 汉字
//32 : 通用文字识别(证件、单据)
//66:  问答题
//49 :recaptcha图片识别
//二、图片旋转角度类型：
//29 :  旋转类型
//1029 :  背景匹配旋转类型 注意：中间小图传到image中，背景图传到imageback 中
//2029 :  背景匹配双旋转类型   注意：中间小图传到image中，背景图传到imageback 中
//三、图片坐标点选类型：
//19 :  1个坐标
//20 :  3个坐标
//21 :  3 ~ 5个坐标
//22 :  5 ~ 8个坐标
//27 :  1 ~ 4个坐标
//48 : 轨迹类型
//四、缺口识别
//18：缺口识别
//五、拼图识别
//53：拼图识别

export const getVerifyCodeByTuJian = async (url: string) => {
  try {
    const res = await axios.post(apiUrl, {
      username: ACCOUNT, //用户名
      password: PASSWORD, //密码
      typeid: '7',
      image: url,
    });
    let d = res.data;
    if (d.success) {
      let { id, result } = d.data;
      logger.info('图鉴识别：', result);
      // 返回字符串转成大写
      return result.toUpperCase();
    } else {
      logger.warn(d.message);
      return '';
    }
  } catch (err) {
    logger.error(err);
    return '';
  }
};
