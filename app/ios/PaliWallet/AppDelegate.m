#import "AppDelegate.h"

#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>

#ifdef FB_SONARKIT_ENABLED
#import <FlipperKit/FlipperClient.h>
#import <FlipperKitLayoutPlugin/FlipperKitLayoutPlugin.h>
#import <FlipperKitUserDefaultsPlugin/FKUserDefaultsPlugin.h>
#import <FlipperKitNetworkPlugin/FlipperKitNetworkPlugin.h>
#import <SKIOSNetworkPlugin/SKIOSNetworkAdapter.h>
#import <FlipperKitReactPlugin/FlipperKitReactPlugin.h>
#import <UMCommon/UMCommon.h>
#import <React/RCTLinkingManager.h>


#import <UserNotifications/UserNotifications.h>
#import <RNCPushNotificationIOS.h>
#import <UMPush/UMessage.h>
#import <Firebase.h>
#import "RNSplashScreen.h" 
#import "PaliWallet-Swift.h" 


static void InitializeFlipper(UIApplication *application) {
  FlipperClient *client = [FlipperClient sharedClient];
  SKDescriptorMapper *layoutDescriptorMapper = [[SKDescriptorMapper alloc] initWithDefaults];
  [client addPlugin:[[FlipperKitLayoutPlugin alloc] initWithRootNode:application withDescriptorMapper:layoutDescriptorMapper]];
  [client addPlugin:[[FKUserDefaultsPlugin alloc] initWithSuiteName:nil]];
  [client addPlugin:[FlipperKitReactPlugin new]];
  [client addPlugin:[[FlipperKitNetworkPlugin alloc] initWithNetworkAdapter:[SKIOSNetworkAdapter new]]];
  [client start];
}
#endif

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions{
  if ([FIRApp defaultApp] == nil) {
    [FIRApp configure];
  }

  #if DEBUG
  #ifdef FB_SONARKIT_ENABLED
   InitializeFlipper(application);
  #endif
  #endif

  RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];
  UInt64 native_start_time = [[NSDate date] timeIntervalSince1970] * 1000;
  RCTRootView *rootView = [[RCTRootView alloc] initWithBridge:bridge moduleName:@"PaliWallet" initialProperties:@{@"native_start_time": [NSString stringWithFormat:@"%llu", native_start_time]}];


  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
  UIViewController *rootViewController = [UIViewController new];
  rootViewController.view = rootView;
  self.window.rootViewController = rootViewController;
  [self.window makeKeyAndVisible];
  
  
  

  Dynamic *t = [Dynamic new];
  UIView *animationUIView = (UIView *)[t createAnimationViewWithRootView:rootView lottieName:@"splash_screen"];
 
  
  if (@available(iOS 12.0, *)) {
    
    if( self.window.traitCollection.userInterfaceStyle == UIUserInterfaceStyleDark ){
      rootView.backgroundColor = [UIColor colorWithRed:17/255.0 green:30/255.0 blue:51/255.0 alpha:1.0];
      animationUIView.backgroundColor = [UIColor colorWithRed:17/255.0 green:30/255.0 blue:51/255.0 alpha:1.0];
    } else {
      rootView.backgroundColor = [UIColor whiteColor];
      animationUIView.backgroundColor = [UIColor whiteColor];
    }
  } else {
    rootView.backgroundColor = [UIColor whiteColor];
    animationUIView.backgroundColor = [UIColor whiteColor];
  }

  // register LottieSplashScreen to RNSplashScreen
  [RNSplashScreen showLottieSplash:animationUIView inRootView:rootView];

  // casting UIView type to AnimationView type
  AnimationView *animationView = (AnimationView *) animationUIView;

  // play
  [t playWithAnimationView:animationView];

  // If you want the animation layout to be forced to remove when hide is called, use this code
  [RNSplashScreen setAnimationFinished:true];
 

  [UMConfigure initWithAppkey:@"60af0efb6c421a3d97cec8e8" channel:@"App Store"];
  
  // Define UNUserNotificationCenter
  UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
  center.delegate = self;
  
  UMessageRegisterEntity *entity = [[UMessageRegisterEntity alloc] init];
  // type 是对推送的几个参数的选择，可以选择一个或者多个
  // 默认是三个全部打开，即：声音，弹窗，角标
  entity.types = UMessageAuthorizationOptionBadge|UMessageAuthorizationOptionSound|UMessageAuthorizationOptionAlert;
  [UMessage registerForRemoteNotificationsWithLaunchOptions:launchOptions Entity:entity completionHandler:^(BOOL granted, NSError * _Nullable error) {
//          if (!granted) {
//              [self sendEventWithName:@"register" body:@{
//                  @"error": @"permissions is not granted."
//              }];
//          }
//          else if (error != nil) {
//              [self sendEventWithName:@"register" body:@{
//                  @"error": error.localizedDescription
//              }];
//          }
      }];
  
  return YES;
}

