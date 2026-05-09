// PRD §6.3 — 참가자 입력 파서
// - 구분자: 쉼표 / 줄바꿈 / 공백
// - multiplier syntax(`이름*N`)는 미지원: `*`는 일반 문자
// - 동명이인은 자동으로 `#1`, `#2` 접미
// - 이름당 최대 20자
// - 최대 인원 50명 (초과분은 무시)

import { nameToEmoji } from './emoji.js';

export const MAX_PARTICIPANTS = 50;
export const MAX_NAME_LENGTH = 20;

/**
 * 입력 textarea의 raw 문자열 → 정규화된 참가자 배열.
 * 반환: { participants: [{id, name, displayName, emoji, truncated}], dropped: number }
 *   participants.length는 MAX_PARTICIPANTS 이하 보장
 *   dropped는 초과로 잘려나간 인원 수
 */
export function parseParticipants(raw) {
  if (!raw || typeof raw !== 'string') {
    return { participants: [], dropped: 0 };
  }

  // 1. 구분자(쉼표·줄바꿈·공백)로 분리
  const tokens = raw
    .split(/[,\n\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (tokens.length === 0) {
    return { participants: [], dropped: 0 };
  }

  // 2. 각 이름 정규화 + 길이 제한
  //    연속 공백은 split 단계에서 이미 제거됨.
  const normalized = tokens.map((name) => {
    const truncated = name.length > MAX_NAME_LENGTH;
    const trimmed = truncated ? name.slice(0, MAX_NAME_LENGTH) : name;
    return { name: trimmed, truncated };
  });

  // 3. 50명 한도 적용
  const dropped = Math.max(0, normalized.length - MAX_PARTICIPANTS);
  const limited = normalized.slice(0, MAX_PARTICIPANTS);

  // 4. 동명이인 처리: 같은 이름이 2명 이상이면 #1, #2 접미
  const nameCount = new Map();
  for (const n of limited) {
    nameCount.set(n.name, (nameCount.get(n.name) || 0) + 1);
  }

  const seen = new Map(); // name -> next index
  const participants = limited.map((n, i) => {
    const total = nameCount.get(n.name);
    let displayName = n.name;
    if (total > 1) {
      const idx = (seen.get(n.name) || 0) + 1;
      seen.set(n.name, idx);
      displayName = `${n.name} #${idx}`;
    }
    return {
      id: `p-${i}-${displayName}`,
      name: n.name,
      displayName,
      emoji: nameToEmoji(displayName),
      truncated: n.truncated,
    };
  });

  return { participants, dropped };
}

/**
 * 당첨 방식 = 'custom'일 때 직접 입력값 검증.
 * input: "1, 5, 7" 같은 문자열
 * k: 당첨자 수, n: 참가자 수
 *
 * 반환: { ok, ranks?, error? }
 *   ok=true이면 ranks는 정렬된 정수 배열
 *   ok=false이면 error에 사용자에게 보여줄 메시지
 */
export function parseWinnerRanks(input, k, n) {
  if (!input || typeof input !== 'string' || input.trim().length === 0) {
    return { ok: false, error: `${k}개의 순위를 입력해주세요 (현재 0개)` };
  }

  // 숫자 외 문자는 입력 단계에서 무시될 예정. 여기서는 안전하게 한 번 더 필터.
  const tokens = input
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // 모든 토큰이 양의 정수인지 확인
  const ranks = [];
  for (const t of tokens) {
    if (!/^\d+$/.test(t)) {
      return { ok: false, error: `숫자만 입력해주세요 ('${t}')` };
    }
    ranks.push(parseInt(t, 10));
  }

  // 개수 확인
  if (ranks.length !== k) {
    return {
      ok: false,
      error: `${k}개의 순위를 입력해주세요 (현재 ${ranks.length}개)`,
    };
  }

  // 범위 확인
  for (const r of ranks) {
    if (r < 1 || r > n) {
      return {
        ok: false,
        error: `${r}등은 참가자 수(${n}명) 범위 밖이에요`,
      };
    }
  }

  // 중복 확인
  const set = new Set(ranks);
  if (set.size !== ranks.length) {
    // 어떤 값이 중복인지 찾기
    const seen = new Set();
    let dup = null;
    for (const r of ranks) {
      if (seen.has(r)) {
        dup = r;
        break;
      }
      seen.add(r);
    }
    return { ok: false, error: `중복된 순위가 있어요: ${dup}등` };
  }

  return { ok: true, ranks: [...ranks].sort((a, b) => a - b) };
}

/**
 * k 클램프: 1 ≤ k ≤ n-1 보장.
 * n < 2이면 k = 0 반환 (게임 비활성).
 */
export function clampK(k, n) {
  if (n < 2) return 0;
  if (k < 1) return 1;
  if (k >= n) return n - 1;
  return k;
}
