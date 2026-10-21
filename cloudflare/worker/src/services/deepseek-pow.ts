/**
 * DeepSeekHashV1 and PoW solver implementation in pure TypeScript.
 * Ported from CJackHwang/ds2api (Go/WASM) with 100% native Cloudflare Worker compatibility.
 * DeepSeekHashV1 = Keccak-f[1600] / SHA3-256 skipping round 0 (executes rounds 1..23).
 */

export interface DeepSeekChallenge {
    algorithm: string;
    challenge: string;
    salt: string;
    expire_at: number;
    difficulty: number;
    signature: string;
    target_path: string;
}

const MASK64 = 0xFFFFFFFFFFFFFFFFn;

const RC: bigint[] = [
    0x0000000000000001n, 0x0000000000008082n, 0x800000000000808An, 0x8000000080008000n,
    0x000000000000808Bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
    0x000000000000008An, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000An,
    0x000000008000808Bn, 0x800000000000008Bn, 0x8000000000008089n, 0x8000000000008003n,
    0x8000000000008002n, 0x8000000000000080n, 0x000000000000800An, 0x800000008000000An,
    0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
];

function rotl64(v: bigint, k: bigint): bigint {
    return ((v << k) | (v >> (64n - k))) & MASK64;
}

function keccakF23(s: BigUint64Array): void {
    let a0 = s[0], a1 = s[1], a2 = s[2], a3 = s[3], a4 = s[4];
    let a5 = s[5], a6 = s[6], a7 = s[7], a8 = s[8], a9 = s[9];
    let a10 = s[10], a11 = s[11], a12 = s[12], a13 = s[13], a14 = s[14];
    let a15 = s[15], a16 = s[16], a17 = s[17], a18 = s[18], a19 = s[19];
    let a20 = s[20], a21 = s[21], a22 = s[22], a23 = s[23], a24 = s[24];

    // Rounds 1 through 23 (skip round 0)
    for (let r = 1; r < 24; r++) {
        const c0 = a0 ^ a5 ^ a10 ^ a15 ^ a20;
        const c1 = a1 ^ a6 ^ a11 ^ a16 ^ a21;
        const c2 = a2 ^ a7 ^ a12 ^ a17 ^ a22;
        const c3 = a3 ^ a8 ^ a13 ^ a18 ^ a23;
        const c4 = a4 ^ a9 ^ a14 ^ a19 ^ a24;

        const d0 = c4 ^ rotl64(c1, 1n);
        const d1 = c0 ^ rotl64(c2, 1n);
        const d2 = c1 ^ rotl64(c3, 1n);
        const d3 = c2 ^ rotl64(c4, 1n);
        const d4 = c3 ^ rotl64(c0, 1n);

        a0 ^= d0; a5 ^= d0; a10 ^= d0; a15 ^= d0; a20 ^= d0;
        a1 ^= d1; a6 ^= d1; a11 ^= d1; a16 ^= d1; a21 ^= d1;
        a2 ^= d2; a7 ^= d2; a12 ^= d2; a17 ^= d2; a22 ^= d2;
        a3 ^= d3; a8 ^= d3; a13 ^= d3; a18 ^= d3; a23 ^= d3;
        a4 ^= d4; a9 ^= d4; a14 ^= d4; a19 ^= d4; a24 ^= d4;

        const b0 = a0;
        const b10 = rotl64(a1, 1n);
        const b20 = rotl64(a2, 62n);
        const b5 = rotl64(a3, 28n);
        const b15 = rotl64(a4, 27n);
        const b16 = rotl64(a5, 36n);
        const b1 = rotl64(a6, 44n);
        const b11 = rotl64(a7, 6n);
        const b21 = rotl64(a8, 55n);
        const b6 = rotl64(a9, 20n);
        const b7 = rotl64(a10, 3n);
        const b17 = rotl64(a11, 10n);
        const b2 = rotl64(a12, 43n);
        const b12 = rotl64(a13, 25n);
        const b22 = rotl64(a14, 39n);
        const b23 = rotl64(a15, 41n);
        const b8 = rotl64(a16, 45n);
        const b18 = rotl64(a17, 15n);
        const b3 = rotl64(a18, 21n);
        const b13 = rotl64(a19, 8n);
        const b14 = rotl64(a20, 18n);
        const b24 = rotl64(a21, 2n);
        const b9 = rotl64(a22, 61n);
        const b19 = rotl64(a23, 56n);
        const b4 = rotl64(a24, 14n);

        a0 = b0 ^ ((~b1 & MASK64) & b2);
        a1 = b1 ^ ((~b2 & MASK64) & b3);
        a2 = b2 ^ ((~b3 & MASK64) & b4);
        a3 = b3 ^ ((~b4 & MASK64) & b0);
        a4 = b4 ^ ((~b0 & MASK64) & b1);
        a5 = b5 ^ ((~b6 & MASK64) & b7);
        a6 = b6 ^ ((~b7 & MASK64) & b8);
        a7 = b7 ^ ((~b8 & MASK64) & b9);
        a8 = b8 ^ ((~b9 & MASK64) & b5);
        a9 = b9 ^ ((~b5 & MASK64) & b6);
        a10 = b10 ^ ((~b11 & MASK64) & b12);
        a11 = b11 ^ ((~b12 & MASK64) & b13);
        a12 = b12 ^ ((~b13 & MASK64) & b14);
        a13 = b13 ^ ((~b14 & MASK64) & b10);
        a14 = b14 ^ ((~b10 & MASK64) & b11);
        a15 = b15 ^ ((~b16 & MASK64) & b17);
        a16 = b16 ^ ((~b17 & MASK64) & b18);
        a17 = b17 ^ ((~b18 & MASK64) & b19);
        a18 = b18 ^ ((~b19 & MASK64) & b15);
        a19 = b19 ^ ((~b15 & MASK64) & b16);
        a20 = b20 ^ ((~b21 & MASK64) & b22);
        a21 = b21 ^ ((~b22 & MASK64) & b23);
        a22 = b22 ^ ((~b23 & MASK64) & b24);
        a23 = b23 ^ ((~b24 & MASK64) & b20);
        a24 = b24 ^ ((~b20 & MASK64) & b21);

        a0 ^= RC[r];
    }

    s[0] = a0; s[1] = a1; s[2] = a2; s[3] = a3; s[4] = a4;
    s[5] = a5; s[6] = a6; s[7] = a7; s[8] = a8; s[9] = a9;
    s[10] = a10; s[11] = a11; s[12] = a12; s[13] = a13; s[14] = a14;
    s[15] = a15; s[16] = a16; s[17] = a17; s[18] = a18; s[19] = a19;
    s[20] = a20; s[21] = a21; s[22] = a22; s[23] = a23; s[24] = a24;
}

