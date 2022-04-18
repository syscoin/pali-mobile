package io.gopocket;

import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.ReactFragmentActivity;
import com.facebook.react.ReactRootView;
import com.swmansion.gesturehandler.react.RNGestureHandlerEnabledRootView;

import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Log;

import androidx.annotation.NonNull;

import org.devio.rn.splashscreen.SplashScreen;
import com.maochunjie.mumeng.RNReactNativeMumengModule;
import com.umeng.message.PushAgent;

import io.gopocket.utils.GooglePlayUtils;

public class MainActivity extends ReactFragmentActivity {

	/**
	* Returns the name of the main component registered from JavaScript. This is used to schedule
	* rendering of the component.
	*/
	@Override
	protected String getMainComponentName() {
		return "GoPocket";
	}

	// Override onStart, onNewIntent:
	@Override
	protected void onStart() {
		super.onStart();
	}

	@Override
	protected void onCreate(Bundle savedInstanceState) {
		SplashScreen.show(this);
		super.onCreate(null);

		boolean isSupport = GooglePlayUtils.isGooglePlayCanResolved(this);
		if (!isSupport || BuildConfig.DEBUG) {
			PushAgent.getInstance(this).onAppStart();
		}
	}
	@Override
	public void onNewIntent(Intent intent) {
		super.onNewIntent(intent);
		setIntent(intent);
	}

	@Override
	protected ReactActivityDelegate createReactActivityDelegate() {
		return new ReactActivityDelegate(this, getMainComponentName()) {
			@NonNull
			@Override
			protected Bundle getLaunchOptions() {
				Bundle bundle = new Bundle();
				bundle.putString("native_start_time", String.valueOf(System.currentTimeMillis()));
				return bundle;
			}
			@Override
			protected ReactRootView createRootView() {
				return new RNGestureHandlerEnabledRootView(MainActivity.this);
			}
		};
	}

	@Override
	protected void onPause() {
        super.onPause();
        RNReactNativeMumengModule.onPause(this);
    }

	@Override
    protected void onResume() {
        super.onResume();
        RNReactNativeMumengModule.onResume(this);
    }

    @Override
    public void invokeDefaultOnBackPressed() {
        moveTaskToBack(true);
    }

	@Override
	protected void onSaveInstanceState(Bundle outState) {
		// 因为Activity重建会导致Fragment重建，但是系统重建的Fragment引用我们是拿不到的
		// 除非反射调用FragmentPagerAdapter.makeFragmentName()
		// 因此我们选择不让系统保存状态，每次用onCreate里我们创建的Fragment去加载
		// super.onSaveInstanceState(outState);
	}
}
