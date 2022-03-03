
package io.gopocket.utils;

import java.security.InvalidAlgorithmParameterException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;

import javax.crypto.BadPaddingException;
import javax.crypto.Cipher;
import javax.crypto.IllegalBlockSizeException;
import javax.crypto.NoSuchPaddingException;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;

public class CryptUtil {

    public static final String AES_ECB = "AES/ECB/PKCS5Padding";
    public static final String AES_CBC = "AES/CBC/PKCS5Padding";

	public static byte[] decrypt(byte[] content, String key)
		throws NoSuchAlgorithmException, NoSuchPaddingException, InvalidKeyException,
		IllegalBlockSizeException, BadPaddingException, InvalidAlgorithmParameterException {
		return decrypt(content, key, AES_CBC);
	}

    public static byte[] decrypt(byte[] content, String key, String algo)
            throws NoSuchAlgorithmException, NoSuchPaddingException, InvalidKeyException,
            IllegalBlockSizeException, BadPaddingException, InvalidAlgorithmParameterException {
        Cipher cipherEnc = Cipher.getInstance(algo);
        SecretKeySpec keySpec = new SecretKeySpec(key.getBytes(), "AES");
        if (AES_ECB.equals(algo)) {
            cipherEnc.init(Cipher.DECRYPT_MODE, keySpec);
            return cipherEnc.doFinal(content);
        } else {
            if (content.length < 16) {
                throw new IllegalBlockSizeException("crypted data size error");
            }
            byte[] ivParam = new byte[16];
            System.arraycopy(content, 0, ivParam, 0, ivParam.length);
            IvParameterSpec iv = new IvParameterSpec(ivParam);
            cipherEnc.init(Cipher.DECRYPT_MODE, keySpec, iv);

            byte[] data = new byte[content.length - ivParam.length];
            System.arraycopy(content, ivParam.length, data, 0, content.length - ivParam.length);
            return cipherEnc.doFinal(data);
        }
    }

    public static byte[] encrypt(byte[] content, String key) throws NoSuchPaddingException,
            NoSuchAlgorithmException, InvalidAlgorithmParameterException,
            InvalidKeyException, BadPaddingException, IllegalBlockSizeException {
        return encrypt(content, key, AES_CBC);
    }

    public static byte[] encrypt(byte[] content, String key, String algo)
            throws NoSuchPaddingException, NoSuchAlgorithmException,
            InvalidAlgorithmParameterException,
            InvalidKeyException, BadPaddingException, IllegalBlockSizeException {
        Cipher cipherEnc = Cipher.getInstance(algo);
        SecretKeySpec keySpec = new SecretKeySpec(key.getBytes(), "AES");
        cipherEnc.init(Cipher.ENCRYPT_MODE, keySpec);
        byte[] data = cipherEnc.doFinal(content);
        if (AES_ECB.equals(algo)) {
            return data;
        } else {
            byte[] iv = cipherEnc.getIV();
            byte[] ret = new byte[iv.length + data.length];
            System.arraycopy(iv, 0, ret, 0, iv.length);
            System.arraycopy(data, 0, ret, iv.length, data.length);
            return ret;
        }
    }
}
