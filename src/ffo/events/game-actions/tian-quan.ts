// 刷天泉

import { damoBindingManager } from '..';
import { ensureDamo } from '../../../damo/damo';
import { TianDu } from '../../constant/NPC_position';
import { isArriveAimNear } from '../../utils/common';
import { Conversation } from '../conversation';
import { MoveActions } from '../move';
import { AttackActions } from '../skills';

const pos = [
  // 天泉
  { x: 169, y: 73 },
  { x: 193, y: 111 },
  { x: 140, y: 117 },
  { x: 93, y: 73 },
  { x: 101, y: 55 },
  { x: 155, y: 37 },
  { x: 231, y: 71 },
  { x: 251, y: 69 },
  { x: 227, y: 48 },
  { x: 190, y: 30 },
  { x: 183, y: 21 },
  { x: 135, y: 18 },
  { x: 86, y: 39 },
  { x: 52, y: 66 },
  { x: 65, y: 91 },
  { x: 72, y: 92 },
];

// 中文注释：记录每个窗口的自动寻路操作实例（用于 Alt+R 开/关切换）
const autoRouteActionsByHwnd = new Map<number, MoveActions>();

// 中文注释：自动寻路启动参数接口
export interface AutoRouteStartOptions {
  path?: Array<{ x: number; y: number }>; // 中文注释：寻路目标点数组（客户区坐标），默认使用两个示例点
  intervalMs?: number; // 中文注释：轮询间隔（毫秒），用于内部调用（当前实现固定 300ms）
}

// 中文注释：自动寻路切换返回结果
export interface AutoRouteToggleResult {
  ok: boolean; // 中文注释：操作是否成功
  running?: boolean; // 中文注释：当前是否处于运行状态
  hwnd?: number; // 中文注释：本次操作作用的窗口句柄
  message?: string; // 中文注释：失败或提示信息
}

// 中文注释：切换自动寻路（第一次开启，第二次关闭）
export const toggleTianquan = (): AutoRouteToggleResult => {
  try {
    const dm = ensureDamo();
    const hwnd = dm.getForegroundWindow();
    if (!hwnd || hwnd <= 0) {
      return { ok: false, message: '未检测到前台窗口' };
    }
    if (!damoBindingManager.isBound(hwnd)) {
      return { ok: false, hwnd, message: '当前前台窗口未绑定' };
    }

    const role = damoBindingManager.getRole(hwnd);
    if (!role) {
      return { ok: false, hwnd, message: `找不到角色记录：hwnd=${hwnd}` };
    }

    // 中文注释：获取或创建持久化的 MoveActions 实例
    let actions = autoRouteActionsByHwnd.get(hwnd);
    if (!actions) {
      actions = new MoveActions(role);
      autoRouteActionsByHwnd.set(hwnd, actions);
    }

    // 中文注释：若已有定时器在运行，则本次切换为“关闭”
    if (actions.timer || role.hasActiveTask()) {
      // 暂停
      actions.stopAutoFindPath();
      role.clearIntervalActive();
      return { ok: true, hwnd, running: false };
    }

    const active = new AttackActions(role);

    // 测试回城
    // new BaseAction(role).backCity({ x: 291, y: 124 });

    // 在仓库管理员处进行循环
    role.addIntervalActive('刷天泉', { x: 291, y: 124 }, () => {
      console.log('开始跑步', role.position);
      new MoveActions(role).startAutoFindPath(TianDu.杨戬).then(() => {
        if (isArriveAimNear(role.position, TianDu.杨戬)) {
          console.log('到达位置杨戬位置', role.position);
          new Conversation(role).YangJian();
          console.log('完成与杨戬的对话');
          // actions.startAutoFindPath(pos, active).then(res => {
          //   setTimeout(() => {
          //     console.log('完成跑步后对话', role.position);
          //     // const conversation = new Conversation(role);
          //     // conversation.YangJian();
          //     active.scanMonster().then(res => {
          //       console.log('当前已经没有怪物了', role.position);
          //       setTimeout(() => {
          //         new BaseAction(role).backCity({ x: 291, y: 124 });
          //       }, 1000);
          //     });
          //   }, 1000);
          // });
        }
      });
      // dm.dm.delay(5000);
    });

    // actions.startAutoFindPath(pos, active).then(res => {
    //   setTimeout(() => {
    //     console.log('完成跑步后对话', role.position);
    //     // const conversation = new Conversation(role);
    //     // conversation.YangJian();
    //     active.scanMonster().then(res => {
    //       console.log('当前已经没有怪物了', role.position);
    //       setTimeout(() => {
    //         new BaseAction(role).backCity({ x: 291, y: 124 });
    //       }, 1000);
    //     });
    //   }, 1000);
    // });

    // const url = readVerifyCodeImage(hwnd);
    // console.log('验证码图片 base64url', url);
    // // 测试AI
    // getVerifyCodeAiRes(url).then(res => {
    //   console.log('AI xxxxx', res);
    // });
    return { ok: true, hwnd, running: true };
  } catch (err) {
    return { ok: false, message: String((err as any)?.message || err) };
  }
};
