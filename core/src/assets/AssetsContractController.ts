import { BN } from 'ethereumjs-util';
import { BaseConfig, BaseState } from '../BaseController';
import ContractController from './ContractController';

export interface BalanceMap {
  [tokenAddress: string]: BN;
}

export class AssetsContractController extends ContractController<BaseConfig, BaseState> {

  name = 'AssetsContractController';

  constructor(config?: Partial<BaseConfig>, state?: Partial<BaseState>) {
    super(config, state);
    this.defaultConfig = {
    };
    this.initialize();
  }
}

export default AssetsContractController;
