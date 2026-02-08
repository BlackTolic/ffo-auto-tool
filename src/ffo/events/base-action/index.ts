import { BACK_CITY_PNG_PATH } from '../../../constant/config';
import { MAIN_CITY } from '../../constant/NPC_position';
import { isArriveAimNear, parseRolePositionFromText } from '../../utils/common';
import { Role } from '../rolyer';
import { AttackActions } from '../skills';

type Timer = NodeJS.Timeout | null;

export class BaseAction {
  private dm: any = null;
  private role: Role | null = null;
  // 回城前角色坐标
  // private beforePos: { x: number; y: number } | null = null;

  constructor(role: Role) {
    this.role = role;
    this.dm = role.bindDm;
  }

  // 屏蔽所有玩家
  blockAllPlayers() {
    this.role && new AttackActions(this.role).startKeyPress({ key: 'F11', interval: null });
  }

  // 回城
  backCity(fixPos?: { x: number; y: number }, ways?: 'F9') {
    return new Promise((res, rej) => {
      // 设置重复回城直到随机到达目标坐标
      const repeatBack = (fixPos: { x: number; y: number }) => {
        let timer: Timer = setInterval(() => {
          console.log('回城中', this.role?.position, fixPos);
          if (this.role?.position && isArriveAimNear(this.role?.position, fixPos, 20)) {
            console.log('回城成功');
            timer && clearInterval(timer);
            timer = null;
            res(true);
          } else {
            ways === 'F9' && this.role ? new AttackActions(this.role).startKeyPress({ key: 'F9', interval: null }) : this.dm.LeftClick();
          }
        }, 4000);
      };
      const { items } = this.role?.menusPos ?? {};
      // 回城前角色坐标
      // this.beforePos = JSON.parse(JSON.stringify(this.role?.position)) ?? null;
      if (ways === 'F9' && this.role) {
        new AttackActions(this.role).startKeyPress({ key: 'F9', interval: null });
        if (fixPos) {
          // 重复回城直到到达目标点
          repeatBack(fixPos);
          this.blockAllPlayers();
        }
        if (MAIN_CITY.includes(this.role?.map ?? '')) {
          console.log('回城成功');
        } else {
          console.log('回城失败');
        }
        //   if (MAIN_CITY.includes(this.role?.map ?? '')) {
        //     console.log('回城成功');
        //   }
        // } else {
        //   console.log('回城失败');
        // }
      } else {
        this.dm.moveTo(items?.x, items?.y);
        this.dm.LeftClick();
        this.dm.delay(500);
        console.log('回城卷轴路径', BACK_CITY_PNG_PATH);
        const imgPos = this.dm.FindColorE(1190, 595, 1590, 826, 'b87848-111111|304c68-000000', 1.0, 0);
        const imgPos2 = parseRolePositionFromText(imgPos);
        if (imgPos2) {
          this.dm.moveTo(imgPos2.x, imgPos2.y);
          this.dm.LeftDoubleClick();
          // 设置了固定回城点
          if (fixPos) {
            // 重复回城直到到达目标点
            repeatBack(fixPos);
            this.blockAllPlayers();
            return;
          }
          if (MAIN_CITY.includes(this.role?.map ?? '')) {
            console.log('回城成功');
          }
        } else {
          console.log('回城失败');
        }
      }
    });
  }
}

// 破月 鬼刃 邪剑 银剑 九幽 苍月
