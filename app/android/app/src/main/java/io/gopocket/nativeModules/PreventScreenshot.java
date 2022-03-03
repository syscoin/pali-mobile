package io.gopocket.nativeModules;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

import android.view.WindowManager;

import io.gopocket.MainApplication;

import static com.facebook.react.bridge.UiThreadUtil.runOnUiThread;

public class PreventScreenshot extends ReactContextBaseJavaModule {
  private static final String PREVENT_SCREENSHOT_ERROR_CODE = "PREVENT_SCREENSHOT_ERROR_CODE";
  private final ReactApplicationContext reactContext;

  PreventScreenshot(ReactApplicationContext context) {
    super(context);
    reactContext = context;
  }

  @Override
  public String getName() {
    return "PreventScreenshot";
  }

  @ReactMethod
  public void getChannel(Promise promise) {
  	runOnUiThread(new Runnable() {
		@Override
		public void run() {
			try {
				MainApplication mainApplication = (MainApplication) reactContext.getApplicationContext();
				promise.resolve(mainApplication.getChannel());
			} catch (Exception e) {
				promise.resolve("official");
			}
		}
	});
  }

  @ReactMethod
  public void forbid(Promise promise) {
    runOnUiThread(new Runnable() {
      @Override
      public void run() {
        try {
          getCurrentActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
          promise.resolve("Done. Screenshot taking locked.");
        } catch(Exception e) {
          promise.reject(PREVENT_SCREENSHOT_ERROR_CODE, "Forbid screenshot taking failure.");
        }
      }
    });
  }

  @ReactMethod
  public void allow(Promise promise) {
    runOnUiThread(new Runnable() {
      @Override
      public void run() {
        try {
          getCurrentActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
          promise.resolve("Done. Screenshot taking unlocked.");
        } catch (Exception e) {
          promise.reject(PREVENT_SCREENSHOT_ERROR_CODE, "Allow screenshot taking failure.");
        }
      }
    });
  }
}
