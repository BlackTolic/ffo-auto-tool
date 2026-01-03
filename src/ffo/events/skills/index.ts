import { Role } from '../rolyer';

interface SkillSortProps {
  key: string;
  time: number;
}

interface AttackOptions {
  path?: { x: number; y: number }[];
  attackRange?: number;
}

export class AttackActions {
  public bindDm: any = null; // 大漠类
  public timer: NodeJS.Timeout | null = null;
  public timerMapList: Map<string, NodeJS.Timeout> = new Map();
  private skillPropsList: SkillSortProps[] = [];

  constructor(role: Role) {
    this.bindDm = role.bindDm;
  }

  // 找到最近的怪物进行攻击
  attackNearestMonster({ path = [], attackRange = 100 }: AttackOptions) {
    this.bindDm.findNearest('monster');
  }

  startAutoSkill(props: SkillSortProps[]) {
    this.skillPropsList = props;
    props.forEach(item => {
      const timer = setInterval(() => {
        this.bindDm.keyPress(item.key);
      }, item.time);
      this.timerMapList.set(item.key, timer);
    });
  }

  stopAutoSkill() {
    this.skillPropsList.forEach(item => {
      const timer = this.timerMapList.get(item.key);
      if (timer) {
        clearInterval(timer);
        this.timerMapList.delete(item.key);
      }
    });
  }
}
