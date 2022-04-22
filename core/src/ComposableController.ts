import BaseController from './BaseController';
import { logDebug } from './util';

/**
 * Child controller instances keyed by controller name
 */
export interface ChildControllerContext {
  [key: string]: BaseController<any, any>;
}

/**
 * List of child controller instances
 */
export type ControllerList = BaseController<any, any>[];

/**
 * Controller that can be used to compose multiple controllers together
 */
export class ComposableController extends BaseController<any, any> {
  private cachedState: any;

  private internalControllers: ControllerList = [];

  /**
   * Map of stores to compose together
   */
  context: ChildControllerContext = {};

  networks: { [type: number]: any } = {};
  contracts: { [type: number]: any } = {};

  /**
   * Name of this controller used during composition
   */
  name = 'ComposableController';

  /**
   * Creates a ComposableController instance
   *
   * @param controllers - Map of names to controller instances
   * @param initialState - Initial state keyed by child controller name
   */
  constructor(controllers: ControllerList = [], initialState?: any) {
    super();
    this.initialize();
    this.cachedState = initialState;
    this.controllers = controllers;
    this.cachedState = undefined;
  }

  /**
   * Get current list of child composed store instances
   *
   * @returns - List of names to controller instances
   */
  get controllers() {
    return this.internalControllers;
  }

  /**
   * Set new list of controller instances
   *
   * @param controllers - List of names to controller instsances
   */
  set controllers(controllers: ControllerList) {
    this.internalControllers = controllers;
    controllers.forEach((controller: any) => {
      if (controller.isNetwork) {
        this.networks[controller.chainType] = controller;
      } else if (controller.isContract) {
        this.contracts[controller.chainType] = controller;
      }
    });
    controllers.forEach((controller) => {
      const { name } = controller;
      this.context[name] = controller;
      controller.context = this.context;
      controller.networks = this.networks;
      controller.contracts = this.contracts;
      try {
        this.cachedState?.[name] && controller.rehydrate(this.cachedState[name]);
      } catch (e) {
        logDebug(`leon.w@rehydrate@${name} with error: ${e}`);
      }
    });
    controllers.forEach((controller) => {
      try {
        controller.beforeOnComposed();
      } catch (e) {
        logDebug(`leon.w@beforeOnComposed with error: ${e}`);
      }
    });
    controllers.forEach((controller) => {
      try {
        controller.onComposed();
      } catch (e) {
        logDebug(`leon.w@onComposed with error: ${e}`);
      }
    });
  }
}

export default ComposableController;
