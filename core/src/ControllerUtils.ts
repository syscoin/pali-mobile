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
import SyscoinNetworkController from './network/SyscoinNetworkController';
import SyscoinContractController from './assets/SyscoinContractController';
import RpcNetworkController from './network/RpcNetworkController';
import RpcContractController from './assets/RpcContractController';
import { isRpcChainType } from './util';
import {Sqlite} from "./transaction/Sqlite";

export function getContractController(context: ChildControllerContext, chainId: string) {
  const rpcNetwork = context.RpcNetworkController as RpcNetworkController;
  if (chainId === '42161' || chainId === '421611') {
    const arbNetwork = context.ArbNetworkController as ArbNetworkController;
    if (chainId !== arbNetwork.state.provider.chainId) {
      return { type: ChainType.Arbitrum };
    }
    const contractController = context.ArbContractController as ArbContractController;
    return { type: ChainType.Arbitrum, contractController };
  } else if (chainId === '10' || chainId === '69') {
    const opNetwork = context.OpNetworkController as OpNetworkController;
    if (chainId !== opNetwork.state.provider.chainId) {
      return { type: ChainType.Optimism };
    }
    const contractController = context.OpContractController as OpContractController;
    return { type: ChainType.Optimism, contractController };
  } else if (chainId === '56' || chainId === '97') {
    const bscNetwork = context.BscNetworkController as BscNetworkController;
    if (chainId !== bscNetwork.state.provider.chainId) {
      return { type: ChainType.Bsc };
    }
    const contractController = context.BscContractController as BscContractController;
    return { type: ChainType.Bsc, contractController };
  } else if (chainId === '137' || chainId === '80001') {
    const polygonNetwork = context.PolygonNetworkController as PolygonNetworkController;
    if (chainId !== polygonNetwork.state.provider.chainId) {
      return { type: ChainType.Polygon };
    }
    const contractController = context.PolygonContractController as PolygonContractController;
    return { type: ChainType.Polygon, contractController };
  } else if (getNetworkType(chainId)) {
    const etherNetwork = context.NetworkController as NetworkController;
    if (chainId !== etherNetwork.state.provider.chainId) {
      return { type: ChainType.Ethereum };
    }
    const contractController = context.AssetsContractController as AssetsContractController;
    return { type: ChainType.Ethereum, contractController };
  } else if (chainId === '128' || chainId === '256') {
    const hecoNetwork = context.HecoNetworkController as HecoNetworkController;
    if (chainId !== hecoNetwork.state.provider.chainId) {
      return { type: ChainType.Heco };
    }
    const contractController = context.HecoContractController as HecoContractController;
    return { type: ChainType.Heco, contractController };
  } else if (chainId === '43114' || chainId === '43113') {
    const avaxNetwork = context.AvaxNetworkController as AvaxNetworkController;
    if (chainId !== avaxNetwork.state.provider.chainId) {
      return { type: ChainType.Avax };
    }
    const contractController = context.AvaxContractController as AvaxContractController;
    return { type: ChainType.Avax, contractController };
  } else if (chainId === '57' || chainId === '5700') {
    const syscoinNetwork = context.SyscoinNetworkController as SyscoinNetworkController;
    if (chainId !== syscoinNetwork.state.provider.chainId) {
      return { type: ChainType.Syscoin };
    }
    const contractController = context.SyscoinContractController as SyscoinContractController;
    return { type: ChainType.Syscoin, contractController };
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

export async function getStaticTokenByChainId(chainId: string, address: string) {
  if (!chainId || !address) {
    return {};
  }
  let type;
  switch (chainId) {
    case '1':
      type = ChainType.Ethereum;
      break;
    case '42161':
      type = ChainType.Arbitrum;
      break;
    case '10':
      type = ChainType.Optimism;
      break;
    case '56':
      type = ChainType.Bsc;
      break;
    case '137':
      type = ChainType.Polygon;
      break;
    case '128':
      type = ChainType.Heco;
      break;
    case '43114':
      type = ChainType.Avax;
      break;
    case '57':
      type = ChainType.Syscoin;
      break;
  }
  if (!type) {
    return {};
  }
  const token = await Sqlite.getInstance().getStaticToken(type, address);
  return token || {};
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
  } else if (chainType === ChainType.Syscoin) {
    return { chainType, contractController: context.SyscoinContractController as SyscoinContractController, networkController: context.SyscoinNetworkController as SyscoinNetworkController, chainId: context.SyscoinNetworkController.state.provider.chainId };
  } else if (isRpcChainType(chainType)) {
    const rpcNetwork = context.RpcNetworkController as RpcNetworkController;
    const rpcContract = context.RpcContractController as RpcContractController;
    return { chainType, contractController: rpcContract.getContract(chainType), networkController: rpcNetwork, chainId: rpcNetwork.getProviderChainId(chainType) };
  }
  return { chainType };
}
