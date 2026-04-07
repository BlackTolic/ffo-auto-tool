import { logger } from '../../../utils/logger';
import { parseTextPos } from '../../utils/common';
import { Role } from '../rolyer';

const ENTER = '天|空|之|泉';

interface Pos {
  x: number;
  y: number;
}

export interface StoreManagerConfig {
  task?: 'deposit' | 'withdraw';
  money?: string;
  saveEquipCall?: () => void;
}

export interface ItemMerchantConfig {
  task: 'buy' | 'fix';
  item?: '长白参' | '(大)法力药水';
  count?: number;
}

// 检测关闭按钮
const CLOSE_FLG = {
  '1600*900': { x1: 298, y1: 96, x2: 1223, y2: 663, color: 'b89838-111111', sim: 1.0 },
  '1280*800': { x1: 212, y1: 113, x2: 1074, y2: 574, color: 'b89838-111111', sim: 1.0 },
};

// 扫描屏幕中的位置范围以便查找杨戬 = dm.Ocr(450,109,1390,722,"1a1b1d-111111",1.0)
const SCAN_BOX = {
  '1600*900': { x1: 144, y1: 2, x2: 1474, y2: 845, color: '00f000-111111', sim: 1.0 },
  '1280*800': { x1: 78, y1: 100, x2: 1208, y2: 713, color: '00f000-111111', sim: 1.0 },
};
// 对话框选项位置
const DIALOG_OPTIONS_POS = {
  '1600*900': { x1: 450, y1: 109, x2: 1390, y2: 722, color: 'e8f0e8-111111', sim: 1.0 },
  '1280*800': { x1: 420, y1: 350, x2: 680, y2: 449, color: 'e8f0e8-111111', sim: 1.0 },
};

// 商店对话框
const STORE_DIALOG_BOX = {
  '1600*900': { x1: 542, y1: 53, x2: 1149, y2: 506, color: 'e8f0e8-111111', sim: 1.0 },
  '1280*800': { x1: 420, y1: 350, x2: 680, y2: 449, color: 'e8f0e8-111111', sim: 1.0 },
};

const INPUT_COLOR = 'd8a848-111111|a87828-111111|985c20-111111|c87838-000000|c88838-000000';

// s = dm.Ocr(580, 352, 931, 449, '00f000-000000', 1.0);

export class Conversation {
  //这里有问题
  static readonly DIALOG_BOX = { x1: 661, y1: 416 };
  private bindPlugin: any = null;
  private role;

  constructor(role: Role) {
    this.bindPlugin = role.bindPlugin;
    this.role = role;
  }

  private async findNPC(npcName: string, delX: number = 0, delY: number = 80): Promise<Pos | false> {
    const key = this.role.bindWindowSize as keyof typeof SCAN_BOX;
    const scanBox = SCAN_BOX[key];
    // const dialog = DIALOG_OPTIONS_POS[key];
    let NPCPos = await this.bindPlugin.findStrEx(scanBox.x1, scanBox.y1, scanBox.x2, scanBox.y2, npcName, scanBox.color, scanBox.sim);
    if (!NPCPos) {
      logger.warn(`没有找到NPC${npcName}`);
      return false;
    } else {
      let trsPos = NPCPos.split(',');
      logger.info(`NPC位置: ${NPCPos}`);
      return { x: Number(trsPos[1]) + delX, y: Number(trsPos[2]) + delY };
    }
  }

  // 打开对话框进行选项选择
  private async openConversation(pos: Pos): Promise<boolean> {
    const key = this.role.bindWindowSize as keyof typeof CLOSE_FLG;
    const dialog = CLOSE_FLG[key];
    await this.bindPlugin.moveTo(Number(pos.x), Number(pos.y));
    await this.bindPlugin.delay(1000);
    await this.bindPlugin.leftClick();
    // 点击之后可能还有一段距离走到面前
    await this.bindPlugin.delay(3000);
    const dialogPos = await this.bindPlugin.findStrEx(dialog.x1, dialog.y1, dialog.x2, dialog.y2, '@X', dialog.color, dialog.sim);
    logger.info(dialogPos, '是否打开了对话框');
    return !!dialogPos;
  }