// Required to register for notifications
- (void)application:(UIApplication *)application didRegisterUserNotificationSettings:(UIUserNotificationSettings *)notificationSettings
{
}
// Required for the register event.
- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken
{
  if (![deviceToken isKindOfClass:[NSData class]]) {
    return;
  }
  const unsigned *tokenBytes = (const unsigned *)[deviceToken bytes];
  NSString *hexToken = [NSString stringWithFormat:@"%08x%08x%08x%08x%08x%08x%08x%08x",
                        ntohl(tokenBytes[0]), ntohl(tokenBytes[1]), ntohl(tokenBytes[2]),
                        ntohl(tokenBytes[3]), ntohl(tokenBytes[4]), ntohl(tokenBytes[5]),
                        ntohl(tokenBytes[6]), ntohl(tokenBytes[7])];
  NSLog(@"===deviceToken = %@", hexToken);
  
  [RNCPushNotificationIOS didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];
}
// Required for the notification event. You must call the completion handler after handling the remote notification.
- (void)application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo
fetchCompletionHandler:(void (^)(UIBackgroundFetchResult))completionHandler
{
  [RNCPushNotificationIOS didReceiveRemoteNotification:userInfo fetchCompletionHandler:completionHandler];
}
// Required for the registrationError event.
- (void)application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error
{
  [RNCPushNotificationIOS didFailToRegisterForRemoteNotificationsWithError:error];
}
// Required for the localNotification event.
- (void)application:(UIApplication *)application didReceiveLocalNotification:(UILocalNotification *)notification
{
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index" fallbackResource:nil];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

// Add this above `@end`:
- (BOOL)application:(UIApplication *)application
   openURL:(NSURL *)url
   options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options
{
  return [RCTLinkingManager application:application openURL:url options:options];
}

- (BOOL)application:(UIApplication *)application continueUserActivity:(nonnull NSUserActivity *)userActivity
 restorationHandler:(nonnull void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler
{
 return [RCTLinkingManager application:application
                  continueUserActivity:userActivity
                    restorationHandler:restorationHandler];
}

// Required for localNotification event
- (void)userNotificationCenter:(UNUserNotificationCenter *)center
didReceiveNotificationResponse:(UNNotificationResponse *)response
         withCompletionHandler:(void (^)(void))completionHandler
{
  NSDictionary *userInfo = response.notification.request.content.userInfo;
  if ([response.notification.request.trigger isKindOfClass:[UNPushNotificationTrigger class]]) {
      // 应用处于后台时的远程推送
      [UMessage didReceiveRemoteNotification:userInfo];
  }
  else {
      // 应用处于后台时的本地推送接受
  }
  [RNCPushNotificationIOS didReceiveNotificationResponse:response];
}

//Called when a notification is delivered to a foreground app.
-(void)userNotificationCenter:(UNUserNotificationCenter *)center willPresentNotification:(UNNotification *)notification withCompletionHandler:(void (^)(UNNotificationPresentationOptions options))completionHandler
{
  
  NSDictionary* userInfo = notification.request.content.userInfo;
  if([notification.request.trigger isKindOfClass:[UNPushNotificationTrigger class]]){
//    [UMessage setAutoAlert:YES];
//    [UMessage didReceiveRemoteNotification:userInfo];
  }else{
  //应用处于前台时的本地推送接受
  }
  [RNCPushNotificationIOS didReceiveRemoteNotification:userInfo];
//  completionHandler(UNNotificationPresentationOptionSound | UNNotificationPresentationOptionAlert | UNNotificationPresentationOptionBadge);
}

@end
