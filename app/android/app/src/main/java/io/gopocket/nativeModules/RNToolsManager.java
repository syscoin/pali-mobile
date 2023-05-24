package io.paliwallet.nativeModules;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.snail.antifake.jni.EmulatorDetectUtil;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.os.Build;
import android.text.TextUtils;
import android.util.Base64;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

import io.paliwallet.utils.CryptUtil;
import io.paliwallet.utils.DataConnectionManager;
import io.paliwallet.utils.DeviceInfoUtils;
import io.paliwallet.utils.GooglePlayUtils;
import io.paliwallet.utils.NotificationUtils;

public class RNToolsManager extends ReactContextBaseJavaModule {
	private Context mContext;
    public RNToolsManager(ReactApplicationContext reactContext) {
        super(reactContext);
        mContext = reactContext;
    }

    @Override
    public String getName() {
        return "RNToolsManager";
    }

	private String getDeviceInfoSync() {
		JSONObject deviceInfo = new JSONObject();
		try {
			deviceInfo.put("manufacturer", Build.MANUFACTURER);
			deviceInfo.put("brand", Build.BRAND);
			deviceInfo.put("model", Build.MODEL);
			deviceInfo.put("device", Build.DEVICE);
			deviceInfo.put("product", Build.PRODUCT);
			deviceInfo.put("sdk_int", Build.VERSION.SDK_INT);
			deviceInfo.put("net_type", DataConnectionManager.isWifiConnected(mContext) ? "wifi"
				: (DataConnectionManager.isMobileConnected(mContext) ? "mobile" : "unknown"));
			deviceInfo.put("lang", DeviceInfoUtils.getCurLanguage());
			deviceInfo.put("resolution", DeviceInfoUtils.getScreenSize(mContext));
			deviceInfo.put("density", DeviceInfoUtils.getDeviceDpiInfo(mContext));
			deviceInfo.put("freeDiskStorage", DeviceInfoUtils.getFreeDiskStorage());
			deviceInfo.put("batteryLevel", DeviceInfoUtils.getBatteryLevel(mContext));
			deviceInfo.put("isBatteryCharging", DeviceInfoUtils.isBatteryCharging(mContext));
			deviceInfo.put("isEmulator", EmulatorDetectUtil.isEmulator(mContext));
			deviceInfo.put("isAV", DeviceInfoUtils.isAV());
			if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
				JSONArray abis = new JSONArray(Build.SUPPORTED_ABIS);
				deviceInfo.put("abis", abis);
			}
			PackageManager packageManager = mContext.getPackageManager();
			List<PackageInfo> packageInfos = packageManager.getInstalledPackages(0);
			List<String> packageNames = new ArrayList<>();
			String hostPackageName = mContext.getPackageName();
			Intent i = new Intent(Intent.ACTION_MAIN);
			i.addCategory(Intent.CATEGORY_LAUNCHER);
			for (PackageInfo packageInfo : packageInfos) {
				if (TextUtils.equals(hostPackageName, packageInfo.packageName)) {
					continue;
				}
				i.setPackage(packageInfo.packageName);
				List<ResolveInfo> resolveInfos = packageManager.queryIntentActivities(i, 0);
				if (resolveInfos == null || resolveInfos.isEmpty()) {
					continue;
				}
				packageNames.add(packageInfo.packageName);
			}
			if (packageNames.size() >= 20) {
			} else {
				JSONArray packages = new JSONArray(packageNames);
				deviceInfo.put("pkgs", packages);
			}
			deviceInfo.put("pkgsSize", packageNames.size());
		} catch (JSONException e) {
			Log.e("getDeviceInfo", "Error reading device info", e);
		}
		return deviceInfo.toString();
	}

	@ReactMethod
	public void getDeviceInfo(Promise p) {
		p.resolve(getDeviceInfoSync());
	}

	private String encryptSync(byte[] content, String key) {
		try {
			byte[] bytes = CryptUtil.encrypt(content, key);
			return Base64.encodeToString(bytes, Base64.NO_WRAP);
		} catch (Exception e) {
			Log.e("encrypt", "encrypt error: ", e);
		}
		return "";
	}

	@ReactMethod
	private void encrypt(String content, String key, Promise p) {
    	try {
			p.resolve(encryptSync(content.getBytes("utf-8"), key));
		} catch (Exception e) {
    		e.printStackTrace();
		}
	}

	@ReactMethod
	private void encryptBase64(String content, String key, Promise p) {
		p.resolve(encryptSync(Base64.decode(content, Base64.NO_WRAP), key));
	}

	private String decryptSync(byte[] content, String key) {
		try {
			byte[] bytes = CryptUtil.decrypt(content, key);
			return new String(bytes, "utf-8");
		} catch (Exception e) {
			Log.e("encrypt", "encrypt error: ", e);
		}
		return "";
	}

	@ReactMethod
	private void decrypt(String content, String key, Promise p) {
    	try {
			p.resolve(decryptSync(content.getBytes("utf-8"), key));
		} catch (Exception e) {
    		e.printStackTrace();
		}
	}

	@ReactMethod
	private void decryptBase64(String content, String key, Promise p) {
		p.resolve(decryptSync(Base64.decode(content, Base64.NO_WRAP), key));
	}

	@ReactMethod
	private void supportGooglePlay(Promise p) {
		boolean support = GooglePlayUtils.isGooglePlayCanResolved(mContext);
		p.resolve(support);
	}

	@ReactMethod
	private void launchAppInGooglePlay(Promise p) {
		GooglePlayUtils.launchAppDetail(mContext, mContext.getPackageName());
		p.resolve("");
	}

	@ReactMethod
	public void getIsNotificationEnabled(Promise p) {
		p.resolve(NotificationUtils.isNotificationEnabled(mContext));
	}

	@ReactMethod
	private void gotoSetNotification(Promise p) {
		NotificationUtils.gotoSet(mContext);
		p.resolve("");
	}
}
