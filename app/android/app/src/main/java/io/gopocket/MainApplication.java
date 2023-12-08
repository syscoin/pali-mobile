package io.paliwallet;

import com.facebook.react.ReactApplication;
import com.github.wuxudong.rncharts.MPAndroidChartPackage;
import android.content.Context;
import com.facebook.react.PackageList;
import com.facebook.react.ReactInstanceManager;
import com.airbnb.android.react.lottie.LottiePackage;
import com.leon.channel.helper.ChannelReaderUtil;
import com.swmansion.gesturehandler.react.RNGestureHandlerPackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.soloader.SoLoader;
import cl.json.ShareApplication;
import java.lang.reflect.InvocationTargetException;
import java.util.List;
import io.invertase.firebase.analytics.ReactNativeFirebaseAnalyticsPackage;
import io.paliwallet.nativeModules.PreventScreenshotPackage;
import com.swmansion.reanimated.ReanimatedJSIModulePackage;
import com.facebook.react.bridge.JSIModulePackage;


import android.text.TextUtils;

import androidx.multidex.MultiDexApplication;

import android.database.CursorWindow;
import java.lang.reflect.Field;
import io.paliwallet.nativeModules.RNToolsPackage;

import com.cmcewen.blurview.BlurViewPackage;
import com.brentvatne.react.ReactVideoPackage;

import com.reactlibrary.RNThreadPackage;

import com.mkuczera.RNReactNativeHapticFeedbackPackage;

// @react-native-community/async-storage
import com.reactnativecommunity.asyncstorage.AsyncStoragePackage;
// react-native-aes-crypto
import com.tectiv3.aes.RCTAesPackage;
// react-native-fs
import com.rnfs.RNFSPackage;
// react-native-i18n
import com.AlexanderZaytsev.RNI18n.RNI18nPackage;
// react-native-keychain
import com.oblador.keychain.KeychainPackage;
// react-native-os
import com.peel.react.rnos.RNOSModule;
// react-native-randombytes
import com.bitgo.randombytes.RandomBytesPackage;
// react-native-sqlite-storage
import org.pgsqlite.SQLitePluginPackage;
// react-native-tcp
import com.peel.react.TcpSocketsModule;
// rn-fetch-blob
import com.RNFetchBlob.RNFetchBlobPackage;
// react-native-code-push
import com.microsoft.codepush.react.CodePush;

public class MainApplication extends MultiDexApplication implements ShareApplication, ReactApplication {
	private String mChannel;

	private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
		@Override
		public boolean getUseDeveloperSupport() {
			return BuildConfig.DEBUG;
		}

		// bundle location from on each app start
        @Override
        protected String getJSBundleFile() {
        	return CodePush.getJSBundleFile();
        }
    
		@Override
		protected List<ReactPackage> getPackages() {
			@SuppressWarnings("UnnecessaryLocalVariable")
			List<ReactPackage> packages = new PackageList(this).getPackages();
			packages.add(new LottiePackage());

			packages.add(new RNGestureHandlerPackage());
			packages.add(new PreventScreenshotPackage());
			packages.add(new RNToolsPackage());
			packages.add(new MPAndroidChartPackage());
			packages.add(new BlurViewPackage());
			packages.add(new ReactVideoPackage());
			
			packages.add(new RNThreadPackage(
				mReactNativeHost,
				new AsyncStoragePackage(),
				new RCTAesPackage(),
				new RNFSPackage(),
				new RNI18nPackage(),
				new KeychainPackage(),
				new RNOSModule(),
				new RNReactNativeHapticFeedbackPackage(),
				new RandomBytesPackage(),
				new SQLitePluginPackage(),
				new TcpSocketsModule(),
				new RNFetchBlobPackage(),
				new PreventScreenshotPackage()
			));
			return packages;
		}

		@Override
		protected String getJSMainModuleName() {
			return "index";
		}

		@Override
		protected JSIModulePackage getJSIModulePackage() {
			return new ReanimatedJSIModulePackage();
		}
  	};

	@Override
	public ReactNativeHost getReactNativeHost() {
		return mReactNativeHost;
	}

	@Override
	public void onCreate() {
		super.onCreate();
		try {
			Field field = CursorWindow.class.getDeclaredField("sCursorWindowSize");
			field.setAccessible(true);
			field.set(null, 10 * 1024 * 1024); //the 10MB is the new size
		} catch (Exception e) {
			e.printStackTrace();
		}

//		if (BuildConfig.DEBUG) {
//			WebView.setWebContentsDebuggingEnabled(true);
//		}
		SoLoader.init(this, /* native exopackage */ false);

		initializeFlipper(this, getReactNativeHost().getReactInstanceManager());
    }

    /**
     * Loads Flipper in React Native templates. Call this in the onCreate method with something like
     * initializeFlipper(this, getReactNativeHost().getReactInstanceManager());
     *
     * @param context
     * @param reactInstanceManager
     */
    private static void initializeFlipper(
    	Context context, ReactInstanceManager reactInstanceManager) {
    	if (BuildConfig.DEBUG) {
    		try {
    		  /*
    		   We use reflection here to pick up the class that initializes Flipper,
    		  since Flipper library is not available in release mode
    		  */
    		  Class<?> aClass = Class.forName("io.paliwallet.ReactNativeFlipper");
    		  aClass
    		      .getMethod("initializeFlipper", Context.class, ReactInstanceManager.class)
    		      .invoke(null, context, reactInstanceManager);
    		} catch (ClassNotFoundException e) {
    		  e.printStackTrace();
    		} catch (NoSuchMethodException e) {
    		  e.printStackTrace();
    		} catch (IllegalAccessException e) {
    		  e.printStackTrace();
    		} catch (InvocationTargetException e) {
    		  e.printStackTrace();
    		}
		}
	}

	@Override
	public String getFileProviderAuthority() {
		return BuildConfig.APPLICATION_ID + ".provider";
	}

	public String getChannel() {
    	if (TextUtils.isEmpty(mChannel)) {
    		mChannel = ChannelReaderUtil.getChannel(this);
			if (TextUtils.isEmpty(mChannel)) {
				mChannel = "official";
			}
		}
    	return mChannel;
	}
}
