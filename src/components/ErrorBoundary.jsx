// 게임 lazy 로딩 또는 런타임 에러를 잡아 화면에 노출하는 ErrorBoundary.
// 없으면 React 18은 에러 발생 시 트리 전체를 unmount해 흰 화면이 된다.
//
// 사용 예: <ErrorBoundary> <PlayScreen /> </ErrorBoundary>
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // eslint-disable-next-line no-console
    console.error('[DopamineWheel] ErrorBoundary 캐치:', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      const { error, errorInfo } = this.state;
      return (
        <div className="fixed inset-0 z-[100] bg-casino-base text-casino-text overflow-auto p-lg">
          <div className="max-w-[720px] mx-auto pt-xxl">
            <h2 className="text-display-md font-medium mb-md" style={{ color: '#ff2d92' }}>
              ⚠ 화면 렌더링 오류
            </h2>
            <p className="text-body-md text-casino-text-soft mb-lg">
              아래 에러 메시지를 캡처해 보내주세요. 해당 정보로 원인을 빠르게 파악할 수 있습니다.
            </p>
            <pre
              className="text-caption font-marquee p-md rounded-md whitespace-pre-wrap break-all"
              style={{
                backgroundColor: '#1a1a2e',
                color: '#ffd700',
                border: '1px solid rgba(255, 45, 146, 0.3)',
                fontSize: '12px',
                maxHeight: '40vh',
                overflowY: 'auto',
              }}
            >
              {error?.name || 'Error'}: {error?.message || String(error)}
              {error?.stack ? `\n\n${error.stack}` : ''}
              {errorInfo?.componentStack ? `\n\n${errorInfo.componentStack}` : ''}
            </pre>
            <button
              type="button"
              onClick={() => {
                this.setState({ error: null, errorInfo: null });
                if (typeof window !== 'undefined') window.location.reload();
              }}
              className="mt-lg px-lg py-md rounded-lg text-button font-medium"
              style={{
                backgroundColor: '#00f5ff',
                color: '#0a0a0f',
                boxShadow: '0 0 20px rgba(0, 245, 255, 0.5)',
              }}
            >
              새로고침
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