  // 移动到指定位置并点击
  private async moveToClick(pos: Pos) {
    await this.bindPlugin.moveTo(Number(pos.x), Number(pos.y));
    await this.bindPlugin.delay(500);
    await this.bindPlugin.leftClick();
    await this.bindPlugin.delay(500);
  }

  // 选择对话框选项
  private async selectOptions(option: string, delX: number = 0, delY: number = 0) {
    const key = this.role.bindWindowSize as keyof typeof DIALOG_OPTIONS_POS;
    const dialog = DIALOG_OPTIONS_POS[key];
    const optionsPos = await this.bindPlugin.findStrEx(dialog.x1, dialog.y1, dialog.x2, dialog.y2, option, dialog.color, dialog.sim);
    logger.info(optionsPos, '选项位置');
    if (!optionsPos) {
      logger.warn('没有找到选项');
      return false;
    }
    const optionsPosText = parseTextPos(optionsPos);
    logger.info(optionsPosText, '选项位置');
    await this.moveToClick({ x: Number(optionsPosText?.x || 0) + delX, y: Number(optionsPosText?.y || 0) + delY });
    return true;
  }

  // 查找是否存在选项
  private async findOptions(option: string, delX: number = 0, delY: number = 5): Promise<Pos | false> {
    const key = this.role.bindWindowSize as keyof typeof DIALOG_OPTIONS_POS;
    const dialog = DIALOG_OPTIONS_POS[key];
    const optionsPos = await this.bindPlugin.findStrEx(dialog.x1, dialog.y1, dialog.x2, dialog.y2, option, dialog.color, dialog.sim);
    logger.info(optionsPos, '选项位置');
    if (!optionsPos) {
      logger.warn('没有找到选项');
      return false;
    }
    const optionsPosText = parseTextPos(optionsPos);
    logger.info(optionsPosText, '选项位置');
    return { x: Number(optionsPosText?.x || 0), y: Number(optionsPosText?.y || 0) };
  }

  async closeDialog() {
    const key = this.role.bindWindowSize as keyof typeof CLOSE_FLG;
    const dialog = CLOSE_FLG[key];
    const dialogPos = await this.bindPlugin.findStrEx(dialog.x1, dialog.y1, dialog.x2, dialog.y2, '@X', dialog.color, dialog.sim);
    logger.info(dialogPos, '关闭标记');
    const optionsPosText = parseTextPos(dialogPos);
    logger.info(optionsPosText, 'optionsPosText');
    if (optionsPosText) {
      await this.moveToClick({ x: Number(optionsPosText?.x || 0), y: Number(optionsPosText?.y || 0) });
    }
    return !!dialogPos;
  }

  // 购买道具
  async dragScrollToBuy(items: ItemMerchantConfig[]) {
    const key = this.role.bindWindowSize as keyof typeof STORE_DIALOG_BOX;
    const dialog = STORE_DIALOG_BOX[key];
    // 拖动滚动条
    await this.bindPlugin.leftDownFromToMove({ x: 840, y: 138 }, { x: 840, y: 244 });
    for (const item of items) {
      logger.info(`[道具商人] 购买道具${item.item}${item.count}`);
      const dialogPos = await this.bindPlugin.findStrEx(dialog.x1, dialog.y1, dialog.x2, dialog.y2, item.item, dialog.color, dialog.sim);
      const optionsPosText = parseTextPos(dialogPos);
      const x1 = Number(optionsPosText?.x || 0);
      const y1 = Number(optionsPosText?.y || 0);
      await this.moveToClick({ x: x1 + 50, y: y1 });
      await this.moveToClick({ x: x1 + 400, y: y1 });
      // 输入数量
      await this.bindPlugin.sendString(this.role.hwnd || 0, item.count);
      // 执行交易
      const inputPos = await this.bindPlugin.findStrEx(dialog.x1, dialog.y1, dialog.x2, dialog.y2, '输入', INPUT_COLOR, dialog.sim);
      const inputPosText = parseTextPos(inputPos);
      if (inputPosText) {
        await this.moveToClick({ x: Number(inputPosText.x), y: Number(inputPosText.y) });
      }
      await this.bindPlugin.delay(1000);
    }
  }

