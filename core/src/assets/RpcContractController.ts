import BaseController, { BaseConfig, BaseState } from '../BaseController';
import ContractController from './ContractController';

export class RpcContractController extends BaseController<BaseConfig, BaseState> {

  name = 'RpcContractController';

  rpcContracts: { [chainType: number]: ContractController<BaseConfig, BaseState> } = {};

  constructor(config?: Partial<BaseConfig>, state?: Partial<BaseState>) {
    super(config, state);
    this.defaultConfig = {
    };
    this.defaultState = {
    };
    this.initialize();
  }

  addContract(chainType: number, provider: any, chainId: string) {
    this.rpcContracts[chainType] = new ContractController();
    this.rpcContracts[chainType].context = this.context;
    this.rpcContracts[chainType].onL2NetworkChange(provider, chainId);
  }

  removeContract(chainType: number) {
    if (this.rpcContracts[chainType]) {
      delete this.rpcContracts[chainType];
    }
  }

  getContract(chainType: number) {
    return this.rpcContracts[chainType];
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
    for (const chainType in this.rpcContracts) {
      this.rpcContracts[chainType].onL1NetworkChange(provider, chainId);
    }
  }
}

export default RpcContractController;
