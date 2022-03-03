import BaseController, { BaseConfig, BaseState } from '../BaseController';
import ContractController from './ContractController';

export class RpcContractController extends BaseController<BaseConfig, BaseState> {

  name = 'RpcContractController';

  contracts: { [chainType: number]: ContractController<BaseConfig, BaseState> } = {};

  constructor(config?: Partial<BaseConfig>, state?: Partial<BaseState>) {
    super(config, state);
    this.defaultConfig = {
    };
    this.defaultState = {
    };
    this.initialize();
  }

  addContract(chainType: number, provider: any, chainId: string) {
    this.contracts[chainType] = new ContractController();
    this.contracts[chainType].context = this.context;
    this.contracts[chainType].onL2NetworkChange(provider, chainId);
  }

  removeContract(chainType: number) {
    if (this.contracts[chainType]) {
      delete this.contracts[chainType];
    }
  }

  getContract(chainType: number) {
    return this.contracts[chainType];
  }

  callContract(chainType: number, method: string, ...args: any[]) {
    const contract = this.getContract(chainType);
    if (!contract) {
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return contract[method](...args);
  }

  onL1NetworkChange(provider: any, chainId: any) {
    for (const chainType in this.contracts) {
      this.contracts[chainType].onL1NetworkChange(provider, chainId);
    }
  }
}

export default RpcContractController;