  // 杨戬
  async YangJian() {
    const key = this.role.bindWindowSize as keyof typeof SCAN_BOX | keyof typeof DIALOG_OPTIONS_POS;
    const scanBox = SCAN_BOX[key];
    const dialog = DIALOG_OPTIONS_POS[key];
    await this.bindPlugin.leftClick();
    await this.bindPlugin.delay(3000);

    const findYJ = async () => {
      let YJClickPos = await this.bindPlugin.findStrEx(scanBox.x1, scanBox.y1, scanBox.x2, scanBox.y2, '杨戬', scanBox.color, scanBox.sim);
      let trsPos = YJClickPos.split(',');
      logger.info(YJClickPos, '识别到"杨戬"的点击位置');
      //  杨戬Y轴下移100
      if (YJClickPos) {
        await this.bindPlugin.moveTo(Number(trsPos[1]), Number(trsPos[2]) + 80);
      }
      await this.bindPlugin.delay(1000);
      await this.bindPlugin.leftClick();
      await this.bindPlugin.delay(2000);
      const dialogPos = await this.bindPlugin.findStrEx(dialog.x1, dialog.y1, dialog.x2, dialog.y2, ENTER, dialog.color, dialog.sim);
      return !!dialogPos;
    };

    const openDialog = async () => {
      const dialogPos = await this.bindPlugin.findStrEx(dialog.x1, dialog.y1, dialog.x2, dialog.y2, ENTER, dialog.color, dialog.sim);
      const dialogPosText = parseTextPos(dialogPos);
      logger.info(dialogPosText, '对话框位置');
      await this.bindPlugin.delay(1000);
      if (!dialogPosText) {
        logger.info('没有找到对话框');
        return false;
      }
      await this.moveToClick({ x: Number(dialogPosText.x), y: Number(dialogPosText.y) });
      return true;
    };

    let isFindYj = await findYJ();
    if (!isFindYj) {
      isFindYj = await findYJ();
    }
    logger.info(isFindYj, '是否找到杨戬');
    const isOpenDialog = await openDialog();
    logger.info(isOpenDialog, '是否打开对话框');
    if (isOpenDialog) {
      await this.bindPlugin.delay(3000);
      logger.info(this.role.map, 'map');
      if (this.role.map === '天空之泉') {
        logger.info('进入天空之泉');
        return true;
      }
    }
    return false;
  }

  // 荣光使者
  async RongGuang() {
    // 找到荣光使者并且打开对话框
    const findNpcAndOpenDialog = async () => {
      // 找到NPC并且成功开启对话框
      let npcPos = await this.findNPC('荣光使者', 10, 50);
      if (!npcPos) {
        npcPos = await this.findNPC('荣光使者', 10, 50);
      }
      if (!npcPos) {
        logger.info('没有找到荣光使者');
        return false;
      }
      const isOpenDialg = await this.openConversation(npcPos);
      logger.info(isOpenDialg, '是否打开了对话框');
      return isOpenDialg;
    };

    const isOpen = await findNpcAndOpenDialog();
    if (!isOpen) return false;

    // 检查当前是需要提交任务还是需要领取任务
    const isSubmitTask = await this.findOptions('击败了怨灵');
    logger.info(isSubmitTask, '是否需要提交任务');
    if (isSubmitTask) {
      // 选择选项提交任务
      await this.moveToClick(isSubmitTask);
      // 关闭对话框
      const isClose = await this.closeDialog();
      logger.info(isClose, '是否已经关闭');
      if (!isClose) {
        return false;
      }
      // 再次找到荣光使者并且打开对话框
      const isReopen = await findNpcAndOpenDialog();
      if (!isReopen) return false;
    }

    // 选择选项领取任务
    const isReceive = await this.findOptions('名誉任务');
    logger.info(isReceive, '是否具有领取名誉任务的选项');
    if (!isReceive) {
      // 关闭弹框
      await this.closeDialog();
      logger.info('角色已经接受了名誉任务');
      return true;
    } else {
      await this.moveToClick(isReceive);
      // 选择选项名誉任务
      const isSelectOk = await this.selectOptions('好的', 0, 5);
      return !!isSelectOk;
    }
  }

