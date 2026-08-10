import { Fragment, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { consumeTopOverlay, registerOverlay, unregisterOverlay } from '../utils/overlayStack';
import { deleteAllNotifications, deleteNotification, fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../api/notificationApi';
import './NotificationBell.css';

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
  : '';

const NotificationBell = () => {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);
  const bellWrapRef = useRef(null);
  const overlayIdRef = useRef(Symbol('notification'));

  const load = async () => {
    try {
      const result = await fetchNotifications();
      setNotifications((result?.items || []).slice(0, 5));
      setUnreadCount(result?.unreadCount || 0);
    } catch {
      // 로그인 직후 토큰 교체 중인 일시적인 조회 실패는 무시합니다.
    }
  };

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    load();
    const timer = window.setInterval(load, 30000);
    return () => window.clearInterval(timer);
  }, [isLoggedIn]);

  useEffect(() => {
    if (!open) return undefined;

    registerOverlay(overlayIdRef.current);

    const handleOutsidePointerDown = (event) => {
      if (!bellWrapRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape' && consumeTopOverlay(overlayIdRef.current)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleOutsidePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      unregisterOverlay(overlayIdRef.current);
      document.removeEventListener('pointerdown', handleOutsidePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markNotificationRead(notification.id).catch(() => {});
      setNotifications((current) => current.map((item) => (
        item.id === notification.id ? { ...item, read: true } : item
      )));
      setUnreadCount((count) => Math.max(0, count - 1));
    }
    setOpen(false);
    navigate(notification.link);
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead().catch(() => {});
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) {
      await deleteAllNotifications().catch(() => {});
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    await Promise.all(selectedIds.map((id) => deleteNotification(id).catch(() => {})));
    setNotifications((current) => current.filter((item) => !selectedIds.includes(item.id)));
    setSelectedIds([]);
    await load();
  };

  const toggleSelected = (notificationId) => {
    setSelectedIds((current) => current.includes(notificationId)
      ? current.filter((id) => id !== notificationId)
      : [...current, notificationId]);
  };

  const orderedNotifications = [...notifications].sort((left, right) => (
    Number(left.read) - Number(right.read)
  ));

  if (!isLoggedIn) return null;

  return (
    <div ref={bellWrapRef} className="notification-bell-wrap">
      <button type="button" className="notification-bell" aria-label={`알림${unreadCount ? ` ${unreadCount}개 읽지 않음` : ''}`} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
        {unreadCount > 0 && <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>
      {open && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <strong>알림</strong>
            <div className="notification-panel-actions">
              <button type="button" onClick={handleMarkAllRead}>모두 읽음</button>
              <button type="button" onClick={handleDelete}>{selectedIds.length ? '선택 삭제' : '전체 삭제'}</button>
            </div>
          </div>
          {notifications.length === 0 ? <p className="notification-empty">새로운 알림이 없습니다.</p> : (
            <div className="notification-list">
              {orderedNotifications.map((notification, index) => (
                <Fragment key={notification.id}>
                {notification.read && !orderedNotifications[index - 1]?.read && <div className="notification-read-divider" aria-hidden="true"><span>읽은 알림</span></div>}
                <div key={notification.id} className={`notification-item${notification.read ? '' : ' unread'}`}>
                  <button type="button" className="notification-item-content" onClick={() => handleNotificationClick(notification)}>
                    <strong><span className={`notification-status-dot${notification.read ? ' read' : ''}`} aria-label={notification.read ? '읽은 알림' : '읽지 않은 알림'} />{notification.title}</strong><span>{notification.message}</span><small>{formatDate(notification.createdAt)}</small>
                  </button>
                  <input type="checkbox" checked={selectedIds.includes(notification.id)} onChange={() => toggleSelected(notification.id)} aria-label={`${notification.title} 선택`} />
                </div>
                </Fragment>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
