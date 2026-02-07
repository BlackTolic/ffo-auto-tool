import { parseTextPos } from '../../utils/common';
import { Role } from '../rolyer';

const ENTER = '天|空|之|泉';

interface Pos {
  x: number;
  y: number;
}

// 检测关闭按钮
const CLOSE_FLG = {
  '1600*900': { x1: 298, y1: 96, x2: 1223, y2: 663, color: 'b89838-111111', sim: 1.0 },
  '1280*800': { x1: 298, y1: 96, x2: 1223, y2: 663, color: 'b89838-111111', sim: 1.0 },
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

// s = dm.Ocr(580, 352, 931, 449, '00f000-000000', 1.0);

export class Conversation {
  //这里有问题
  static readonly DIALOG_BOX = { x1: 661, y1: 416 };
  private dm: any = null;
  private role;

  constructor(role: Role) {
    this.dm = role.bindDm;
    this.role = role;
  }

  private async findNPC(npcName: string, delX: number = 0, delY: number = 80): Promise<Pos | false> {
    const key = this.role.bindWindowSize as keyof typeof SCAN_BOX;
    const scanBox = SCAN_BOX[key];
    // const dialog = DIALOG_OPTIONS_POS[key];
    return new Promise((res, rej) => {
      let YJClickPos = this.dm.FindStrEx(scanBox.x1, scanBox.y1, scanBox.x2, scanBox.y2, npcName, scanBox.color, scanBox.sim);
      let trsPos = YJClickPos.split(',');
      console.log(Number(trsPos[1] + delX), Number(trsPos[2]) + delY, `识别到"${npcName}"的点击位置`);
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
      this.dm.MoveTo(Number(pos.x), Number(pos.y));
      this.dm.delay(1000);
      this.dm.LeftClick();
      this.dm.delay(1000);
      const dialogPos = this.dm.FindStrEx(dialog.x1, dialog.y1, dialog.x2, dialog.y2, '@X', dialog.color, dialog.sim);
      console.log(dialogPos, '已经打开了对话框');
      // this.dm.delay(1000);
      if (!dialogPos) {
        console.log('没有打开对话框');
        res(false);
      }
      res(true);
    });
  }

  // 移动到指定位置并点击
  private moveToClick(pos: Pos) {
    this.dm.MoveTo(Number(pos.x), Number(pos.y));
    this.dm.delay(1000);
    this.dm.LeftClick();
    this.dm.delay(2000);
  }

  // 选择对话框选项
  private selectOptions(option: string, delX: number = 0, delY: number = 0) {
    const key = this.role.bindWindowSize as keyof typeof DIALOG_OPTIONS_POS;
    const dialog = DIALOG_OPTIONS_POS[key];
    return new Promise((res, rej) => {
      const optionsPos = this.dm.FindStrEx(dialog.x1, dialog.y1, dialog.x2, dialog.y2, option, dialog.color, dialog.sim);
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
      const optionsPos = this.dm.FindStrEx(dialog.x1, dialog.y1, dialog.x2, dialog.y2, option, dialog.color, dialog.sim);
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
      const dialogPos = this.dm.FindStrEx(dialog.x1, dialog.y1, dialog.x2, dialog.y2, '@X', dialog.color, dialog.sim);
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

  // 杨戬
  YangJian() {
    const key = this.role.bindWindowSize as keyof typeof SCAN_BOX | keyof typeof DIALOG_OPTIONS_POS;
    const scanBox = SCAN_BOX[key];
    const dialog = DIALOG_OPTIONS_POS[key];
    return new Promise((resolve, reject) => {
      this.dm.LeftClick();
      this.dm.delay(3000);
      // 扫描屏幕中的位置范围以便查找杨戬
      const findYJ = () =>
        new Promise((res, rej) => {
          let YJClickPos = this.dm.FindStrEx(scanBox.x1, scanBox.y1, scanBox.x2, scanBox.y2, '杨戬', scanBox.color, scanBox.sim);
          let trsPos = YJClickPos.split(',');
          console.log(YJClickPos, '识别到"杨戬"的点击位置');
          //  杨戬Y轴下移100
          YJClickPos && this.dm.MoveTo(Number(trsPos[1]), Number(trsPos[2]) + 80);
          this.dm.delay(1000);
          this.dm.LeftClick();
          setTimeout(() => {
            const dialogPos = this.dm.FindStrEx(dialog.x1, dialog.y1, dialog.x2, dialog.y2, ENTER, dialog.color, dialog.sim);
            if (dialogPos) {
              res(true);
            } else {
              res(false);
            }
          }, 2000);
        });

      const openDialog = () =>
        new Promise((res, rej) => {
          const dialogPos = this.dm.FindStrEx(dialog.x1, dialog.y1, dialog.x2, dialog.y2, ENTER, dialog.color, dialog.sim);
          const dialogPosText = parseTextPos(dialogPos);
          console.log(dialogPosText, '对话框位置');
          this.dm.delay(1000);
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
      // // 选择选项
      // const isSelect = await this.selectOptions('击败了怨灵', 0, 5);
      // console.log(isSelect, '选择“击败了怨灵”');
      // if (!isSelect) {
      //   return;
      // }
      // // 关闭对话框
      // const isClose = await this.closeDialog();
      // console.log(isClose, '是否已经关闭');
      // if (!isClose) {
      //   return;
      // }
      // // 再次识别荣光使者;
      // npcPos = await this.findNPC('荣光使者', 10, 50);
      // if (!npcPos) {
      //   console.log('没有找到荣光使者');
      //   return;
      // }
      // const isOpenDialg2 = await this.openConversation(npcPos);
      // console.log(isOpenDialg2, '是否再次打开了对话框');
      // if (!isOpenDialg2) {
      //   return;
      // }
      // // 选择选项名誉任务
      // const isSelectMingYu = await this.selectOptions('名誉任务', 0, 5);
      // console.log(isSelectMingYu, '选择“名誉任务”');
      // if (!isSelectMingYu) {
      //   return;
      // }
      // // 选择选项名誉任务
      // const isSelectOk = await this.selectOptions('好的', 0, 5);
      // console.log(isSelectOk, '选择“好的”');
      // if (!isSelectOk) {
      //   return;
      // }
      // 检测当前是否有药师角色
      // 通知药师角色已经接到名誉任务
    });

    const start = async () => {
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
        return;
      } else {
        this.moveToClick(isReceive);
        // 选择选项名誉任务
        const isSelectOk = await this.selectOptions('好的', 0, 5);
        console.log(isSelectOk, '选择“好的”');
        if (!isSelectOk) {
          return;
        }
      }
      // // 选择选项
      // const isSelect = await this.selectOptions('击败了怨灵', 0, 5);
      // console.log(isSelect, '选择“击败了怨灵”');
      // if (!isSelect) {
      //   return;
      // }
      // // 关闭对话框
      // const isClose = await this.closeDialog();
      // console.log(isClose, '是否已经关闭');
      // if (!isClose) {
      //   return;
      // }
      // // 再次识别荣光使者;
      // npcPos = await this.findNPC('荣光使者', 10, 50);
      // if (!npcPos) {
      //   console.log('没有找到荣光使者');
      //   return;
      // }
      // const isOpenDialg2 = await this.openConversation(npcPos);
      // console.log(isOpenDialg2, '是否再次打开了对话框');
      // if (!isOpenDialg2) {
      //   return;
      // }
      // // 选择选项名誉任务
      // const isSelectMingYu = await this.selectOptions('名誉任务', 0, 5);
      // console.log(isSelectMingYu, '选择“名誉任务”');
      // if (!isSelectMingYu) {
      //   return;
      // }
      // // 选择选项名誉任务
      // const isSelectOk = await this.selectOptions('好的', 0, 5);
      // console.log(isSelectOk, '选择“好的”');
      // if (!isSelectOk) {
      //   return;
      // }
      // 检测当前是否有药师角色
      // 通知药师角色已经接到名誉任务
    };

    start();
  }
}
