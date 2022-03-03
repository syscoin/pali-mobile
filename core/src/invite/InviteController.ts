import { successfulFetch, logDebug, useTestServer } from '../util';
import BaseController, { BaseConfig, BaseState } from '../BaseController';

export interface UserInfoData {
  parent_code: string;
  invite_code: string;
}

export interface InviteState extends BaseState {
  mainAddress: string;
  accessToken: string| null;
  userInfo: UserInfoData | undefined;
}

export class InviteController extends BaseController<BaseConfig, InviteState> {

  name = 'InviteController';

  private getGoServerURL() {
    return useTestServer() ? 'https://go.libsss.com/api/' : 'https://go.morpheuscommunity.net/api/';
  }

  constructor(config?: Partial<BaseConfig>, state?: Partial<InviteState>) {
    super(config, state);
    this.defaultState = { mainAddress: '', accessToken: '', userInfo: undefined };
    this.initialize();
  }

  onComposed() {
    super.onComposed();
  }

  private async wrapFetch(url: string, options: RequestInit) {
    const response = await successfulFetch(url, options);
    const { headers } = response;
    const newToken = headers.get('authorization') || '';
    const res = await response.json();
    if (res?.code === 4012) {
      this.update({ accessToken: newToken });
    }
    return res;
  }

  private async apiGet(url: string) {
    const options = {
      method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': this.state.accessToken || '',
        },
    };
    return this.wrapFetch(url, options);
  }

  private async apiPost(url: string, params: any) {
    const options = {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': this.state.accessToken || '',
      },
      body: JSON.stringify(params),
    };
    return this.wrapFetch(url, options);
  }

  public async requestLogin(params: string, mainAddress: string) {
    try {
      const url = `${this.getGoServerURL()}v2/user/login`;
      const response = await this.apiPost(url, { content: params });
      const { code, data } = response;
      if (code === 200) {
        this.update({ mainAddress, userInfo: data.user, accessToken: data.token });
      }
      return response;
    } catch (e) {
      logDebug('requestLogin error: ', e);
    }
    return undefined;
  }

  public async fetchUserInfo() {
    try {
      const url = `${this.getGoServerURL()}v1/user/getInfo`;
      const token = this.state.accessToken || '';
      let response = await this.apiGet(url);
      if (response.code === 4012) {
        const newToken = this.state.accessToken;
        if (newToken !== token && newToken) {
          response = await this.apiGet(url);
        }
      }
      if (response.code === 200) {
        this.update({
          userInfo: {
            parent_code: response?.data?.parent_code,
            invite_code: response?.data?.invite_code,
          },
        });
      } else {
        logDebug('fetchUserInfo error: ', response.code, response.msg);
      }
      return response;
    } catch (e) {
      logDebug('fetchUserInfo error: ', e);
    }
    return undefined;
  }

  public async bindInviteCode(channel: string) {
    try {
      const url = `${this.getGoServerURL()}v1/user/bind/inviteCode`;
      const response = await this.apiPost(url, { invite_code: channel });
      const { code, msg } = response;
      if (code === 200) {
        const user = this.state.userInfo;
        if (user) {
          user.parent_code = channel;
          this.update({ userInfo: user });
        }
      } else {
        logDebug('bindInviteCode error: ', msg);
      }
      return response;
    } catch (e) {
      logDebug('bindInviteCode error: ', e);
    }
    return undefined;
  }

  public clearCache() {
    this.update({ mainAddress: '', accessToken: '', userInfo: undefined });
  }
}

export default InviteController;
