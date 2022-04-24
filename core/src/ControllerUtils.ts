import {getConfigChainType, isRpcChainType} from './util';
import {Sqlite} from "./transaction/Sqlite";
import {ChainType} from "./Config";

export function getContractController(controller: any, chainId: string) {
  if (controller.networks[ChainType.RPCBase].isRpcChainId(chainId)) {
    const rpcContract = controller.contracts[ChainType.RPCBase];
    const chainType = rpcContract.getChainTypeByChainId(chainId);
    if (!chainType) {
      return {};
    }
    const contractController = rpcContract.getContract(chainType);
    return { type: chainType, contractController };
  } else {
    const chainType = getConfigChainType(chainId);
    if (!chainType) {
      return {};
    }
    const network = controller.networks[chainType];
    if (!network) {
      return {}
    }
    if (chainId !== network.state.provider.chainId) {
      return { type: chainType };
    }
    return { type: chainType, contractController: controller.contracts[chainType] };
  }
}

export async function getStaticTokenByChainId(chainId: string, address: string) {
  if (!chainId || !address) {
    return {};
  }
  const type = getConfigChainType(chainId);
  if (!type) {
    return {};
  }
  const token = await Sqlite.getInstance().getStaticToken(type, chainId, address);
  return token || {};
}

export function getControllerFromType(controller: any, chainType: ChainType) {
  let contractController, networkController, chainId;
  if (isRpcChainType(chainType)) {
    networkController = controller.networks[ChainType.RPCBase];
    contractController = controller.contracts[ChainType.RPCBase].getContract(chainType);
    chainId = networkController.getProviderChainId(chainType)
  } else {
    networkController = controller.networks[chainType];
    contractController = controller.contracts[chainType];
    chainId = networkController.state.provider.chainId;
  }
  return { chainType, contractController, networkController, chainId };
}
