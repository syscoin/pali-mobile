
import Foundation
import CommonCrypto
import CryptoSwift
struct Constants {
  static func decryptBase64(data: String, key:String) -> String {
    do {
      let decodedData = Data(base64Encoded: data)!.bytes
      let ivData = decodedData[0...15];
      let valueData = decodedData[16..<decodedData.count]
      let decrypted = try AES(key: key.bytes, blockMode: CBC(iv: Array(ivData)), padding: .pkcs5).decrypt(valueData)
      let decryptStr = String(bytes: Data(decrypted).bytes, encoding: .utf8)
      return decryptStr!;
    } catch {
    }
    return "";
  }

  static func decrypt(data: String, key:String) -> String {
    do {
      let decodedData = data.bytes
      let ivData = decodedData[0...15];
      let valueData = decodedData[16..<decodedData.count]
      let decrypted = try AES(key: key.bytes, blockMode: CBC(iv: Array(ivData)), padding: .pkcs5).decrypt(valueData)
      let decryptStr = String(bytes: Data(decrypted).bytes, encoding: .utf8)
      return decryptStr!;
    } catch {
    }
    return "";
  }

  static func encrypt(data: String, key:String) -> String {
    do {
      let contentBytes: Array<UInt8> = data.data(using: .utf8)!.bytes
      let secretKeyData = key.data(using: String.Encoding.utf8)
      let secretKeyDataBytes: Array<UInt8> = secretKeyData!.bytes
      let ivData: Array<UInt8> = secretKeyDataBytes.md5()
      let encrypted: Array<UInt8> = try AES(key: secretKeyDataBytes, blockMode: CBC(iv: ivData), padding: .pkcs5).encrypt(contentBytes)
      let sendData = ivData + encrypted
      return sendData.toBase64();
    } catch {
    }
    return "";
  }

  static func encryptBase64(data: String, key:String) -> String {
    do {
      let contentBytes: Array<UInt8> = Data(base64Encoded: data)!.bytes
      let secretKeyData = key.data(using: String.Encoding.utf8)
      let secretKeyDataBytes: Array<UInt8> = secretKeyData!.bytes
      let ivData: Array<UInt8> = secretKeyDataBytes.md5()
      let encrypted: Array<UInt8> = try AES(key: secretKeyDataBytes, blockMode: CBC(iv: ivData), padding: .pkcs5).encrypt(contentBytes)
      let sendData = ivData + encrypted
      return sendData.toBase64();
    } catch {
    }
    return "";
  }
}