function readUint64LE(buf: Uint8Array, offset: number): bigint {
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    return view.getBigUint64(offset, true);
}

function writeUint64LE(buf: Uint8Array, offset: number, val: bigint): void {
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    view.setBigUint64(offset, val, true);
}

/**
 * DeepSeekHashV1 returns 32-byte digest of data.
 */
export function deepSeekHashV1(data: Uint8Array): Uint8Array {
    const rate = 136;
    const s = new BigUint64Array(25);

    let off = 0;
    while (off + rate <= data.length) {
        for (let i = 0; i < rate / 8; i++) {
            s[i] ^= readUint64LE(data, off + i * 8);
        }
        keccakF23(s);
        off += rate;
    }

    const finalBuf = new Uint8Array(rate);
    const rem = data.length - off;
    finalBuf.set(data.subarray(off), 0);
    finalBuf[rem] = 0x06;
    finalBuf[rate - 1] |= 0x80;

    for (let i = 0; i < rate / 8; i++) {
        s[i] ^= readUint64LE(finalBuf, i * 8);
    }
    keccakF23(s);

    const out = new Uint8Array(32);
    writeUint64LE(out, 0, s[0]);
    writeUint64LE(out, 8, s[1]);
    writeUint64LE(out, 16, s[2]);
    writeUint64LE(out, 24, s[3]);
    return out;
}

