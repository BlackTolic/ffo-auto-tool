import { logger } from '../../../utils/logger';
import { block } from '../../../utils/tool';
import { MAIN_CITY } from '../../constant/NPC_position';
import { VK_F } from '../../constant/virtual-key-code';
import { isArriveAimNear, parseRolePositionFromText } from '../../utils/common';
import { checkEquipCount, checkPasswordLockPassword, checkPetActive, checkPetInfo, checkSystemPrompt, checkUnEquipEquip, isItemBoxOpen, switchItemBoxTabPos } from '../../utils/ocr-check/base';
import { AttackActions } from '../attack-action';
import { Role } from '../rolyer';

export type ValidEquip = {
  type: string;
  level?: string;
  attrName?: string;
  attrValue?: string;
}[];

export class BaseAction {
  private bindPlugin: any = null;
  private role: Role | null = null;
  private passwordItem: string[] = [];
  // 回城前角色坐标
  // private beforePos: { x: number; y: number } | null = null;

  constructor(role: Role) {
    this.role = role;
    this.bindPlugin = role.bindPlugin;
  }

  // 挂机前置操作
  preMount() {
    // 将地图切换为小地图
    this.bindPlugin.moveToClick(1589, 96);
    this.bindPlugin.delay(500);
  }

  // 屏蔽所有玩家
  async blockAllPlayers() {
    if (!this.role) {
      return;
    }
    await new AttackActions(this.role).startKeyPress({ key: 'F11', interval: null });
    await new AttackActions(this.role).startKeyPress({ key: 'F11', interval: null });
    await new AttackActions(this.role).startKeyPress({ key: 'F11', interval: null });
  }

  // 关闭/打开物品栏
  operateItemBox(type: 'close' | 'open') {
    // 检查物品栏是否打开
    const closePos = isItemBoxOpen(this.role?.bindPlugin, this.role?.bindWindowSize || '1600*900');
    if ((type === 'close' && closePos) || (type === 'open' && !closePos)) {
      this.bindPlugin.keyPress(VK_F['alt']);
      this.bindPlugin.keyPress(VK_F['i']);
      this.bindPlugin.delay(500);
      logger.info(`[基本操作] 当前需要${type}物品栏`);
      return;
    }
    logger.info(`[基本操作] 当前已经${type}物品栏，不需要再次${type}物品栏`);
  }

