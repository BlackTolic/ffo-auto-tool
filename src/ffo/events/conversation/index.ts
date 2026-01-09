import { parseTextPos } from '../../utils/common';
import { Role } from '../rolyer';

const ENTER = '天|空|之|泉';

const DIALOG_OPTIONS_POS = {
  '1600*900': { x1: 583, y1: 354, x2: 780, y2: 451, color: 'e8f0e8-111111', sim: 1.0 },
  '1280*800': { x1: 583, y1: 354, x2: 780, y2: 451, color: 'e80000-111111', sim: 1.0 },
};

// s = dm.Ocr(580, 352, 931, 449, '00f000-000000', 1.0);

export class Conversation {
  static readonly SIM = '1.0';
  static readonly OCR_COLOR = '00f000-111111';
  //这里有问题
  static readonly BOX = { x1: 442, y1: 148, x2: 912, y2: 511 }; // 扫描位置
  // static readonly DIALOG_BOX = { x1: 579, y1: 354, x2: 808, y2: 448 }; // 杨戬对话框位置
  static readonly DIALOG_BOX = { x1: 661, y1: 416 };
  private dm: any = null;
  private role;

  constructor(role: Role) {
    this.dm = role.bindDm;
    this.role = role;
  }

  YangJian() {
    return new Promise((resolve, reject) => {
      const { x1, y1, x2, y2 } = Conversation.BOX;
      this.dm.LeftClick();
      this.dm.delay(1000);
      const pos = this.dm.FindStrEx(x1, y1, x2, y2, '杨戬', Conversation.OCR_COLOR, Conversation.SIM);
      // console.log(pos, 'pos');
      if (pos) {
        const trsPos = pos.split(',');
        const key = this.role.bindWindowSize as keyof typeof DIALOG_OPTIONS_POS;
        const { x1: dialogX1, y1: dialogY1, x2: dialogX2, y2: dialogY2, color: dialogColor, sim } = DIALOG_OPTIONS_POS[key];
        console.log(dialogX1, dialogY1, dialogX2, dialogY2, dialogColor, sim, 'dialogPos');
        // Y轴下移100
        this.dm.MoveTo(Number(trsPos[1]), Number(trsPos[2]) + 80);
        this.dm.delay(500);
        this.dm.LeftClick();
        this.dm.delay(1000);
        console.log(dialogX1, dialogY1, dialogX2, dialogY2, '32333333');
        let dialogPos = this.dm.FindStrEx(dialogX1, dialogY1, dialogX2, dialogY2, ENTER, dialogColor, sim);
        console.log(dialogPos, 'dialo3333gPos');
        const dialogPosObj = parseTextPos(dialogPos);
        console.log(dialogPosObj, 'dialogPosObj');
        if (!dialogPosObj) {
          console.log('没有找到对话框1');
          this.dm.MoveTo(Number(Conversation.DIALOG_BOX.x1), Number(Conversation.DIALOG_BOX.y1));
          this.dm.delay(1000);
          this.dm.LeftClick();
          this.dm.delay(1000);
          dialogPos = this.dm.FindStrEx(dialogX1, dialogY1, dialogX2, dialogY2, ENTER, dialogColor, sim);
        }
        if (!dialogPosObj) {
          console.log('没有找到对话框');
          reject(new Error('没有找到对话框'));
          return;
        }
        this.dm.MoveTo(Number(dialogPosObj.x), Number(dialogPosObj.y));
        console.log(dialogPosObj, 'dialogPosObj');
        this.dm.delay(500);
        this.dm.LeftClick();
        // this.dm.delay(5000);
        // 3S后读取地图
        setTimeout(() => {
          console.log(this.role.map, 'map');
          if (this.role.map === '天空之泉') {
            console.log('进入天空之泉');
            resolve(true);
          }
        }, 3000);
      }
    });
  }
}
