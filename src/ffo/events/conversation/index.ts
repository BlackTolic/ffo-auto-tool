// 442,148,912,511,"00f000-000000",1.0

import { Role } from '../rolyer';

export class Conversation {
  static readonly SIM = '1.0';
  static readonly OCR_COLOR = '00f000-111111';
  static readonly BOX = { x1: 442, y1: 148, x2: 912, y2: 511 };
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
    // if (pos) {
    //   this.role.click(this.dm.GetFindX(), this.dm.GetFindY());
    // }
  }
}
