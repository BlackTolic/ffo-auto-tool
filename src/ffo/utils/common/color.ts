// 输入一个8位颜色均值格式"RRGGBB"，判断是否为绿色
export const isGreen = (rgb: string) => {
  const greenThreshold = 128; // 绿色的RGB值中，绿色通道的阈值
  const greenValue = parseInt(rgb.substring(4, 6), 16); // 提取绿色通道的值
  return greenValue >= greenThreshold;
};
