
#import <React/RCTBridgeModule.h>
#import <UIKit/UIKit.h>
#import<AudioToolbox/AudioToolbox.h>

@interface RCT_EXTERN_MODULE(RNToolsManager, NSObject)
RCT_EXTERN_METHOD(encryptBase64:(NSString)content withSecret:(NSString)secretKey withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(encrypt:(NSString)content withSecret:(NSString)secretKey withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(decryptBase64:(NSString)content withSecret:(NSString)secretKey withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(decrypt:(NSString)content withSecret:(NSString)secretKey withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXPORT_METHOD(jumpTestFlight:(NSString *)appleId withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)
{
  NSString *urlString = [NSString stringWithFormat:@"testflight.apple.com/join/%@", appleId];
  if ([[UIApplication sharedApplication] canOpenURL:[NSURL URLWithString:@"itms-beta://"]]) {
    urlString = [NSString stringWithFormat:@"itms-beta://%@",urlString];
    NSURL *url = [NSURL URLWithString:urlString];
    [[UIApplication sharedApplication] openURL:url options:@{} completionHandler:^(BOOL success) {
      if (success) {
        resolve(@"testFlight success");
      }else{
        resolve(@"testFlight fail");
      }
    }];
  } else{
    urlString = [NSString stringWithFormat:@"https://%@",urlString];
    NSURL*url = [NSURL URLWithString:urlString];
    [[UIApplication sharedApplication] openURL:url options:@{} completionHandler:^(BOOL success) {
      if (success) {
        resolve(@"https success");
      }else{
        resolve(@"https fail");
      }
    }];
  }
}

RCT_EXPORT_METHOD(jumpAppStore:(NSString *)appleId withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)
{
  NSString *urlString = [NSString stringWithFormat:@"itms-apps://itunes.apple.com/app/id%@", appleId];
  NSURL *url = [NSURL URLWithString:urlString];
  [[UIApplication sharedApplication]openURL:url options:@{UIApplicationOpenURLOptionsSourceApplicationKey:@YES} completionHandler:^(BOOL success) {
    if (success) {
      resolve(@"appstore success");
    }else{
      resolve(@"appstore fail");
    }
  }];
}

RCT_REMAP_METHOD(isTestflight, resolver: (RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  NSURL *receiptURL = [[NSBundle mainBundle] appStoreReceiptURL];
  NSString *receiptURLString = [receiptURL path];
  BOOL isRunningTestFlightBeta =  ([receiptURLString rangeOfString:@"sandboxReceipt"].location != NSNotFound);
  if(isRunningTestFlightBeta) {
    NSString *thingToReturn = @"TESTFLIGHT";
    resolve(thingToReturn);
  } else {
    NSString *thingToReturn = @"PRODUCTION";
    resolve(thingToReturn);
  }
}

RCT_REMAP_METHOD(shake, shakeResolver: (RCTPromiseResolveBlock)resolve  shakeRejecter:(RCTPromiseRejectBlock)reject)
{
  AudioServicesPlaySystemSound(1519);
  NSString *shakeToReturn = @"shake";
  resolve(shakeToReturn);
}

@end
