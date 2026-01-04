import { ORIGIN_POSITION } from '../../constant/OCR-pos';

export class BaseAction {
  private dm: any = null;
  constructor(dm: any) {
    this.dm = dm;
  }

  backCity() {
    this.dm.moveTo(ORIGIN_POSITION);
  }
}
