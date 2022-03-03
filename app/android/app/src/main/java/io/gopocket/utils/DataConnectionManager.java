package io.gopocket.utils;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.util.Log;

public class DataConnectionManager {
	private static final String TAG = "NetUtils";

	/** 网络是否已经连接 */
	public static boolean isConnected(Context c) {
		ConnectivityManager cm = (ConnectivityManager) c
			.getSystemService(Context.CONNECTIVITY_SERVICE);
		if (cm != null) {
			NetworkInfo[] infos = cm.getAllNetworkInfo();
			if (infos != null) {
				for (NetworkInfo ni : infos) {
					if (ni.isConnected()) {
						return true;
					}
				}
			}
		}
		return false;
	}

	/** WiFi 是否已经连接 */
	public static boolean isWifiConnected(Context c) {
		ConnectivityManager connecManager = (ConnectivityManager) c.getApplicationContext()
			.getSystemService(Context.CONNECTIVITY_SERVICE);
		NetworkInfo networkInfo = null;
		try {
			networkInfo = connecManager.getNetworkInfo(ConnectivityManager.TYPE_WIFI);
		} catch (Exception e) {
			Log.e(TAG, "Error reading wifi state: ", e);
		}
		if (networkInfo != null) {
			return networkInfo.isConnected();
		} else {
			return false;
		}
	}

	/** 数据网络是否已经连接 */
	public static boolean isMobileConnected(Context c) {
		boolean isConnected = false;
		try {
			ConnectivityManager mConnectivityManager = (ConnectivityManager) c
				.getSystemService(Context.CONNECTIVITY_SERVICE);
			NetworkInfo mMobileNetworkInfo = mConnectivityManager
				.getNetworkInfo(ConnectivityManager.TYPE_MOBILE);
			if (mMobileNetworkInfo != null) {
				isConnected = mMobileNetworkInfo.isConnected();
			}
		} catch (Exception e) {
			Log.e(TAG, "Error reading mobile network state: ", e);
		}
		return isConnected;
	}
}
