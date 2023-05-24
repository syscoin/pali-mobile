package io.paliwallet.utils;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.text.TextUtils;

public class GooglePlayUtils {

    public static void launchAppDetail(Context context, String appPkg) {
        try {
            if (TextUtils.isEmpty(appPkg)) return;

            Uri uri = Uri.parse("market://details?id=" + appPkg);
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            intent.setPackage("com.android.vending");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
			context.startActivity(intent);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static boolean isGooglePlayCanResolved(Context context) {
        Uri uri = Uri.parse("market://details?id=com.android.chrome");
        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
        intent.setPackage("com.android.vending");

        PackageManager pm = context.getPackageManager();
        if (intent.resolveActivity(pm) != null) {
            return true;
        } else {
            return false;
        }
    }
}
