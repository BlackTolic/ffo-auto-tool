import logger from '../../../utils/logger';
import { checkMerchant } from '../../utils/ocr-check/base';
import { Role } from '../rolyer';
import { AutoFarmingAction } from './auto-farming';

const TASK_NAME = '查询捡漏';

export default class ShoppingTask {
  private taskName = TASK_NAME;
  private autoFarmingAction: AutoFarmingAction | null = null; // 自动寻路操作
  private role: Role;
  private lastCheckTargetTs = 0;

  constructor(role: Role) {
    this.role = role;
  }

  // 检测到目标商品
  checkTargetMerchantAndBuy = async () => {
    // 识别物品
    const isMerchantPos = await checkMerchant(this.role?.bindPlugin, this.role?.bindWindowSize || '1600*900', '愿望果实');
    console.log(isMerchantPos, 'isMerchantPos');
    if (!isMerchantPos) {
      logger.info('[点满商人技能] 没有愿望果实');
      return;
    }
    await this.role?.bindPlugin.move(isMerchantPos.x, isMerchantPos.y);
  };

  // 启动任务
  async startShoppingTask() {
    try {
      // 注册全局任务
      this.role.addGlobalStrategyTask([
        {
          name: '检测到目标商品，开始进行购买',
          condition: () => true,
          callback: async () => await this.checkTargetMerchantAndBuy(),
        },
      ]);
    } catch (e) {
      logger.error('启动任务分工失败', e);
    }
  }
}
