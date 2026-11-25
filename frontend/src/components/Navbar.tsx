import type { AppUser } from '../lib/db';
import type { AppRoute } from '../utils/router';

interface NavbarProps {
  user: AppUser;
  currentPage: AppRoute['page'];
  onNavigate: (route: AppRoute) => void;
  onLogout: () => void;
}

export function Navbar({ user, currentPage, onNavigate, onLogout }: NavbarProps) {
  return (
    <header className="navbar">
      <div className="navbar-container">
        <div
          className="nav-brand"
          onClick={() => onNavigate({ page: 'inventory' })}
          style={{ cursor: 'pointer' }}
        >
          <div className="nav-brand-icon">🫁</div>
          <div>
            RED<span className="nav-brand-highlight">EST</span>
          </div>
        </div>

        <nav className="nav-links">
          <button
            className={`nav-btn ${currentPage === 'inventory' || currentPage === 'item-detail' ? 'active' : ''}`}
            onClick={() => onNavigate({ page: 'inventory' })}
          >
            📦 สินค้าทั้งหมด
          </button>

          <button
            className={`nav-btn ${currentPage === 'my-borrowings' ? 'active' : ''}`}
            onClick={() => onNavigate({ page: 'my-borrowings' })}
          >
            📜 ประวัติของฉัน
          </button>

          {user.role === 'admin' && (
            <button
              className={`nav-btn ${currentPage === 'admin' ? 'active' : ''}`}
              onClick={() => onNavigate({ page: 'admin' })}
            >
              🛡️ แดชบอร์ดแอดมิน
            </button>
          )}

          <div className="user-profile-badge">
            <div className="user-avatar">{user.displayName.charAt(0).toUpperCase()}</div>
            <div className="user-info-text">
              <span className="user-name">{user.displayName}</span>
              <span className={`role-tag ${user.role}`}>{user.role}</span>
            </div>
            <button className="logout-btn" onClick={onLogout}>
              ออก
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
