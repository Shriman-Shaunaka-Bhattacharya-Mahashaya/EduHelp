import crypto from 'crypto';

function makeRandomIv(): string {
    const str = '0123456789abcdefghijklmnopqrstuvwxyz';
    const result = [];
    for (let i = 0; i < 16; i++) {
        const r = Math.floor(Math.random() * str.length);
        result.push(str[r]);
    }
    return result.join('');
}

function determineAlgorithm(keyLen: number): string {
    switch (keyLen) {
        case 16:
            return 'aes-128-cbc';
        case 24:
            return 'aes-192-cbc';
        case 32:
            return 'aes-256-cbc';
    }
    throw new Error('Invalid key length: ' + keyLen);
}

function aesEncrypt(plainText: string, key: string, iv: string): string {
    const cipher = crypto.createCipheriv(determineAlgorithm(key.length), key, iv);
    cipher.setAutoPadding(true);
    const out = cipher.update(plainText, 'utf8', 'hex');
    const out2 = cipher.final('hex');
    return out + out2;
}

function makeNonce(): number {
    const min = -Math.pow(2, 31);
    const max = Math.pow(2, 31) - 1;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateToken04(appId: number, userId: string, secret: string, effectiveTimeInSeconds: number, payload: string): string {
    if (!appId || typeof appId !== 'number') {
        throw new Error('appId invalid');
    }
    if (!userId || typeof userId !== 'string') {
        throw new Error('userId invalid');
    }
    if (!secret || typeof secret !== 'string' || secret.length !== 32) {
        throw new Error('secret must be a 32 byte string');
    }
    if (!effectiveTimeInSeconds || typeof effectiveTimeInSeconds !== 'number') {
        throw new Error('effectiveTimeInSeconds invalid');
    }

    const createTime = Math.floor(new Date().getTime() / 1000);
    const tokenInfo = {
        app_id: appId,
        user_id: userId,
        nonce: makeNonce(),
        ctime: createTime,
        expire: createTime + effectiveTimeInSeconds,
        payload: payload || ''
    };
    const plainText = JSON.stringify(tokenInfo);
    
    const iv = makeRandomIv();
    
    const encryptBuf = Buffer.from(aesEncrypt(plainText, secret, iv), 'hex');
    
    const b1 = Buffer.alloc(8);
    const b2 = Buffer.alloc(2);
    const b3 = Buffer.alloc(2);
    
    b1.writeBigInt64BE(BigInt(tokenInfo.expire), 0);
    b2.writeUInt16BE(iv.length, 0);
    b3.writeUInt16BE(encryptBuf.length, 0);
    
    const buf = Buffer.concat([
        b1,
        b2,
        Buffer.from(iv),
        b3,
        Buffer.from(encryptBuf)
    ]);
    
    return '04' + buf.toString('base64');
}
