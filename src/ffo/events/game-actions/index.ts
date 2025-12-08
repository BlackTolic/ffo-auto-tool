import { Damo } from "../../../damo/damo";
import { BBLevelIn8Immortals } from "./BBLevelIn8Immortals";

/**
 * 角色自动打怪、自动寻路工具类
 */
export class GameActions {
  private damo ;


  constructor(damo:Damo) {
    this.damo = damo;
  }

  // 八仙练宠
   BBLevelIn8Immortals() {
    BBLevelIn8Immortals(this.damo)
  }
}
