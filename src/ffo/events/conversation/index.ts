import { Role } from '../rolyer';

const ENTER = '我想进入天空之泉';

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
    const { x1, y1, x2, y2 } = Conversation.BOX;
    const pos = this.dm.FindStrEx(x1, y1, x2, y2, '杨戬', Conversation.OCR_COLOR, Conversation.SIM);
    console.log(pos, 'pos');
    if (pos) {
      const trsPos = pos.split(',');
      // Y轴下移100
      this.dm.MoveTo(Number(trsPos[1]), Number(trsPos[2]) + 80);
      this.dm.delay(500);
      this.dm.LeftClick();
      this.dm.delay(500);
      this.dm.MoveTo(Number(Conversation.DIALOG_BOX.x1), Number(Conversation.DIALOG_BOX.y1));
      this.dm.delay(500);
      this.dm.LeftClick();
    }
  }
}
