// PRD §5.3 — ESC 확인 모달.
// Dopamine Mode 베이스(다크) 위에 떠 있는 시트. 진행 중인 게임을 잃을 수 있음을 알리고 확인.

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ConfirmModal({ open, onConfirm, onCancel, title, message }) {
  // 모달이 열려 있을 때 ESC 한 번 더 누르면 취소(닫기), Enter로 확정
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      } else if (e.key === 'Enter') {
        e.stopPropagation();
        onConfirm();
      }
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onConfirm, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-dark-base/80 backdrop-blur-sm px-xxl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
        >
          <motion.div
            initial={{ y: 20, scale: 0.96 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-dark-elevated border border-on-dark/15 rounded-lg p-xxl max-w-[440px] w-full"
          >
            <h2
              id="confirm-modal-title"
              className="text-title-lg font-medium text-on-dark mb-sm"
            >
              {title}
            </h2>
            <p className="text-body-md text-on-dark/70 mb-xl">{message}</p>
            <div className="flex gap-sm justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="px-md py-sm rounded-lg border border-on-dark/30 text-on-dark text-button font-medium hover:bg-on-dark/10 transition-colors focus:outline-none focus-visible:shadow-focus-ring"
                autoFocus
              >
                취소
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="px-md py-sm rounded-lg bg-canvas text-ink text-button font-medium hover:bg-surface-soft transition-colors focus:outline-none focus-visible:shadow-focus-ring"
              >
                확인
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
