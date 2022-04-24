import { BN } from 'ethereumjs-util';
import { BaseConfig, BaseState } from '../BaseController';
import ContractController from './ContractController';

export interface BalanceMap {
  [tokenAddress: string]: BN;
}

export interface ContractConfig extends BaseConfig {
  name?: string
}

export class AssetsContractController extends ContractController<ContractConfig, BaseState> {

  name = 'AssetsContractController';

  constructor(config?: Partial<ContractConfig>, state?: Partial<BaseState>) {
    super(config, state);
    this.defaultState = {};
    if (config?.name) {
      this.name = config.name;
    }
    this.initialize();
  }
}

export default AssetsContractController;
