import { Mutex } from 'async-mutex';
import {BaseNetworkConfig, BaseNetworkController, BaseNetworkState} from "./BaseNetworkController";

export class TronNetworkController extends BaseNetworkController<BaseNetworkConfig, BaseNetworkState> {
  private mutex = new Mutex();

  name = 'TronNetworkController';

  provider: any;

  constructor(config?: Partial<BaseNetworkConfig>, state?: Partial<BaseNetworkState>) {
    super(config, state);
  }

  protected async refreshNetwork() {
    this.provider = this.state.provider;
    const releaseLock = await this.mutex.acquire();
    setTimeout(() => {
      this.update({ network: this.state.provider.chainId });
      releaseLock();
    }, 300);
  }
}

export default TronNetworkController;
