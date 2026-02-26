import { BACK_CITY_PNG_PATH } from '../../../constant/config';
import { MAIN_CITY } from '../../constant/NPC_position';
import { VK_F } from '../../constant/virtual-key-code';
import { isArriveAimNear, parseRolePositionFromText } from '../../utils/common';
import { checkEquipCount, checkUnEquipEquip, isItemBoxOpen, switchItemBoxTabPos } from '../../utils/ocr-check/base';
import { Role } from '../rolyer';
import { AttackActions } from '../skills';

type Timer = NodeJS.Timeout | null;

export type ValidEquip = {
  type: string;
  level?: string;
  attrName?: string;
  attrValue?: string;
}[];

export class BaseAction {
  private bindPlugin: any = null;
  private role: Role | null = null;
  // 回城前角色坐标
  // private beforePos: { x: number; y: number } | null = null;

  constructor(role: Role) {
    this.role = role;
    this.bindPlugin = role.bindPlugin;
  }

  // 屏蔽所有玩家
  blockAllPlayers() {
    if (!this.role) {
      return;
    }
    new AttackActions(this.role).startKeyPress({ key: 'F11', interval: null });
    new AttackActions(this.role).startKeyPress({ key: 'F11', interval: null });
    new AttackActions(this.role).startKeyPress({ key: 'F11', interval: null });
  }