export function buildPrefix(salt: string, expireAt: number): string {
    return `${salt}_${expireAt}_`;
}

function hexToBytes(hex: string): Uint8Array {
    if (hex.length % 2 !== 0) throw new Error("Invalid hex length");
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

const RC_L = new Uint32Array([1,32898,32906,2147516416,32907,2147483649,2147516545,32777,138,136,2147516425,2147483658,2147516555,139,32905,32771,32770,128,32778,2147483658,2147516545,32896,2147483649,2147516424]);
const RC_H = new Uint32Array([0,0,2147483648,2147483648,0,0,2147483648,2147483648,0,0,0,0,0,2147483648,2147483648,2147483648,2147483648,2147483648,0,2147483648,2147483648,2147483648,0,2147483648]);

export function keccakF23_32(st: Uint32Array): void {
    let a0_l = st[0], a0_h = st[1], a1_l = st[2], a1_h = st[3], a2_l = st[4], a2_h = st[5], a3_l = st[6], a3_h = st[7], a4_l = st[8], a4_h = st[9];
    let a5_l = st[10], a5_h = st[11], a6_l = st[12], a6_h = st[13], a7_l = st[14], a7_h = st[15], a8_l = st[16], a8_h = st[17], a9_l = st[18], a9_h = st[19];
    let a10_l = st[20], a10_h = st[21], a11_l = st[22], a11_h = st[23], a12_l = st[24], a12_h = st[25], a13_l = st[26], a13_h = st[27], a14_l = st[28], a14_h = st[29];
    let a15_l = st[30], a15_h = st[31], a16_l = st[32], a16_h = st[33], a17_l = st[34], a17_h = st[35], a18_l = st[36], a18_h = st[37], a19_l = st[38], a19_h = st[39];
    let a20_l = st[40], a20_h = st[41], a21_l = st[42], a21_h = st[43], a22_l = st[44], a22_h = st[45], a23_l = st[46], a23_h = st[47], a24_l = st[48], a24_h = st[49];

    for (let r = 1; r < 24; r++) {
        const c0_l = a0_l ^ a5_l ^ a10_l ^ a15_l ^ a20_l;
        const c0_h = a0_h ^ a5_h ^ a10_h ^ a15_h ^ a20_h;
        const c1_l = a1_l ^ a6_l ^ a11_l ^ a16_l ^ a21_l;
        const c1_h = a1_h ^ a6_h ^ a11_h ^ a16_h ^ a21_h;
        const c2_l = a2_l ^ a7_l ^ a12_l ^ a17_l ^ a22_l;
        const c2_h = a2_h ^ a7_h ^ a12_h ^ a17_h ^ a22_h;
        const c3_l = a3_l ^ a8_l ^ a13_l ^ a18_l ^ a23_l;
        const c3_h = a3_h ^ a8_h ^ a13_h ^ a18_h ^ a23_h;
        const c4_l = a4_l ^ a9_l ^ a14_l ^ a19_l ^ a24_l;
        const c4_h = a4_h ^ a9_h ^ a14_h ^ a19_h ^ a24_h;

        const d0_l = c4_l ^ ((c1_l << 1) | (c1_h >>> 31));
        const d0_h = c4_h ^ ((c1_h << 1) | (c1_l >>> 31));
        const d1_l = c0_l ^ ((c2_l << 1) | (c2_h >>> 31));
        const d1_h = c0_h ^ ((c2_h << 1) | (c2_l >>> 31));
        const d2_l = c1_l ^ ((c3_l << 1) | (c3_h >>> 31));
        const d2_h = c1_h ^ ((c3_h << 1) | (c3_l >>> 31));
        const d3_l = c2_l ^ ((c4_l << 1) | (c4_h >>> 31));
        const d3_h = c2_h ^ ((c4_h << 1) | (c4_l >>> 31));
        const d4_l = c3_l ^ ((c0_l << 1) | (c0_h >>> 31));
        const d4_h = c3_h ^ ((c0_h << 1) | (c0_l >>> 31));

        a0_l ^= d0_l; a0_h ^= d0_h; a5_l ^= d0_l; a5_h ^= d0_h; a10_l ^= d0_l; a10_h ^= d0_h; a15_l ^= d0_l; a15_h ^= d0_h; a20_l ^= d0_l; a20_h ^= d0_h;
        a1_l ^= d1_l; a1_h ^= d1_h; a6_l ^= d1_l; a6_h ^= d1_h; a11_l ^= d1_l; a11_h ^= d1_h; a16_l ^= d1_l; a16_h ^= d1_h; a21_l ^= d1_l; a21_h ^= d1_h;
        a2_l ^= d2_l; a2_h ^= d2_h; a7_l ^= d2_l; a7_h ^= d2_h; a12_l ^= d2_l; a12_h ^= d2_h; a17_l ^= d2_l; a17_h ^= d2_h; a22_l ^= d2_l; a22_h ^= d2_h;
        a3_l ^= d3_l; a3_h ^= d3_h; a8_l ^= d3_l; a8_h ^= d3_h; a13_l ^= d3_l; a13_h ^= d3_h; a18_l ^= d3_l; a18_h ^= d3_h; a23_l ^= d3_l; a23_h ^= d3_h;
        a4_l ^= d4_l; a4_h ^= d4_h; a9_l ^= d4_l; a9_h ^= d4_h; a14_l ^= d4_l; a14_h ^= d4_h; a19_l ^= d4_l; a19_h ^= d4_h; a24_l ^= d4_l; a24_h ^= d4_h;

        const b0_l = a0_l, b0_h = a0_h;
        const b10_l = (a1_l << 1) | (a1_h >>> 31);
        const b10_h = (a1_h << 1) | (a1_l >>> 31);
        const b20_l = (a2_h << 30) | (a2_l >>> 2);
        const b20_h = (a2_l << 30) | (a2_h >>> 2);
        const b5_l = (a3_l << 28) | (a3_h >>> 4);
        const b5_h = (a3_h << 28) | (a3_l >>> 4);
        const b15_l = (a4_l << 27) | (a4_h >>> 5);
        const b15_h = (a4_h << 27) | (a4_l >>> 5);
        const b16_l = (a5_h << 4) | (a5_l >>> 28);
        const b16_h = (a5_l << 4) | (a5_h >>> 28);
        const b1_l = (a6_h << 12) | (a6_l >>> 20);
        const b1_h = (a6_l << 12) | (a6_h >>> 20);
        const b11_l = (a7_l << 6) | (a7_h >>> 26);
        const b11_h = (a7_h << 6) | (a7_l >>> 26);
        const b21_l = (a8_h << 23) | (a8_l >>> 9);
        const b21_h = (a8_l << 23) | (a8_h >>> 9);
        const b6_l = (a9_l << 20) | (a9_h >>> 12);
        const b6_h = (a9_h << 20) | (a9_l >>> 12);
        const b7_l = (a10_l << 3) | (a10_h >>> 29);
        const b7_h = (a10_h << 3) | (a10_l >>> 29);
        const b17_l = (a11_l << 10) | (a11_h >>> 22);
        const b17_h = (a11_h << 10) | (a11_l >>> 22);
        const b2_l = (a12_h << 11) | (a12_l >>> 21);
        const b2_h = (a12_l << 11) | (a12_h >>> 21);
        const b12_l = (a13_l << 25) | (a13_h >>> 7);
        const b12_h = (a13_h << 25) | (a13_l >>> 7);
        const b22_l = (a14_h << 7) | (a14_l >>> 25);
        const b22_h = (a14_l << 7) | (a14_h >>> 25);
        const b23_l = (a15_h << 9) | (a15_l >>> 23);
        const b23_h = (a15_l << 9) | (a15_h >>> 23);
        const b8_l = (a16_h << 13) | (a16_l >>> 19);
        const b8_h = (a16_l << 13) | (a16_h >>> 19);
        const b18_l = (a17_l << 15) | (a17_h >>> 17);
        const b18_h = (a17_h << 15) | (a17_l >>> 17);
        const b3_l = (a18_l << 21) | (a18_h >>> 11);
        const b3_h = (a18_h << 21) | (a18_l >>> 11);
        const b13_l = (a19_l << 8) | (a19_h >>> 24);
        const b13_h = (a19_h << 8) | (a19_l >>> 24);
        const b14_l = (a20_l << 18) | (a20_h >>> 14);
        const b14_h = (a20_h << 18) | (a20_l >>> 14);
        const b24_l = (a21_l << 2) | (a21_h >>> 30);
        const b24_h = (a21_h << 2) | (a21_l >>> 30);
        const b9_l = (a22_h << 29) | (a22_l >>> 3);
        const b9_h = (a22_l << 29) | (a22_h >>> 3);
        const b19_l = (a23_h << 24) | (a23_l >>> 8);
        const b19_h = (a23_l << 24) | (a23_h >>> 8);
        const b4_l = (a24_l << 14) | (a24_h >>> 18);
        const b4_h = (a24_h << 14) | (a24_l >>> 18);

        a0_l = b0_l ^ (~b1_l & b2_l);   a0_h = b0_h ^ (~b1_h & b2_h);
        a1_l = b1_l ^ (~b2_l & b3_l);   a1_h = b1_h ^ (~b2_h & b3_h);
        a2_l = b2_l ^ (~b3_l & b4_l);   a2_h = b2_h ^ (~b3_h & b4_h);
        a3_l = b3_l ^ (~b4_l & b0_l);   a3_h = b3_h ^ (~b4_h & b0_h);
        a4_l = b4_l ^ (~b0_l & b1_l);   a4_h = b4_h ^ (~b0_h & b1_h);

        a5_l = b5_l ^ (~b6_l & b7_l);   a5_h = b5_h ^ (~b6_h & b7_h);
        a6_l = b6_l ^ (~b7_l & b8_l);   a6_h = b6_h ^ (~b7_h & b8_h);
        a7_l = b7_l ^ (~b8_l & b9_l);   a7_h = b7_h ^ (~b8_h & b9_h);
        a8_l = b8_l ^ (~b9_l & b5_l);   a8_h = b8_h ^ (~b9_h & b5_h);
        a9_l = b9_l ^ (~b5_l & b6_l);   a9_h = b9_h ^ (~b5_h & b6_h);

        a10_l = b10_l ^ (~b11_l & b12_l); a10_h = b10_h ^ (~b11_h & b12_h);
        a11_l = b11_l ^ (~b12_l & b13_l); a11_h = b11_h ^ (~b12_h & b13_h);
        a12_l = b12_l ^ (~b13_l & b14_l); a12_h = b12_h ^ (~b13_h & b14_h);
        a13_l = b13_l ^ (~b14_l & b10_l); a13_h = b13_h ^ (~b14_h & b10_h);
        a14_l = b14_l ^ (~b10_l & b11_l); a14_h = b14_h ^ (~b10_h & b11_h);

        a15_l = b15_l ^ (~b16_l & b17_l); a15_h = b15_h ^ (~b16_h & b17_h);
        a16_l = b16_l ^ (~b17_l & b18_l); a16_h = b16_h ^ (~b17_h & b18_h);
        a17_l = b17_l ^ (~b18_l & b19_l); a17_h = b17_h ^ (~b18_h & b19_h);
        a18_l = b18_l ^ (~b19_l & b15_l); a18_h = b18_h ^ (~b19_h & b15_h);
        a19_l = b19_l ^ (~b15_l & b16_l); a19_h = b19_h ^ (~b15_h & b16_h);

        a20_l = b20_l ^ (~b21_l & b22_l); a20_h = b20_h ^ (~b21_h & b22_h);
        a21_l = b21_l ^ (~b22_l & b23_l); a21_h = b21_h ^ (~b22_h & b23_h);
        a22_l = b22_l ^ (~b23_l & b24_l); a22_h = b22_h ^ (~b23_h & b24_h);
        a23_l = b23_l ^ (~b24_l & b20_l); a23_h = b23_h ^ (~b24_h & b20_h);
        a24_l = b24_l ^ (~b20_l & b21_l); a24_h = b24_h ^ (~b20_h & b21_h);

        a0_l ^= RC_L[r];
        a0_h ^= RC_H[r];
    }

    st[0] = a0_l; st[1] = a0_h; st[2] = a1_l; st[3] = a1_h;
    st[4] = a2_l; st[5] = a2_h; st[6] = a3_l; st[7] = a3_h;
}

/**
 * Solves PoW challenge: finds nonce in [0, difficulty) such that
 * DeepSeekHashV1(prefix + nonce) == challenge.
 */
export function solvePow(
    challengeHex: string,
    salt: string,
    expireAt: number,
    difficulty: number,
    signal?: AbortSignal
): number {
    if (challengeHex.length !== 64) {
        throw new Error("pow: challenge must be 64 hex chars");
    }
    const encoder = new TextEncoder();
    const prefix = encoder.encode(buildPrefix(salt, expireAt));
    const rate = 136;

    // Fast path: prefix fits in single rate block with plenty of room for nonce (<126 bytes)
    if (prefix.length + 10 < rate) {
        const tailLen = prefix.length;
        const buf = new Uint8Array(rate);
        buf.set(prefix, 0);
        buf[rate - 1] = 0x80;
        const buf32 = new Uint32Array(buf.buffer);

        const targetBytes = hexToBytes(challengeHex);
        const targetView = new DataView(targetBytes.buffer, targetBytes.byteOffset, targetBytes.byteLength);
        const t0_l = targetView.getUint32(0, true);
        const t0_h = targetView.getUint32(4, true);
        const t1_l = targetView.getUint32(8, true);
        const t1_h = targetView.getUint32(12, true);
        const t2_l = targetView.getUint32(16, true);
        const t2_h = targetView.getUint32(20, true);
        const t3_l = targetView.getUint32(24, true);
        const t3_h = targetView.getUint32(28, true);

        const st = new Uint32Array(50);
        const wordCount = Math.ceil((tailLen + 10) / 4);

        for (let n = 0; n < difficulty; n++) {
            if ((n & 0xFFF) === 0 && signal?.aborted) {
                throw new Error("pow: aborted");
            }

            let temp = n;
            let numLen = 0;
            if (temp === 0) {
                buf[tailLen] = 48;
                numLen = 1;
            } else {
                let t = temp;
                while (t > 0) {
                    numLen++;
                    t = (t / 10) | 0;
                }
                let pos = tailLen + numLen - 1;
                t = temp;
                while (t > 0) {
                    buf[pos--] = 48 + (t % 10);
                    t = (t / 10) | 0;
                }
            }
            const totalTail = tailLen + numLen;
            buf[totalTail] = 0x06;

            st.fill(0);
            for (let i = 0; i < wordCount; i++) {
                st[i] = buf32[i];
            }
            st[33] = 0x80000000;

            keccakF23_32(st);

            if (st[0] === t0_l && st[1] === t0_h && st[2] === t1_l && st[3] === t1_h &&
                st[4] === t2_l && st[5] === t2_h && st[6] === t3_l && st[7] === t3_h) {
                return n;
            }

            buf[totalTail] = 0;
        }

        throw new Error("pow: no solution within difficulty");
    }

    // General fallback path for large multi-block prefixes
    const targetBytes = hexToBytes(challengeHex);
    const t0 = readUint64LE(targetBytes, 0);
    const t1 = readUint64LE(targetBytes, 8);
    const t2 = readUint64LE(targetBytes, 16);
    const t3 = readUint64LE(targetBytes, 24);

    const baseState = new BigUint64Array(25);
    let off = 0;
    while (off + rate <= prefix.length) {
        for (let i = 0; i < rate / 8; i++) {
            baseState[i] ^= readUint64LE(prefix, off + i * 8);
        }
        keccakF23(baseState);
        off += rate;
    }

    const tailLen = prefix.length - off;
    const tail = new Uint8Array(rate);
    tail.set(prefix.subarray(off), 0);

    const s = new BigUint64Array(25);
    const buf = new Uint8Array(rate);
    const buf2 = new Uint8Array(rate);

    for (let n = 0; n < difficulty; n++) {
        if ((n & 0x3FF) === 0 && signal?.aborted) {
            throw new Error("pow: aborted");
        }

        const numStr = n.toString();
        const numLen = numStr.length;
        const totalTail = tailLen + numLen;

        s.set(baseState);

        if (totalTail < rate) {
            buf.fill(0);
            buf.set(tail.subarray(0, tailLen), 0);
            for (let j = 0; j < numLen; j++) {
                buf[tailLen + j] = numStr.charCodeAt(j);
            }
            buf[totalTail] = 0x06;
            buf[rate - 1] |= 0x80;

            for (let i = 0; i < rate / 8; i++) {
                s[i] ^= readUint64LE(buf, i * 8);
            }
            keccakF23(s);
        } else {
            buf.fill(0);
            buf.set(tail.subarray(0, tailLen), 0);
            const copyFromNum1 = rate - tailLen;
            for (let j = 0; j < copyFromNum1; j++) {
                buf[tailLen + j] = numStr.charCodeAt(j);
            }
            for (let i = 0; i < rate / 8; i++) {
                s[i] ^= readUint64LE(buf, i * 8);
            }
            keccakF23(s);

            buf2.fill(0);
            const rem = totalTail - rate;
            for (let j = 0; j < rem; j++) {
                buf2[j] = numStr.charCodeAt(copyFromNum1 + j);
            }
            buf2[rem] = 0x06;
            buf2[rate - 1] |= 0x80;

            for (let i = 0; i < rate / 8; i++) {
                s[i] ^= readUint64LE(buf2, i * 8);
            }
            keccakF23(s);
        }

        if (s[0] === t0 && s[1] === t1 && s[2] === t2 && s[3] === t3) {
            return n;
        }
    }

    throw new Error("pow: no solution within difficulty");
}

/**
 * Builds base64-encoded JSON header string for x-ds-pow-response.
 */
export function buildPowHeader(c: DeepSeekChallenge, answer: number): string {
    const payload = {
        algorithm: c.algorithm,
        challenge: c.challenge,
        salt: c.salt,
        answer,
        signature: c.signature,
        target_path: c.target_path,
    };
    const jsonStr = JSON.stringify(payload);
    return btoa(unescape(encodeURIComponent(jsonStr)));
}

const powHeaderCache = new Map<string, { header: string; expireAt: number }>();

/**
 * End-to-end challenge to x-ds-pow-response header with in-memory caching.
 */
export function solveAndBuildHeader(c: DeepSeekChallenge, signal?: AbortSignal): string {
    if (c.algorithm !== "DeepSeekHashV1") {
        throw new Error(`pow: unsupported algorithm: ${c.algorithm}`);
    }

    const now = Date.now();
    const cacheKey = `${c.salt}_${c.signature}`;
    const cached = powHeaderCache.get(cacheKey);
    if (cached && cached.expireAt > now + 15000) {
        return cached.header;
    }

    const diff = c.difficulty || 144000;
    const answer = solvePow(c.challenge, c.salt, c.expire_at, diff, signal);
    const header = buildPowHeader(c, answer);
    const rawExpire = Number(c.expire_at);
    const expireAt = Number.isFinite(rawExpire) && rawExpire > 0 ? (rawExpire < 1e12 ? rawExpire * 1000 : rawExpire) : now + 300000;
    powHeaderCache.set(cacheKey, { header, expireAt });
    return header;
}

