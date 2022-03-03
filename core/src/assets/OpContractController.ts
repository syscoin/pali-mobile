import { BaseConfig, BaseState } from '../BaseController';
import ContractController from './ContractController';

export class OpContractController extends ContractController<BaseConfig, BaseState> {

  name = 'OpContractController';

  constructor(config?: Partial<BaseConfig>, state?: Partial<BaseState>) {
    super(config, state);
    this.defaultConfig = {
    };
    this.defaultState = {
    };
    this.initialize();
  }
}

export default OpContractController;
