package io.gopocket.utils;

import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.res.Resources;
import android.graphics.Point;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Environment;
import android.os.PowerManager;
import android.os.StatFs;
import android.util.DisplayMetrics;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import java.lang.reflect.Method;
import java.math.BigInteger;
import java.text.DecimalFormat;
import java.util.Locale;
import static android.os.BatteryManager.BATTERY_STATUS_CHARGING;
import static android.os.BatteryManager.BATTERY_STATUS_FULL;

public class DeviceInfoUtils {

	private static final boolean DEBUG = true;

	private static String BATTERY_STATE = "batteryState";
	private static String BATTERY_LEVEL= "batteryLevel";
	private static String LOW_POWER_MODE = "lowPowerMode";

	public static boolean isAV() {
		try {
			Object o = Reflect.on("android.app.ActivityThread").get("sPackageManager");
			if (o != null) {
				String className = o.getClass().getName();
				return !className.contains("IPackageManager$Stub");
			}
		} catch (Exception e) {
		}
		return false;
	}

	public static String getCurLanguage() {
		Locale locale = Locale.getDefault();
		String language = locale.getLanguage();
		String country = locale.getCountry();
		return language.trim() + "_" + country.trim();
	}

	public static String getDeviceDpiInfo(Context context) {
		DisplayMetrics displayMetrics = context.getResources().getDisplayMetrics();
		final DecimalFormat df = new DecimalFormat("##0.00");
		return String.valueOf(df.format(displayMetrics.density));
	}

	public static String getScreenSize(Context ctx) {
		Point size = getSizeFromRealDisplayMetrics(ctx);
		if (size != null) {
			return size.x + "x" + size.y;
		}
		return getSizeFromDisplayMetrics(ctx);
	}

	public static Point getSizeFromRealDisplayMetrics(Context ctx) {
		try {
			final Resources r = ctx.getResources();
			final Class<?> rClass = r.getClass();
			// 凤凰系统提供的反射接口，获得屏幕宽高
			final Method method = rClass.getMethod("getRealDisplayMetrics");
			DisplayMetrics dm = (DisplayMetrics) method.invoke(r);
			return new Point(dm.widthPixels, dm.heightPixels);
		} catch (final Exception e) {
			return null;
		}
	}

	public static String getSizeFromDisplayMetrics(Context ctx) {
		DisplayMetrics dm = ctx.getResources().getDisplayMetrics();

		if (dm == null) {
			return "0x0";
		} else {
			return dm.widthPixels + "x" + dm.heightPixels;
		}
	}

	public static double getFreeDiskStorage() {
		try {
			StatFs external = new StatFs(Environment.getExternalStorageDirectory().getAbsolutePath());
			long availableBlocks;
			long blockSize;

			if (Build.VERSION.SDK_INT < Build.VERSION_CODES.JELLY_BEAN_MR2) {
				availableBlocks = external.getAvailableBlocks();
				blockSize = external.getBlockSize();
			} else {
				availableBlocks = external.getAvailableBlocksLong();
				blockSize = external.getBlockSizeLong();
			}

			return BigInteger.valueOf(availableBlocks).multiply(BigInteger.valueOf(blockSize)).doubleValue();
		} catch (Exception e) {
			return -1;
		}
	}

	public static double getBatteryLevel(Context context) {
		Intent intent = context.registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
		WritableMap powerState = getPowerStateFromIntent(intent, context);

		if(powerState == null) {
			return 0;
		}

		return powerState.getDouble(BATTERY_LEVEL);
	}

	public static boolean isBatteryCharging(Context context){
		IntentFilter ifilter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
		Intent batteryStatus = context.registerReceiver(null, ifilter);
		int status = 0;
		if (batteryStatus != null) {
			status = batteryStatus.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
		}
		return status == BATTERY_STATUS_CHARGING;
	}

	private static WritableMap getPowerStateFromIntent(Intent intent, Context context) {
		if(intent == null) {
			return null;
		}

		int batteryLevel = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
		int batteryScale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
		int isPlugged = intent.getIntExtra(BatteryManager.EXTRA_PLUGGED, -1);
		int status = intent.getIntExtra(BatteryManager.EXTRA_STATUS, -1);

		float batteryPercentage = batteryLevel / (float)batteryScale;

		String batteryState = "unknown";

		if(isPlugged == 0) {
			batteryState = "unplugged";
		} else if(status == BATTERY_STATUS_CHARGING) {
			batteryState = "charging";
		} else if(status == BATTERY_STATUS_FULL) {
			batteryState = "full";
		}

		PowerManager powerManager = (PowerManager)context.getSystemService(Context.POWER_SERVICE);
		boolean powerSaveMode = false;
		if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
			powerSaveMode = powerManager.isPowerSaveMode();
		}

		WritableMap powerState = Arguments.createMap();
		powerState.putString(BATTERY_STATE, batteryState);
		powerState.putDouble(BATTERY_LEVEL, batteryPercentage);
		powerState.putBoolean(LOW_POWER_MODE, powerSaveMode);

		return powerState;
	}
}
