import { parseTextPos } from '../../utils/common';
import { Role } from '../rolyer';

const ENTER = '天|空|之|泉';

// 扫描屏幕中的位置范围以便查找杨戬
const SCAN_BOX = {
  '1600*900': { x1: 442, y1: 148, x2: 912, y2: 511, color: '00f000-111111', sim: 1.0 },
  '1280*800': { x1: 78, y1: 100, x2: 1208, y2: 713, color: '00f000-111111', sim: 1.0 },
};

// 对话框选项位置
const DIALOG_OPTIONS_POS = {
  '1600*900': { x1: 583, y1: 354, x2: 780, y2: 451, color: 'e8f0e8-111111', sim: 1.0 },
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
          this.dm.MoveTo(Number(dialogPosText.x), Number(dialogPosText.y));
          this.dm.delay(1000);
          this.dm.LeftClick();
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
}