  // 回城
  backCity(fixPos?: { x: number; y: number }, ways?: 'F9', checkRedName = false) {
    return new Promise((res, rej) => {
      // 设置重复回城直到随机到达目标坐标
      const repeatBack = (fixPos: { x: number; y: number }, maxTimes: number = 20) => {
        let i = 0;
        const loop = () => {
          // 回到了终点
          if (this.role?.position && isArriveAimNear(this.role?.position, fixPos, 20)) {
            logger.info('[回城] 回城成功');
            this.role?.clearActionTimer('repeatBack');
            res(true);
            return;
          }

          if (checkRedName) {
            const systemPrompt = checkSystemPrompt(this.bindPlugin, this.role?.bindWindowSize ?? '1600*900', '红名玩家不允许使用回城卷轴');
            if (systemPrompt) {
              logger.warn(`[回城] 检测到红名提示，中断回城操作`);
              this.role?.clearActionTimer('repeatBack');
              res('redName');
              return;
            }
          }

          // 超过最大次数
          if (i >= maxTimes) {
            logger.error('[回城] 回城失败');
            this.role?.clearActionTimer('repeatBack');
            rej(false);
            return;
          }

          // 未到达，执行回城动作
          ways === 'F9' && this.role ? new AttackActions(this.role).startKeyPress({ key: 'F9', interval: null }) : this.bindPlugin.leftClick();

          i++;
          // 这里必须要超过4S 否则无法读到地图坐标
          const timer = setTimeout(loop, 4000);
          this.role?.addActionTimer('repeatBack', timer as any);
        };
        // 立即触发首次执行
        setImmediate(loop);
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
          logger.info('[回城] 回城成功');
          res(true);
        } else {
          logger.info('[回城] 回城失败');
          res(false);
        }
      } else {
        this.bindPlugin.moveTo(items?.x, items?.y);
        this.bindPlugin.leftClick();
        this.bindPlugin.delay(500);
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
            logger.info('[回城] 回城成功');
          }
        } else {
          logger.info('[回城] 回城失败');
        }
      }
    });
  }

  // 打开物品栏切换到/消耗/收集/装备页
  openItemBox(changeTo: '消耗' | '收集' | '装备') {
    // 识别当前打开的页面
    const closePos = isItemBoxOpen(this.role?.bindPlugin, this.role?.bindWindowSize || '1600*900');
    return new Promise((res, rej) => {
      if (!closePos) {
        this.operateItemBox('open');
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
  async openPetBoxAndActivePet() {
    return new Promise(async (res, rej) => {
      // 检查宠物是否激活
      const isPetActive = await checkPetActive(this.bindPlugin, this.role?.bindWindowSize || '1600*900');
      if (isPetActive) {
        logger.info('[宠物] 已经是激活状态');
        res(true);
        return;
      }
      await block(1000);
      // 打开宠物栏
      await this.bindPlugin.moveToClick(64, 82);
      console.log('点击了64，82坐标');
      await block(1000);

      // 激活宠物
      await this.bindPlugin.moveToDoubleClick(627, 454);
      console.log('点击了627，454坐标');
      await block(1000);
      // 关闭宠物栏
      await this.bindPlugin.moveToClick(802, 84);
      console.log('点击了802，84坐标');
      await block(1000);
      res(true);
    });
  }

  // 打开宠物栏并且喂宠物
  openPetBoxAndFeed(key1: string = 'F7', key2: string = 'F8', key3: string = 'F9') {
    return new Promise(async (res, rej) => {
      // 打开宠物栏
      await this.bindPlugin.moveTo(64, 82);
      await this.bindPlugin.delay(500);
      await this.bindPlugin.leftClick();
      await this.bindPlugin.delay(500);
      // 检查饥渴度
      const petInfoText = await checkPetInfo(this.bindPlugin, this.role?.bindWindowSize || '1600*900');
      logger.info(`[宠物] 饥渴度: ${petInfoText?.thirst ?? -1}`);
      const thirst = petInfoText?.thirst ?? -1;
      if (thirst >= 75) {
        // 大于75 使用第二列F7
        await this.pressSecondSkillBarSkill(key1, Math.ceil((thirst - 75) / 3));
        // 大于50 使用第二列F8
        await this.pressSecondSkillBarSkill(key2, Math.ceil((thirst - 50) / 3));
        // 大于0 使用第二列F9
        await this.pressSecondSkillBarSkill(key3, Math.ceil(thirst / 3));
      }
      if (thirst >= 50) {
        // 大于50 使用第二列F8
        await this.pressSecondSkillBarSkill(key2, Math.ceil((thirst - 50) / 3));
        // 大于50 使用第二列F9
        await this.pressSecondSkillBarSkill(key3, Math.ceil(thirst / 3));
      }
      if (thirst >= 6) {
        // 大于50 使用第二列F9
        await this.pressSecondSkillBarSkill(key3, Math.floor(thirst / 3));
      }
      // 关闭宠物栏
      await this.bindPlugin.moveTo(802, 84);
      await this.bindPlugin.delay(300);
      await this.bindPlugin.leftClick();
      await this.bindPlugin.delay(300);
      res(true);
    });
  }

  // 按下第二栏技能栏技能
  async pressSecondSkillBarSkill(pressKey: string, times: number = 1) {
    return new Promise(async (res, rej) => {
      await this.bindPlugin.keyPress(VK_F['tab']);
      for (let i = 0; i < times; i++) {
        await this.bindPlugin.delay(500);
        await this.bindPlugin.keyPress(VK_F[pressKey]);
        await this.bindPlugin.delay(500);
      }
      await this.bindPlugin.keyPress(VK_F['tab']);
      res(true);
    });
  }

  // 拾取有用装备
  pickUpUsefulEquip(validEquip: ValidEquip, way?: 'mail' | 'saveEquip') {
    // 获取所有装备坐标
    const pos = checkEquipCount(this.role?.bindPlugin, this.role?.bindWindowSize || '1600*900');
    logger.debug(pos, 'pos');
    if (!pos || pos.length === 0) {
      logger.info('[炼化挑选] 没有装备');
      return;
    }
    pos.forEach(async item => {
      // new Promise((res, rej) => {
      // 通过阻塞进程实现
      await this.bindPlugin.moveToClick(item.x + 10, item.y - 5);
      await this.bindPlugin.delay(1000);
      // 找到未装备
      const unEquipPos = checkUnEquipEquip(this.role?.bindPlugin, this.role?.bindWindowSize || '1600*900');
      // logger.debug(unEquipPos, 'unEquipPos');
      if (!unEquipPos) {
        logger.info('[炼化挑选] 没有未装备的装备');
        return;
      }
      // 遍历每个列表，只要有一个符合条件，就认为是有用的装备
      const isUseful = validEquip.some(equip => {
        // 获取需要校验的装备属性
        const checkInfo = (Object.keys(equip) as Array<keyof typeof equip>).filter(key => equip[key]);
        // 需要进行检查的属性都OK
        const isOk = checkInfo.every(key => unEquipPos[key] && (equip[key] as string).includes(unEquipPos[key] as string));
        return isOk;
      });
      if (way === 'saveEquip' && isUseful) {
        await this.bindPlugin.leftDoubleClick();
      }
      if (!isUseful) {
        logger.info('[炼化挑选] 这个装备没用');
        await this.bindPlugin.leftDownFromToMove({ x: item.x + 10, y: item.y - 5 }, { x: 800, y: 400 });
        await this.bindPlugin.leftClick();
        // 取消
        // this.bindPlugin.moveToClick(894, 492);
        // 丢弃
        await this.bindPlugin.moveToClick(713, 492);
        return;
      }
      logger.info('[炼化挑选] 这个装备有用');
    });
    // });
    // const { equip } = this.role?.menusPos ?? {};
    logger.info('[炼化挑选] 完成装备筛选');
  }

  // 输入密码
  async inputPassword(password: string) {
    if (!password) {
      logger.info('密码不能为空');
      return;
    }
    let record = 0;
    let errCount = 0;
    const passwordItem = password.split('');
    const inputSingle = async (str: string) => {
      if (record === passwordItem.length - 1 || errCount >= 20) {
        return;
      }
      const passwordPos = checkPasswordLockPassword(this.role?.bindPlugin, this.role?.bindWindowSize || '1600*900', str);
      if (passwordPos) {
        await this.bindPlugin.moveToClick(passwordPos.x, passwordPos.y);
        await this.bindPlugin.delay(300);
        await this.bindPlugin.moveTo(785, 785);
        await this.bindPlugin.delay(300);
        record++;
      } else {
        errCount++;
        logger.info(`密码${record}位输入错误`);
      }
      // 延时1S
      await this.bindPlugin.delay(1000);
      return inputSingle(passwordItem[record]);
    };
    inputSingle(passwordItem[record]);
    // 点击确定
    await this.bindPlugin.moveToClick(708, 505);
  }
}

// 破月 鬼刃 邪剑 银剑 九幽 苍月
