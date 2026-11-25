export type AppRoute =
  | { page: 'login' }
  | { page: 'inventory' }
  | { page: 'item-detail'; itemId: string }
  | { page: 'my-borrowings' }
  | { page: 'admin' };

export function parseHashRoute(hash = window.location.hash): AppRoute {
  const path = hash.replace(/^#/, '') || '/';
  if (path === '/login') return { page: 'login' };
  if (path === '/my-borrowings') return { page: 'my-borrowings' };
  if (path === '/admin') return { page: 'admin' };
  if (path.startsWith('/items/')) {
    const itemId = decodeURIComponent(path.slice('/items/'.length));
    if (itemId) return { page: 'item-detail', itemId };
  }
  return { page: 'inventory' };
}

export function routeToHash(route: AppRoute): string {
  switch (route.page) {
    case 'login':
      return '#/login';
    case 'inventory':
      return '#/inventory';
    case 'item-detail':
      return `#/items/${encodeURIComponent(route.itemId)}`;
    case 'my-borrowings':
      return '#/my-borrowings';
    case 'admin':
      return '#/admin';
  }
}

export function navigateTo(route: AppRoute): void {
  const nextHash = routeToHash(route);
  if (window.location.hash !== nextHash) {
    window.location.hash = nextHash;
  }
}
