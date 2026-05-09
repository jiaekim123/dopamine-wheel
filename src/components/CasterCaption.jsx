// PRD §7.3a (1) — 캐스터 캡션.
// 좌하단 1줄 자막. 사운드 무음 정책의 시각 보완.
// 트리거 기반: 호출자가 setMessage(text)로 큐에 메시지를 보내면 0.3s 페이드 인/아웃으로 노출.

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * @param {{message: string|null, holdMs?: number}} props — message가 변경될 때마다 새 캡션 표시.
 *   holdMs: 기본 2400ms. 시간 지나면 자동 사라짐 (외부에서 message=null로 명시 가능).
 */
export default function CasterCaption({ message, holdMs = 2400 }) {
  const [active, setActive] = useState(null); // {text, key}
  const [keyCounter, setKeyCounter] = useState(0);

  useEffect(() => {
    if (!message) return;
    const next = { text: message, key: keyCounter + 1 };
    setActive(next);
    setKeyCounter(next.key);
    const t = setTimeout(() => {
      setActive((a) => (a && a.key === next.key ? null : a));
    }, holdMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  return (
    <div className="absolute left-xxl bottom-xxl pointer-events-none z-10">
      <AnimatePresence>
        {active && (
          <motion.div
            key={active.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="text-on-dark text-caption font-medium px-md py-xs rounded-md"
            style={{
              backgroundColor: 'rgba(13, 18, 24, 0.78)',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              maxWidth: '480px',
            }}
            aria-live="polite"
          >
            {active.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
