import { damoBindingManager } from '.';
import { ensureDamo } from '../../damo/damo';
import { DEFAULT_ADDRESS_NAME, DEFAULT_ROLE_POSITION } from '../constant/OCR-pos';
import { MoveActions } from '../utils/base-opr/move';
import { parseRolePositionFromText } from '../utils/common';

export type Pos = {
  x: number;
  y: number;
};

export class Role {
  public bindDm: any = null; // 大漠类
  private timer: NodeJS.Timeout | null = null; // 定时器
  private name: string = ''; // 当前控制的角色名称
  public position: Pos | null = { x: 0, y: 0 }; // 当前所在坐标
  public map: string = ''; // 当前所在地图名称
  private isOpenAutoRoute: boolean = false; // 是否开启自动寻路
  private bloodStatus: string = ''; // 血量状态
  private isDead: boolean = false; // 是否死亡
  private bindWindowSize: string = ''; // 绑定窗口的尺寸
  private moveActions: MoveActions | null = null; // 移动操作类
  private pollTimers = new Map<number, ReturnType<typeof setInterval>>(); // 记录轮询定时器

  constructor() {}

  // 需要先绑定之后再注册角色信息
  registerRole(bindWindowSize: '1600*900' | '1280*800') {
    this.bindWindowSize = bindWindowSize;
    const map = DEFAULT_ADDRESS_NAME[bindWindowSize];
    const rolePos = DEFAULT_ROLE_POSITION[bindWindowSize];

    const dm = ensureDamo();
    // 中文注释：获取当前前台窗口句柄
    const hwnd = dm.getForegroundWindow();
    const rec = damoBindingManager.get(hwnd);
    if (!hwnd || !dm) {
      throw new Error('[角色信息] 未提供有效的绑定记录或 dm 实例');
    }
    if (!damoBindingManager.isBound(hwnd)) {
      console.log('[角色信息] 当前前台窗口未绑定');
      return;
    }
    const bindDm = rec?.ffoClient.dm;
    this.bindDm = rec?.ffoClient.dm;
    this.timer = setInterval(() => {
      try {
        const raw: string = String(bindDm.Ocr(rolePos.x1, rolePos.y1, rolePos.x2, rolePos.y2, rolePos.color, rolePos.sim) || '').trim();
        const pos = parseRolePositionFromText(raw);
        const addressName = bindDm.Ocr(map.x1, map.y1, map.x2, map.y2, map.color, map.sim);
        this.map = addressName;
        this.position = pos;
        console.log('[角色信息] 地图名称:', `${this.map}:${this.position?.x},${this.position?.y}`);
      } catch (err) {
        console.warn('[角色信息] 轮询失败:', String((err as any)?.message || err));
      }
    }, 300); // 中文注释：最小间隔 200ms，避免过于频繁
  }

  // 开启自动寻路
  startAutoFindRoute(cb: (dm: any, pos: Pos) => boolean | undefined) {
    this.isOpenAutoRoute = true;
    let isArrive: boolean | undefined;
    let timer: NodeJS.Timeout | null = setInterval(() => {
      if (this.position) {
        isArrive = cb(this.bindDm, this.position);
        console.log('开始寻路拉！！', isArrive);
      }
      if (isArrive) {
        timer && clearInterval(timer);
        timer = null;
        console.log('[角色信息] 已关闭自动寻路');
      }
    }, 300); // 中文注释：最小间隔 200ms，避免过于频繁
  }

  unregisterRole() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[角色信息] 已解除角色轮询');
    }
  }
}
