import logger from '../../../utils/logger';
import { checkMerchantInfo, checkMerchantPos } from '../../utils/ocr-check/base';
import { Role } from '../rolyer';
import { AutoFarmingAction } from './auto-farming';

const TASK_NAME = '查询捡漏';
const CHECK_INTERVAL_MS = 1000;

const computed = (s: string) => {
  const re = /^(?<name>.+)(?<route>\d+)线(?<number>\d+)@金(?<gold>\d+)@银(?<silver>\d+)@铜(?<copper>\d+)$/;
  const m = s.match(re);
  if (!m?.groups) {
    logger.error(`格式不匹配：${s}`);
    return null;
  }
  const { name, route, number, gold, silver, copper } = m.groups;
  const totalCopper = Number(gold) * 1000000 + Number(silver) * 1000 + Number(copper);
  return {
    name,
    route: Number(route),
    number: Number(number),
    money: totalCopper / 1000000, // 金币
  };
};

export default class ShoppingTask {
  private taskName = TASK_NAME;
  private autoFarmingAction: AutoFarmingAction | null = null; // 自动寻路操作
  private role: Role;
  private lastCheckTargetTs = 0;
  private isCheckingTargetMerchant = false;

  constructor(role: Role) {
    this.role = role;
  }

  // 检测到目标商品
  checkTargetMerchantAndBuy = async (str?: string) => {
    // 点击购买
    const buy = async (pos: { x: number; y: number }) => {
      await this.role?.bindPlugin.moveToClick(pos.x + 159, pos.y + 17);
      await this.role?.bindPlugin.delay(200);
      await this.role?.bindPlugin.moveToClick(pos.x + 159, pos.y + 17 - 32);
      await this.role?.bindPlugin.delay(200);
      // 确认购买
      await this.role?.bindPlugin.moveToClick(711, 495);
    };
    // 识别物品
    const isMerchantPos = await checkMerchantPos(this.role?.bindPlugin, this.role?.bindWindowSize || '1600*900', '愿望果实');
    if (!isMerchantPos) {
      logger.info('[查询捡漏] 没有愿望果实');
      return;
    }

    for (const [index, pos] of isMerchantPos.entries()) {
      if (index !== 1) continue;
      await this.role?.bindPlugin.delay(300);
      const merchantInfo = await checkMerchantInfo(this.role?.bindPlugin, this.role?.bindWindowSize || '1600*900', { x: pos.x, y: pos.y });
      await this.role?.bindPlugin.delay(300);
      const item = computed(merchantInfo);
      if (!item) continue;
      logger.info(`[查询捡漏] 找到商品：${item.name}，路线：${item.route}，数量：${item.number}，价格：${item.money}`);
      if (item.route === 3) {
        await buy(pos);
      }

      // if (item.name === '愿望果实' &) {
      //   await this.role?.bindPlugin.click(pos.x, pos.y);
      // }
    }
  };

  // 启动任务
  async startShoppingTask() {
    try {
      // 注册全局任务
      this.role.addGlobalStrategyTask([
        {
          // name: '检测到目标商品，开始进行购买',
          condition: () => {
            if (this.isCheckingTargetMerchant) return false;
            return Date.now() - this.lastCheckTargetTs >= CHECK_INTERVAL_MS;
          },
          callback: async () => {
            this.lastCheckTargetTs = Date.now();
            this.isCheckingTargetMerchant = true;
            try {
              await this.checkTargetMerchantAndBuy();
            } finally {
              this.isCheckingTargetMerchant = false;
            }
          },
        },
      ]);
    } catch (e) {
      logger.error('启动任务分工失败', e);
    }
  }
}
