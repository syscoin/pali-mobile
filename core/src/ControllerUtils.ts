import ArbContractController from './assets/ArbContractController';
import BscContractController from './assets/BscContractController';
import PolygonContractController from './assets/PolygonContractController';
import AssetsContractController from './assets/AssetsContractController';
import ArbNetworkController from './network/ArbNetworkController';
import { ChildControllerContext } from './ComposableController';
import { ChainType } from './assets/TokenRatesController';
import BscNetworkController from './network/BscNetworkController';
import PolygonNetworkController from './network/PolygonNetworkController';
import NetworkController, { getNetworkType } from './network/NetworkController';
import HecoNetworkController from './network/HecoNetworkController';
import HecoContractController from './assets/HecoContractController';
import OpNetworkController from './network/OpNetworkController';
import OpContractController from './assets/OpContractController';
import TronContractController from './assets/TronContractController';
import TronNetworkController from './network/TronNetworkController';
import AvaxNetworkController from './network/AvaxNetworkController';
import AvaxContractController from './assets/AvaxContractController';
import RpcNetworkController from './network/RpcNetworkController';
import RpcContractController from './assets/RpcContractController';
import { isRpcChainType } from './util';
import {
  BSC_JSON,
  ETH_JSON,
  HECO_JSON,
  POLYGON_JSON,
  OP_JSON,
  AVAX_JSON,
  ARB_JSON,
} from '.';

export function getContractController(context: ChildControllerContext, chainId: string) {
  const rpcNetwork = context.RpcNetworkController as RpcNetworkController;
  if (chainId === '42161' || chainId === '421611') {
    const arbNetwork = context.ArbNetworkController as ArbNetworkController;
    if (chainId !== arbNetwork.state.provider.chainId) {
      return { type: ChainType.Arbitrum };
    }
    const localTokenInfos = chainId === '42161' ? ARB_JSON : {};
    const contractController = context.ArbContractController as ArbContractController;
    return { type: ChainType.Arbitrum, contractController, localTokenInfos };
  } else if (chainId === '10' || chainId === '69') {
    const opNetwork = context.OpNetworkController as OpNetworkController;
    if (chainId !== opNetwork.state.provider.chainId) {
      return { type: ChainType.Optimism };
    }
    const contractController = context.OpContractController as OpContractController;
    const localTokenInfos = chainId === '10' ? OP_JSON : {};
    return { type: ChainType.Optimism, contractController, localTokenInfos };
  } else if (chainId === '56' || chainId === '97') {
    const bscNetwork = context.BscNetworkController as BscNetworkController;
    if (chainId !== bscNetwork.state.provider.chainId) {
      return { type: ChainType.Bsc };
    }
    const contractController = context.BscContractController as BscContractController;
    const localTokenInfos = chainId === '56' ? BSC_JSON : {};
    return { type: ChainType.Bsc, contractController, localTokenInfos };
  } else if (chainId === '137' || chainId === '80001') {
    const polygonNetwork = context.PolygonNetworkController as PolygonNetworkController;
    if (chainId !== polygonNetwork.state.provider.chainId) {
      return { type: ChainType.Polygon };
    }
    const contractController = context.PolygonContractController as PolygonContractController;
    const localTokenInfos = chainId === '137' ? POLYGON_JSON : {};
    return { type: ChainType.Polygon, contractController, localTokenInfos };
  } else if (getNetworkType(chainId)) {
    const etherNetwork = context.NetworkController as NetworkController;
    if (chainId !== etherNetwork.state.provider.chainId) {
      return { type: ChainType.Ethereum };
    }
    const contractController = context.AssetsContractController as AssetsContractController;
    const localTokenInfos = chainId === '1' ? ETH_JSON : {};
    return { type: ChainType.Ethereum, contractController, localTokenInfos };
  } else if (chainId === '128' || chainId === '256') {
    const hecoNetwork = context.HecoNetworkController as HecoNetworkController;
    if (chainId !== hecoNetwork.state.provider.chainId) {
      return { type: ChainType.Heco };
    }
    const contractController = context.HecoContractController as HecoContractController;
    const localTokenInfos = chainId === '128' ? HECO_JSON : {};
    return { type: ChainType.Heco, contractController, localTokenInfos };
  } else if (chainId === '43114' || chainId === '43113') {
    const avaxNetwork = context.AvaxNetworkController as AvaxNetworkController;
    if (chainId !== avaxNetwork.state.provider.chainId) {
      return { type: ChainType.Avax };
    }
    const contractController = context.AvaxContractController as AvaxContractController;
    const localTokenInfos = chainId === '43114' ? AVAX_JSON : {};
    return { type: ChainType.Avax, contractController, localTokenInfos };
  } else if (rpcNetwork.isRpcChainId(chainId)) {
    const rpcContract = context.RpcContractController as RpcContractController;
    const chainType = rpcNetwork.getChainTypeByChainId(chainId);
    if (!chainType) {
      return {};
    }
    const contractController = rpcContract.getContract(chainType);
    return { type: chainType, contractController };
  }
  return {};
}

export function getControllerFromType(context: ChildControllerContext, chainType: ChainType) {
  if (chainType === ChainType.Bsc) {
    return { chainType, contractController: context.BscContractController as BscContractController, networkController: context.BscNetworkController as BscNetworkController, chainId: context.BscNetworkController.state.provider.chainId };
  } else if (chainType === ChainType.Heco) {
    return { chainType, contractController: context.HecoContractController as HecoContractController, networkController: context.HecoNetworkController as HecoNetworkController, chainId: context.HecoNetworkController.state.provider.chainId };
  } else if (chainType === ChainType.Polygon) {
    return { chainType, contractController: context.PolygonContractController as PolygonContractController, networkController: context.PolygonNetworkController as PolygonNetworkController, chainId: context.PolygonNetworkController.state.provider.chainId };
  } else if (chainType === ChainType.Optimism) {
    return { chainType, contractController: context.OpContractController as OpContractController, networkController: context.OpNetworkController as OpNetworkController, chainId: context.OpNetworkController.state.provider.chainId };
  } else if (chainType === ChainType.Ethereum) {
    return { chainType, contractController: context.AssetsContractController as AssetsContractController, networkController: context.NetworkController as NetworkController, chainId: context.NetworkController.state.provider.chainId };
  } else if (chainType === ChainType.Arbitrum) {
    return { chainType, contractController: context.ArbContractController as ArbContractController, networkController: context.ArbNetworkController as ArbNetworkController, chainId: context.ArbNetworkController.state.provider.chainId };
  } else if (chainType === ChainType.Tron) {
    return { chainType, contractController: context.TronContractController as TronContractController, networkController: context.TronNetworkController as TronNetworkController, chainId: context.TronNetworkController.state.provider.chainId };
  } else if (chainType === ChainType.Avax) {
    return { chainType, contractController: context.AvaxContractController as AvaxContractController, networkController: context.AvaxNetworkController as AvaxNetworkController, chainId: context.AvaxNetworkController.state.provider.chainId };
  } else if (isRpcChainType(chainType)) {
    const rpcNetwork = context.RpcNetworkController as RpcNetworkController;
    const rpcContract = context.RpcContractController as RpcContractController;
    return { chainType, contractController: rpcContract.getContract(chainType), networkController: rpcNetwork, chainId: rpcNetwork.getProviderChainId(chainType) };
  }
  return { chainType };
}
