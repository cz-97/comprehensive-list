import { pinyin } from "pinyin-pro";

export interface PinyinEntry {
    /** 全拼，无空格小写，如 "shenzhenjiaotong" */
    full: string;
    /** 首字母，无空格小写，如 "szjt" */
    initials: string;
}

/**
 * 把一段文本转换为拼音索引（全拼 + 首字母）。
 * 非中文（英文/数字）会原样按字符拼接，因此可直接用于混合内容。
 */
export function buildPinyinIndex(text: string): PinyinEntry {
    const t = (text ?? "").toLowerCase();
    return {
        full: pinyin(t, { toneType: "none" }).replace(/\s+/g, ""),
        initials: pinyin(t, { pattern: "first", toneType: "none" }).replace(/\s+/g, ""),
    };
}

/**
 * 判断关键字是否匹配。
 * 依次尝试：普通子串、全拼子串、首字母子串。
 * @param k        用户输入关键字（已转小写、去空格）
 * @param haystacks 原始文本字段（标题等）
 * @param pinyinIdx 这些字段聚合后的拼音索引（可为 null 表示无索引）
 */
export function matchesKeyword(
    k: string,
    haystacks: (string | null)[],
    pinyinIdx: PinyinEntry | null,
): boolean {
    for (const h of haystacks) {
        if ((h ?? "").toLowerCase().includes(k)) return true;
    }
    if (pinyinIdx) {
        if (pinyinIdx.full.includes(k)) return true;
        const kInitials = buildPinyinIndex(k).initials;
        if (kInitials && pinyinIdx.initials.includes(kInitials)) return true;
    }
    return false;
}
