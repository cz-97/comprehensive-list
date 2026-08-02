// File: scripts/zip.ts
// 使用 bun 原生 API（Bun.file / Bun.write / Bun.Glob）打包 dist 目录为 dist.zip。
// 运行：bun run scripts/zip.ts
import { deflateRawSync } from "node:zlib";

const SRC_DIR = "dist";
const OUT_FILE = "dist/dist.zip";

// ZIP 常量
const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c >>> 0;
    }
    return t;
})();

function crc32(buf: Uint8Array): number {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(d = new Date()) {
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    return { time, date };
}

// 用 bun 的 Glob 递归收集 dist 下所有文件（跳过输出文件自身），相对路径 -> Uint8Array
async function collectFiles(): Promise<Map<string, Uint8Array>> {
    const out = new Map<string, Uint8Array>();
    for (const path of new Bun.Glob("**/*").scanSync({ cwd: SRC_DIR })) {
        const abs = `${SRC_DIR}/${path}`;
        if (path === OUT_FILE.replace(/^dist[\\/]/, "") || path.endsWith("/")) continue;
        const file = Bun.file(abs);
        if (await file.exists()) out.set(path, new Uint8Array(await file.arrayBuffer()));
    }
    return out;
}

function buildZip(files: Map<string, Uint8Array>): Uint8Array {
    const method = 8; // DEFLATE
    const { time, date } = dosDateTime();
    const localParts: Uint8Array[] = [];
    const centralParts: Uint8Array[] = [];
    let offset = 0;

    for (const [name, data] of files) {
        const nameBuf = Buffer.from(name, "utf-8");
        const comp = deflateRawSync(data);
        const crc = crc32(data);
        const localHeaderLen = 30 + nameBuf.length;

        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0); // local file header signature
        local.writeUInt16LE(20, 4); // version needed
        local.writeUInt16LE(0x0800, 6); // flags: UTF-8
        local.writeUInt16LE(method, 8);
        local.writeUInt16LE(time, 10);
        local.writeUInt16LE(date, 12);
        local.writeUInt32LE(crc, 14);
        local.writeUInt32LE(comp.length, 18); // compressed size
        local.writeUInt32LE(data.length, 22); // uncompressed size
        local.writeUInt16LE(nameBuf.length, 26);
        local.writeUInt16LE(0, 28); // extra length
        localParts.push(Buffer.concat([local, nameBuf, comp]));

        const central = Buffer.alloc(46);
        central.writeUInt32LE(0x02014b50, 0); // central directory header signature
        central.writeUInt16LE(20, 4); // version made by
        central.writeUInt16LE(20, 6); // version needed
        central.writeUInt16LE(0x0800, 8); // flags
        central.writeUInt16LE(method, 10);
        central.writeUInt16LE(time, 12);
        central.writeUInt16LE(date, 14);
        central.writeUInt32LE(crc, 16);
        central.writeUInt32LE(comp.length, 20);
        central.writeUInt32LE(data.length, 24);
        central.writeUInt16LE(nameBuf.length, 28);
        central.writeUInt16LE(0, 30); // extra length
        central.writeUInt16LE(0, 32); // comment length
        central.writeUInt16LE(0, 34); // disk number
        central.writeUInt16LE(0, 36); // internal attrs
        central.writeUInt32LE(0x20, 38); // external attrs: archive
        central.writeUInt32LE(offset, 42); // local header offset
        centralParts.push(Buffer.concat([central, nameBuf]));
        offset += localHeaderLen + comp.length;
    }

    const centralDir = Buffer.concat(centralParts);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0); // end of central directory signature
    end.writeUInt16LE(0, 4); // disk number
    end.writeUInt16LE(0, 6); // disk with central dir
    end.writeUInt16LE(files.size, 8); // entries on this disk
    end.writeUInt16LE(files.size, 10); // total entries
    end.writeUInt32LE(centralDir.length, 12); // central dir size
    end.writeUInt32LE(offset, 16); // central dir offset
    end.writeUInt16LE(0, 20); // comment length

    return Buffer.concat([...localParts, centralDir, end]);
}

const files = await collectFiles();
const zip = buildZip(files);
// bun 原生写文件，返回写入字节数
await Bun.write(OUT_FILE, zip);
console.log(`✅ 已打包 ${files.size} 个文件 -> ${OUT_FILE}`);
