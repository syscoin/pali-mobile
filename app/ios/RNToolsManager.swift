
@objc(RNToolsManager)
class RNToolsManager: NSObject {
  @objc(decryptBase64:withSecret:withResolver:withRejecter:)
  func decryptBase64(content: NSString, withKey secretKey: NSString, resolve:RCTPromiseResolveBlock,reject:RCTPromiseRejectBlock) -> Void {
    let encryptString:String = Constants.decryptBase64(data: content as String, key: secretKey as String)
      resolve(encryptString)
  }

  @objc(decrypt:withSecret:withResolver:withRejecter:)
  func decrypt(content: NSString, withKey secretKey: NSString, resolve:RCTPromiseResolveBlock,reject:RCTPromiseRejectBlock) -> Void {
    let encryptString:String = Constants.decrypt(data: content as String, key: secretKey as String)
      resolve(encryptString)
  }

  @objc(encryptBase64:withSecret:withResolver:withRejecter:)
  func encryptBase64(content: NSString, withKey secretKey: NSString, resolve:RCTPromiseResolveBlock,reject:RCTPromiseRejectBlock) -> Void {
    let encryptString:String = Constants.encryptBase64(data: content as String, key: secretKey as String)
      resolve(encryptString)
  }

  @objc(encrypt:withSecret:withResolver:withRejecter:)
  func encrypt(content: NSString, withKey secretKey: NSString, resolve:RCTPromiseResolveBlock,reject:RCTPromiseRejectBlock) -> Void {
    let encryptString:String = Constants.encrypt(data: content as String, key: secretKey as String)
      resolve(encryptString)
  }
}

