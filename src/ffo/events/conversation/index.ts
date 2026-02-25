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
  '1600*900': { x1: 450, y1: 109, x2: 1390, y2: 722, color: '00f000-111111', sim: 1.0 },
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
    return new Promise((res, rej) => {
      let YJClickPos = this.bindPlugin.findStrEx(scanBox.x1, scanBox.y1, scanBox.x2, scanBox.y2, npcName, scanBox.color, scanBox.sim);
      let trsPos = YJClickPos.split(',');
      console.log(YJClickPos, 'YJClickPos');
      if (!YJClickPos) {
        res(false);
      } else {
        res({ x: Number(trsPos[1]) + delX, y: Number(trsPos[2]) + delY });
      }
    });
  }

  // 打开对话框进行选项选择
  private async openConversation(pos: Pos): Promise<boolean> {
    const key = this.role.bindWindowSize as keyof typeof CLOSE_FLG;
    const dialog = CLOSE_FLG[key];
    return new Promise((res, rej) => {
      this.bindPlugin.moveTo(Number(pos.x), Number(pos.y));
      this.bindPlugin.delay(1000);
      this.bindPlugin.leftClick();
      // 点击之后可能还有一段距离走到面前
      this.bindPlugin.delay(3000);
      const dialogPos = this.bindPlugin.findStrEx(dialog.x1, dialog.y1, dialog.x2, dialog.y2, '@X', dialog.color, dialog.sim);
      console.log(dialogPos, '是否打开了对话框');
      res(!!dialogPos);
    });
  }

  // 移动到指定位置并点击
  private moveToClick(pos: Pos) {
    this.bindPlugin.moveTo(Number(pos.x), Number(pos.y));
    this.bindPlugin.delay(500);
    this.bindPlugin.leftClick();
    this.bindPlugin.delay(500);
  }

  // 选择对话框选项
  private selectOptions(option: string, delX: number = 0, delY: number = 0) {
    const key = this.role.bindWindowSize as keyof typeof DIALOG_OPTIONS_POS;
    const dialog = DIALOG_OPTIONS_POS[key];
    return new Promise((res, rej) => {
      const optionsPos = this.bindPlugin.findStrEx(dialog.x1, dialog.y1, dialog.x2, dialog.y2, option, dialog.color, dialog.sim);
      console.log(optionsPos, '选项位置');
      if (!optionsPos) {
        console.log('没有找到选项');
        res(false);
        return;
      }
      const optionsPosText = parseTextPos(optionsPos);
      console.log(optionsPosText, '选项位置');
      this.moveToClick({ x: Number(optionsPosText?.x || 0) + delX, y: Number(optionsPosText?.y || 0) + delY });
      res(true);
    });
  }

  // 查找是否存在选项
  private findOptions(option: string, delX: number = 0, delY: number = 5): Promise<Pos | false> {
    const key = this.role.bindWindowSize as keyof typeof DIALOG_OPTIONS_POS;
    const dialog = DIALOG_OPTIONS_POS[key];
    return new Promise((res, rej) => {
      const optionsPos = this.bindPlugin.findStrEx(dialog.x1, dialog.y1, dialog.x2, dialog.y2, option, dialog.color, dialog.sim);
      console.log(optionsPos, '选项位置');
      if (!optionsPos) {
        console.log('没有找到选项');
        res(false);
        return;
      }
      const optionsPosText = parseTextPos(optionsPos);
      console.log(optionsPosText, '选项位置');
      res({ x: Number(optionsPosText?.x || 0), y: Number(optionsPosText?.y || 0) });
    });
  }

  closeDialog() {
    const key = this.role.bindWindowSize as keyof typeof CLOSE_FLG;
    const dialog = CLOSE_FLG[key];
    return new Promise((res, rej) => {
      const dialogPos = this.bindPlugin.findStrEx(dialog.x1, dialog.y1, dialog.x2, dialog.y2, '@X', dialog.color, dialog.sim);
      console.log(dialogPos, '关闭标记');
      const optionsPosText = parseTextPos(dialogPos);
      console.log(optionsPosText, 'optionsPosText');
      this.moveToClick({ x: Number(optionsPosText?.x || 0), y: Number(optionsPosText?.y || 0) });
      if (!dialogPos) {
        console.log('关闭标记');
        res(false);
      }
      res(true);
    });
  }

  // 购买道具
  dragScrollToBuy(items: ItemMerchantConfig[]) {
    const key = this.role.bindWindowSize as keyof typeof STORE_DIALOG_BOX;
    const dialog = STORE_DIALOG_BOX[key];
    // 拖动滚动条
    this.bindPlugin.leftDownFromToMove({ x: 840, y: 138 }, { x: 840, y: 244 });
    items.forEach(item => {
      const dialogPos = this.bindPlugin.findStrEx(dialog.x1, dialog.y1, dialog.x2, dialog.y2, item.item, dialog.color, dialog.sim);
      const optionsPosText = parseTextPos(dialogPos);
      console.log(optionsPosText, 'optionsPosText');
      const x1 = Number(optionsPosText?.x || 0);
      const y1 = Number(optionsPosText?.y || 0);
      this.moveToClick({ x: x1 + 50, y: y1 });
      this.moveToClick({ x: x1 + 400, y: y1 });
      this.bindPlugin.sendString(this.role.hwnd || 0, item.count);
      // 执行交易
      const inputPos = this.bindPlugin.findStrEx(dialog.x1, dialog.y1, dialog.x2, dialog.y2, '输入', INPUT_COLOR, dialog.sim);
      const inputPosText = parseTextPos(inputPos);
      inputPosText && this.moveToClick({ x: Number(inputPosText.x), y: Number(inputPosText.y) });
    });

    // return new Promise((res, rej) => {
    //   if (!inputPos) {
    //     console.log('关闭标记');
    //     res(false);
    //   }
    //   res(true);
    // });
  }

  // 杨戬
  YangJian() {
    const key = this.role.bindWindowSize as keyof typeof SCAN_BOX | keyof typeof DIALOG_OPTIONS_POS;
    const scanBox = SCAN_BOX[key];
    const dialog = DIALOG_OPTIONS_POS[key];
    return new Promise((resolve, reject) => {
      this.bindPlugin.leftClick();
      this.bindPlugin.delay(3000);
      // 扫描屏幕中的位置范围以便查找杨戬
      const findYJ = () =>
        new Promise((res, rej) => {
          let YJClickPos = this.bindPlugin.findStrEx(scanBox.x1, scanBox.y1, scanBox.x2, scanBox.y2, '杨戬', scanBox.color, scanBox.sim);
          let trsPos = YJClickPos.split(',');
          console.log(YJClickPos, '识别到"杨戬"的点击位置');
          //  杨戬Y轴下移100
          YJClickPos && this.bindPlugin.moveTo(Number(trsPos[1]), Number(trsPos[2]) + 80);
          this.bindPlugin.delay(1000);
          this.bindPlugin.leftClick();
          setTimeout(() => {
            const dialogPos = this.bindPlugin.findStrEx(dialog.x1, dialog.y1, dialog.x2, dialog.y2, ENTER, dialog.color, dialog.sim);
            if (dialogPos) {
              res(true);
            } else {
              res(false);
            }
          }, 2000);
        });

      const openDialog = () =>
        new Promise((res, rej) => {
          const dialogPos = this.bindPlugin.findStrEx(dialog.x1, dialog.y1, dialog.x2, dialog.y2, ENTER, dialog.color, dialog.sim);
          const dialogPosText = parseTextPos(dialogPos);
          console.log(dialogPosText, '对话框位置');
          this.bindPlugin.delay(1000);
          if (!dialogPosText) {
            console.log('没有找到对话框');
            res(false);
            return;
          }
          this.moveToClick({ x: Number(dialogPosText.x), y: Number(dialogPosText.y) });
          res(true);
        });

      const start = async () => {
        let isFindYj = await findYJ();
        if (!isFindYj) {
          isFindYj = await findYJ();
        }
        console.log(isFindYj, '是否找到杨戬');
        const isOpenDialog = await openDialog();
        console.log(isOpenDialog, '是否打开对话框');
        isOpenDialog &&
          setTimeout(() => {
            console.log(this.role.map, 'map');
            if (this.role.map === '天空之泉') {
              console.log('进入天空之泉');
              resolve(true);
            }
          }, 3000);
      };
      start();
    });
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
        console.log('没有找到荣光使者');
        return;
      }
      const isOpenDialg = await this.openConversation(npcPos);
      console.log(isOpenDialg, '是否打开了对话框');
      if (!isOpenDialg) {
        return;
      }
    };

    return new Promise(async (resolve, reject) => {
      await findNpcAndOpenDialog();
      // 检查当前是需要提交任务还是需要领取任务
      const isSubmitTask = await this.findOptions('击败了怨灵');
      console.log(isSubmitTask, '是否需要提交任务');
      if (isSubmitTask) {
        // 选择选项提交任务
        this.moveToClick(isSubmitTask);
        // 关闭对话框
        const isClose = await this.closeDialog();
        console.log(isClose, '是否已经关闭');
        if (!isClose) {
          return;
        }
        // 再次找到荣光使者并且打开对话框
        await findNpcAndOpenDialog();
      }

      // 选择选项领取任务
      const isReceive = await this.findOptions('名誉任务');
      console.log(isReceive, '是否具有领取名誉任务的选项');
      if (!isReceive) {
        // 关闭弹框
        await this.closeDialog();
        console.log('角色已经接受了名誉任务');
        resolve(true);
      } else {
        this.moveToClick(isReceive);
        // 选择选项名誉任务
        const isSelectOk = await this.selectOptions('好的', 0, 5);
        resolve(!!isSelectOk);
      }

      // 检测当前是否有药师角色
      // 通知药师角色已经接到名誉任务
    });
  }

  // 斯芬尼克
  async Sphinx() {
    return new Promise(async (resolve, reject) => {
      // 找到斯芬尼克并且打开对话框
      let npcPos = await this.findNPC('斯芬尼克', 10, 50);
      if (!npcPos) {
        npcPos = await this.findNPC('斯芬尼克', 10, 50);
      }
      if (!npcPos) {
        console.log('没有找到斯芬尼克');
        return;
      }
      const isOpenDialg = await this.openConversation(npcPos);
      console.log(isOpenDialg, '是否打开了对话框');
      if (!isOpenDialg) {
        return;
      }
      // 进入副本
      const isPass = await this.findOptions('需要组队');
      console.log(isPass, '是否具有进入神殿的选项');
      if (!isPass) {
        // 关闭弹框
        await this.closeDialog();
        console.log('没有领取任务无法进入');
        resolve(false);
      } else {
        this.moveToClick(isPass);
        setTimeout(() => {
          console.log(this.role.map, 'map');
          if (this.role.map === '失落神殿') {
            console.log('进入失落神殿');
            resolve(true);
          } else {
            console.log('没有进入失落神殿');
            resolve(false);
          }
        }, 3000);
      }
    });
  }

  // 与仓库管理员对话
  async StoreManager(config?: StoreManagerConfig) {
    return new Promise(async (resolve, reject) => {
      const { task = '', money = '', saveEquipCall } = config || {};
      let npcPos = await this.findNPC('仓库管理员', 30, 50);
      if (!npcPos) {
        npcPos = await this.findNPC('仓库管理员', 30, 50);
      }
      if (!npcPos) {
        console.log('没有找到仓库管理员');
        return;
      }
      const isOpenDialg = await this.openConversation(npcPos);
      console.log(isOpenDialg, '是否打开了对话框');
      if (!isOpenDialg) {
        return;
      }
      // 移开鼠标防止影响读取
      this.bindPlugin.moveTo(0, 0);
      // 打开仓库
      const isPass = await this.findOptions('使用仓库');
      if (!isPass) {
        console.log('没有找到使用仓库的选项');
        return;
      }
      this.moveToClick(isPass);
      setTimeout(() => {
        if (task === 'deposit') {
          // 存款
          this.moveToClick({ x: 1487, y: 285 });
          this.bindPlugin.sendString(this.role.hwnd || 0, money?.toString() || '');
          this.moveToClick({ x: 1515, y: 263 });
        } else if (task === 'withdraw') {
          // 取款
          this.moveToClick({ x: 1510, y: 284 });
          this.bindPlugin.sendString(this.role.hwnd || 0, money?.toString() || '');
          this.moveToClick({ x: 1534, y: 260 });
        }
        // 存入装备
        if (typeof saveEquipCall === 'function') {
          saveEquipCall();
        }
        // 关闭仓库
        this.moveToClick({ x: 1540, y: 39 });
        resolve(true);
      }, 1000);
    });
  }

  // 与道具商人对话
  async ItemMerchant(config: ItemMerchantConfig[]) {
    const key = this.role.bindWindowSize as keyof typeof STORE_DIALOG_BOX;
    const dialog = STORE_DIALOG_BOX[key];
    return new Promise(async (resolve, reject) => {
      let npcPos = await this.findNPC('道具商人', 30, 50);
      if (!npcPos) {
        npcPos = await this.findNPC('道具商人', 30, 50);
      }
      if (!npcPos) {
        console.log('没有找到道具商人');
        return;
      }
      const isOpenDialg = await this.openConversation(npcPos);
      console.log(isOpenDialg, '是否打开了对话框');
      if (!isOpenDialg) {
        return;
      }
      // 购买道具
      const isPass = await this.findOptions('购买道具');
      if (!isPass) {
        console.log('没有找到购买道具的选项');
        return;
      }
      this.moveToClick(isPass);
      //  购买道具
      const buyItems = config.filter(item => item.task === 'buy');
      console.log(buyItems, '购买道具');
      // 修理装备
      const fix = config.filter(item => item.task === 'fix');
      console.log(fix, '修理装备');
      if (buyItems?.length) {
        this.dragScrollToBuy(buyItems);
        // 确认购买交易
        this.moveToClick({ x: 906, y: 467 });
      }

      if (fix?.length) {
        // 全部特殊修理
        this.moveToClick({ x: 633, y: 465 });
        this.bindPlugin.delay(500);
        // 确认修理
        this.moveToClick({ x: 750, y: 538 });
      }
      this.bindPlugin.delay(500);
      // 关闭
      this.moveToClick({ x: 1117, y: 88 });
      setTimeout(() => {
        resolve(true);
      }, 1000);
    });
  }
  // 购买道具
}
