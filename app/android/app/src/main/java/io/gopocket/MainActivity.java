package io.paliwallet;

import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.ReactActivity;
import com.facebook.react.ReactRootView;
import com.swmansion.gesturehandler.react.RNGestureHandlerEnabledRootView;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Log;

import androidx.annotation.NonNull;

import org.devio.rn.splashscreen.SplashScreen;


public class MainActivity extends ReactActivity {

	/**
	* Returns the name of the main component registered from JavaScript. This is used to schedule
	* rendering of the component.
	*/
	@Override
	protected String getMainComponentName() {
		return "PaliWallet";
	}

	/**
	 * Returns the instance of the {@link ReactActivityDelegate}. There the RootView is created and
	 * you can specify the rendered you wish to use (Fabric or the older renderer).
	 */
	@Override
	protected ReactActivityDelegate createReactActivityDelegate() {
		return new MainActivityDelegate(this, getMainComponentName());
	}
	public static class MainActivityDelegate extends ReactActivityDelegate {
		public MainActivityDelegate(ReactActivity activity, String mainComponentName) {
		super(activity, mainComponentName);
		}
		@Override
		protected ReactRootView createRootView() {
		ReactRootView reactRootView = new ReactRootView(getContext());
		// If you opted-in for the New Architecture, we enable the Fabric Renderer.
		reactRootView.setIsFabric(BuildConfig.IS_NEW_ARCHITECTURE_ENABLED);
		return reactRootView;
		}
	}


	// Override onStart, onNewIntent:
	@Override
	protected void onStart() {
		super.onStart();
	}

	@Override
	protected void onCreate(Bundle savedInstanceState) {
		SplashScreen.show(this, R.id.lottie); // here
   		SplashScreen.setAnimationFinished(true);// If you want the animation dialog to be forced to close when hide is called, use this code
		super.onCreate(null);
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
    }

	@Override
    protected void onResume() {
        super.onResume();
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
