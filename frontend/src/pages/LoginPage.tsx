interface LoginPageProps {
  loading: boolean;
  onGoogleLogin: () => void;
}

export function LoginPage({ loading, onGoogleLogin }: LoginPageProps) {
  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-icon">🫁</div>
        <h2 className="login-title">ระบบยืม-คืนพัสดุ</h2>
        <p className="login-subtitle">กรุณาเลือกรูปแบบเพื่อเข้าสู่ระบบการยืม-คืน</p>

        <div className="firebase-login-section" style={{ marginBottom: '16px' }}>
          <button
            className="login-action-btn google-btn"
            onClick={onGoogleLogin}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              width: '100%',
              padding: '12px',
              background: '#4285F4',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '15px',
              cursor: 'pointer',
              transition: 'background 0.2s',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#357ae8')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#4285F4')}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M17.64 9.20455C17.64 8.56364 17.5827 7.94727 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z"
                fill="white"
              />
              <path
                d="M9 18C11.43 18 13.4673 17.1941 14.9577 15.8195L12.0491 13.5614C11.2418 14.1027 10.2109 14.4273 9 14.4273C6.65591 14.4273 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z"
                fill="white"
              />
              <path
                d="M3.96409 10.71C3.78409 10.17 3.68182 9.59727 3.68182 9C3.68182 8.40273 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z"
                fill="white"
              />
              <path
                d="M9 3.57273C10.3214 3.57273 11.5077 4.02955 12.4405 4.92136L15.0218 2.34C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57273 9 3.57273Z"
                fill="white"
              />
            </svg>
            <span>🔥 เข้าสู่ระบบผ่าน Google (ระบบจริง)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
