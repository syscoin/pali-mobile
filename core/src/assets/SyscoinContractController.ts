import { BaseConfig, BaseState } from '../BaseController';
import ContractController from './ContractController';

/**
 * Controller that interacts with contracts on mainnet through web3
 */
export class SyscoinContractController extends ContractController<BaseConfig, BaseState> {

  name = 'SyscoinContractController';

  constructor(config?: Partial<BaseConfig>, state?: Partial<BaseState>) {
    super(config, state);
    this.defaultConfig = {
    };
    this.defaultState = {
    };
    this.initialize();
  }
}

export default SyscoinContractController;