  // 关闭/打开物品栏
  toggleItemBox() {
    this.bindPlugin.keyPress(VK_F['alt']);
    this.bindPlugin.keyPress(VK_F['i']);
    this.bindPlugin.delay(500);
    console.log('关闭或者打开物品栏');
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
            ways === 'F9' && this.role ? new AttackActions(this.role).startKeyPress({ key: 'F9', interval: null }) : this.bindPlugin.leftClick();
          }
          // 这里必须要超过4S 否则无法读到地图坐标
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
          // this.blockAllPlayers();
          return;
        }
        if (MAIN_CITY.includes(this.role?.map ?? '')) {
          console.log('回城成功');
          res(true);
        } else {
          console.log('回城失败');
          res(false);
        }
        //   if (MAIN_CITY.includes(this.role?.map ?? '')) {
        //     console.log('回城成功');
        //   }
        // } else {
        //   console.log('回城失败');
        // }
      } else {
        this.bindPlugin.moveTo(items?.x, items?.y);
        this.bindPlugin.leftClick();
        this.bindPlugin.delay(500);
        console.log('回城卷轴路径', BACK_CITY_PNG_PATH);
        const imgPos = this.bindPlugin.findColorE(1190, 595, 1590, 826, 'b87848-111111|304c68-000000', 1.0, 0);
        const imgPos2 = parseRolePositionFromText(imgPos);
        if (imgPos2) {
          this.bindPlugin.moveTo(imgPos2.x, imgPos2.y);
          this.bindPlugin.leftDoubleClick();
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

  // 打开物品栏切换到/消耗/收集/装备页
  openItemBox(changeTo: '消耗' | '收集' | '装备') {
    // 识别当前打开的页面
    const box = isItemBoxOpen(this.role?.bindPlugin, this.role?.bindWindowSize || '1600*900');
    console.log('识别当前打开的页面', box);
    return new Promise((res, rej) => {
      if (box === changeTo) {
        res(true);
      }
      if (!box) {
        this.toggleItemBox();
        // 切换tab页
        const tabPos = switchItemBoxTabPos(this.role?.bindPlugin, this.role?.bindWindowSize || '1600*900', changeTo);
        if (tabPos) {
          this.bindPlugin.moveToClick(tabPos.x, tabPos.y);
        }
        res(true);
      }
      // 切换tab页
      const tabPos = switchItemBoxTabPos(this.role?.bindPlugin, this.role?.bindWindowSize || '1600*900', changeTo);
      if (tabPos) {
        this.bindPlugin.moveToClick(tabPos.x, tabPos.y);
      }
      res(true);
    });
  }

  // 打开宠物栏并且激活宠物
  openPetBoxAndActivePet() {
    return new Promise((res, rej) => {
      // 打开宠物栏
      this.bindPlugin.moveTo(64, 82);
      this.bindPlugin.delay(300);
      this.bindPlugin.leftClick();
      this.bindPlugin.delay(500);
      // 激活宠物
      this.bindPlugin.moveTo(627, 454);
      this.bindPlugin.leftDoubleClick();
      this.bindPlugin.delay(300);
      // 关闭宠物栏
      this.bindPlugin.moveTo(802, 84);
      this.bindPlugin.delay(300);
      this.bindPlugin.leftClick();
      this.bindPlugin.delay(300);
      res(true);
    });
  }

  // 按下第二栏技能栏技能
  pressSecondSkillBarSkill(pressKey: string) {
    return new Promise((res, rej) => {
      // 打开物品栏
      this.bindPlugin.keyPress(VK_F['tab']);
      this.bindPlugin.delay(300);
      this.bindPlugin.keyPress(VK_F[pressKey]);
      this.bindPlugin.delay(300);
      this.bindPlugin.keyPress(VK_F['tab']);
      res(true);
    });
  }
  // 关闭宠物栏

  // 激活宠物

  // 存放金币

  // 从仓库提取金币

  // 存放装备

  // 丢弃装备

  // 拾取有用装备
  pickUpUsefulEquip(validEquip: ValidEquip, way?: 'mail' | 'saveEquip') {
    // console.log('这个装备有用');
    // 获取所有装备坐标
    const pos = checkEquipCount(this.role?.bindPlugin, this.role?.bindWindowSize || '1600*900');
    console.log(pos, 'pos');
    if (!pos || pos.length === 0) {
      console.log('没有装备');
      return;
    }
    pos.forEach(item => {
      // new Promise((res, rej) => {
      // 通过阻塞进程实现
      this.bindPlugin.moveTo(item.x + 10, item.y - 5);
      this.bindPlugin.delay(1000);
      // 找到未装备
      const unEquipPos = checkUnEquipEquip(this.role?.bindPlugin, this.role?.bindWindowSize || '1600*900');
      console.log(unEquipPos, 'unEquipPos');
      if (!unEquipPos) {
        console.log('没有未装备的装备');
        return;
      }
      const isUseful = validEquip.some(equip => {
        // console.log(equip, 'equip');
        // 只设置了装备类型，其他条件没有设置的装备v，只要类型对了都要
        if (equip.type && !equip.attrName && unEquipPos.type) {
          return equip.type.includes(unEquipPos.type);
        }
        // 只设置了装备类型和属性，这两个对了才要
        if (equip.attrName && equip.type && unEquipPos.attrName && unEquipPos.type) {
          return equip.type.includes(unEquipPos.type) && equip.attrName.includes(unEquipPos.attrName);
        }
        // 只设置了装备类型和等级，这两个对了才要
        if (equip.level && equip.type && unEquipPos.level && unEquipPos.type) {
          return equip.type.includes(unEquipPos.type) && equip.level.includes(unEquipPos.level);
        }
      });
      if (way === 'saveEquip' && isUseful) {
        this.bindPlugin.leftDoubleClick();
      }
      if (!isUseful) {
        console.log('这个装备没用');
        this.bindPlugin.leftDownFromToMove({ x: item.x + 10, y: item.y - 5 }, { x: 800, y: 400 });
        this.bindPlugin.leftClick();
        // 取消
        // this.bindPlugin.moveToClick(894, 492);
        // 丢弃
        this.bindPlugin.moveToClick(713, 492);
        return;
      }
      console.log('这个装备有用');
    });
    // });
    // const { equip } = this.role?.menusPos ?? {};
    console.log('完成装备筛选');
  }
}

// 破月 鬼刃 邪剑 银剑 九幽 苍月
