import { ChildControllerContext } from './ComposableController';
import { logDebug } from './util';

/**
 * State change callbacks
 */
export type Listener<T> = (state: T) => void;

/**
 * @type BaseConfig
 *
 * Base controller configuration
 *
 * @property disabled - Determines if this controller is enabled
 */
export interface BaseConfig {
  disabled?: boolean;
}

/**
 * @type BaseState
 *
 * Base state representation
 *
 * @property name - Unique name for this controller
 */
export interface BaseState {
  name?: string;
}

/**
 * Controller class that provides configuration, state management, and subscriptions
 */
export class BaseController<C extends BaseConfig, S extends BaseState> {
  /**
   * Map of all sibling child controllers keyed by name if this
   * controller is composed using a ComposableController, allowing
   * any API on any sibling controller to be accessed
   */
  context: ChildControllerContext = {};

  /**
   * Default options used to configure this controller
   */
  defaultConfig: C = {} as C;

  /**
   * Default state set on this controller
   */
  defaultState: S = {} as S;

  /**
   * Determines if listeners are notified of state changes
   */
  disabled = false;

  /**
   * Name of this controller used during composition
   */
  name = 'BaseController';

  /**
   * List of required sibling controllers this controller needs to function
   */
  requiredControllers: string[] = [];

  private readonly initialConfig: C;

  private readonly initialState: S;

  private internalConfig: C = this.defaultConfig;

  private internalState: S = this.defaultState;

  private internalListeners: {states: string[]; listener: Listener<S>}[] = [];

  /**
   * Creates a BaseController instance. Both initial state and initial
   * configuration options are merged with defaults upon initialization.
   *
   * @param config - Initial options used to configure this controller
   * @param state - Initial state to set on this controller
   */
  constructor(config: Partial<C> = {} as C, state: Partial<S> = {} as S) {
    // Use assign since generics can't be spread: https://git.io/vpRhY
    this.initialState = state as S;
    this.initialConfig = config as C;
  }

  /**
   * Enables the controller. This sets each config option as a member
   * variable on this instance and triggers any defined setters. This
   * also sets initial state and triggers any listeners.
   *
   * @returns - This controller instance
   */
  protected initialize() {
    this.internalState = this.defaultState;
    this.internalConfig = this.defaultConfig;
    this.configure(this.initialConfig);
    this.update(this.initialState);
    return this;
  }

  /**
   * Retrieves current controller configuration options
   *
   * @returns - Current configuration
   */
  get config() {
    return this.internalConfig;
  }

  /**
   * Retrieves current controller state
   *
   * @returns - Current state
   */
  get state() {
    return this.internalState;
  }

  /**
   * Updates controller configuration
   *
   * @param config - New configuration options
   * @param overwrite - Overwrite config instead of merging
   * @param fullUpdate - Boolean that defines if the update is partial or not
   */
  configure(config: Partial<C>, overwrite = false, fullUpdate = true) {
    if (fullUpdate) {
      this.internalConfig = overwrite ? (config as C) : Object.assign(this.internalConfig, config);
    } else {
      for (const key in config) {
        /* istanbul ignore else */
        if (typeof this.internalConfig[key] !== 'undefined') {
          this.internalConfig[key] = config[key] as any;
        }
      }
    }
  }

  /**
   * Notifies all subscribed listeners of current state
   */
  notify(state: any) {
    if (this.disabled) {
      return;
    }
    const keys = Object.keys(state);
    this.internalListeners.forEach(({ states, listener }) => {
      try {
        if (!states || states.length <= 0) {
          listener(this.internalState);
        } else if (keys && keys.length > 0) {
          const intersectKey = keys.filter((key) => states.includes(key));
          if (intersectKey && intersectKey.length > 0) {
            listener(this.internalState);
          }
        }
      } catch (e) {
        logDebug(`leon.w@${this.name} notify listener failed: `, e);
        throw e;
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  beforeOnComposed() {}

  /**
   * Extension point called if and when this controller is composed
   * with other controllers using a ComposableController
   */
  onComposed() {
    this.requiredControllers.forEach((name) => {
      if (!this.context[name]) {
        throw new Error(`${this.name} must be composed with ${name}.`);
      }
    });
  }

  /**
   * Adds new listener to be notified of state changes
   *
   * @param listener - Callback triggered when state changes
   */
  subscribe(listener: Listener<S>, states: string[] = []) {
    this.internalListeners.push({ states, listener });
  }

  /**
   * Removes existing listener from receiving state changes
   *
   * @param listener - Callback to remove
   * @returns - True if a listener is found and unsubscribed
   */
  unsubscribe(listener: Listener<S>) {
    const index = this.internalListeners.findIndex(({ listener: cb }) => listener === cb);
    index > -1 && this.internalListeners.splice(index, 1);
    return index > -1;
  }

  /**
   * Updates controller state
   *
   * @param state - New state
   * @param overwrite - Overwrite state instead of merging
   */
  update(state: Partial<S>, overwrite = false) {
    this.internalState = overwrite ? Object.assign({}, state as S) : Object.assign({}, this.internalState, state);
    this.notify(state);
  }

  rehydrate(state: Partial<S>) {
    this.update(state);
  }
}

export default BaseController;