  // 斯芬尼克
  async Sphinx() {
    // 找到斯芬尼克并且打开对话框
    let npcPos = await this.findNPC('斯芬尼克', 10, 50);
    if (!npcPos) {
      npcPos = await this.findNPC('斯芬尼克', 10, 50);
    }
    if (!npcPos) {
      logger.info('没有找到斯芬尼克');
      return false;
    }
    const isOpenDialg = await this.openConversation(npcPos);
    logger.info(`是否打开了对话框: ${isOpenDialg ? '是' : '否'}`);
    if (!isOpenDialg) {
      return false;
    }
    // 进入副本
    const isPass = await this.findOptions('需要组队');
    logger.info(`是否具有进入神殿的选项: ${isPass ? '是' : '否'}`);
    if (!isPass) {
      // 关闭弹框
      await this.closeDialog();
      logger.info('没有领取任务无法进入');
      return false;
    } else {
      await this.moveToClick(isPass);
      await this.bindPlugin.delay(3000);
      logger.info(this.role.map, 'map');
      if (this.role.map === '失落神殿') {
        logger.info('进入失落神殿');
        return true;
      } else {
        logger.info('没有进入失落神殿');
        return false;
      }
    }
  }

  // 与云荒仓库管理员对话
  async YunHuangStoreManager(config?: StoreManagerConfig) {
    const { task = '', money = '', saveEquipCall } = config || {};
    let npcPos = await this.findNPC('仓库管理员', 30, 50);
    if (!npcPos) {
      await this.bindPlugin.delay(3000);
      npcPos = await this.findNPC('仓库管理员', 30, 50);
    }
    if (!npcPos) {
      await this.bindPlugin.delay(3000);
      logger.info('没有找到仓库管理员');
      return false;
    }
    const isOpenDialg = await this.openConversation(npcPos);
    logger.info(isOpenDialg, '是否打开了对话框');
    if (!isOpenDialg) {
      return false;
    }
    // 移开鼠标防止影响读取
    await this.bindPlugin.moveTo(0, 0);
    // 打开仓库
    const isPass = await this.findOptions('使用仓库');
    if (!isPass) {
      logger.info('没有找到使用仓库的选项');
      return false;
    }
    await this.moveToClick(isPass);
    await this.bindPlugin.delay(1000);

    if (task === 'deposit') {
      // 存款
      await this.moveToClick({ x: 1487, y: 285 });
      await this.bindPlugin.sendString(this.role.hwnd || 0, money?.toString() || '');
      await this.moveToClick({ x: 1515, y: 263 });
    } else if (task === 'withdraw') {
      // 取款
      await this.moveToClick({ x: 1510, y: 284 });
      await this.bindPlugin.sendString(this.role.hwnd || 0, money?.toString() || '');
      await this.moveToClick({ x: 1534, y: 260 });
    }
    // 存入装备
    if (typeof saveEquipCall === 'function') {
      saveEquipCall();
    }
    // 关闭仓库
    await this.moveToClick({ x: 1540, y: 39 });
    return true;
  }

  // 与道具商人对话
  async ItemMerchant(config: ItemMerchantConfig[]) {
    let npcPos = await this.findNPC('道具商人', 30, 50);
    if (!npcPos) {
      npcPos = await this.findNPC('道具商人', 30, 50);
    }
    if (!npcPos) {
      logger.info('没有找到道具商人');
      return false;
    }
    const isOpenDialg = await this.openConversation(npcPos);
    if (!isOpenDialg) {
      return false;
    }
    // 购买道具
    const isPass = await this.findOptions('购买道具');
    if (!isPass) {
      logger.info('没有找到购买道具的选项');
      return false;
    }
    await this.moveToClick(isPass);
    //  购买道具
    const buyItems = config.filter(item => item.task === 'buy');
    // 修理装备
    const fix = config.filter(item => item.task === 'fix');
    if (buyItems?.length) {
      await this.dragScrollToBuy(buyItems);
      // 确认购买交易
      await this.moveToClick({ x: 906, y: 467 });
    }

    if (fix?.length) {
      // 全部特殊修理
      await this.moveToClick({ x: 633, y: 465 });
      await this.bindPlugin.delay(500);
      // 确认修理
      await this.moveToClick({ x: 750, y: 538 });
    }
    await this.bindPlugin.delay(500);
    // 关闭
    await this.moveToClick({ x: 1117, y: 88 });
    await this.bindPlugin.delay(1000);
    return true;
  }
  // 购买道具
}
