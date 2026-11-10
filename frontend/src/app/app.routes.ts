import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { Dashboard } from './pages/dashboard/dashboard';
import { Login } from './pages/login/login';
import { Productos } from './pages/productos/productos';
import { Pedidos } from './pages/pedidos/pedidos';
import { Tienda } from './pages/tienda/tienda';
import { Categoria } from './pages/categoria/categoria';
import { ProductoDetalle } from './pages/producto/producto';
import { Checkout } from './pages/checkout/checkout';

export const routes: Routes = [
  { path: '', component: Login },
  { path: 'dashboard', component: Dashboard, canActivate: [adminGuard] },
  { path: 'productos', component: Productos, canActivate: [adminGuard] },
  { path: 'pedidos', component: Pedidos, canActivate: [adminGuard] },
  { path: 'tienda', component: Tienda, canActivate: [authGuard] },
  { path: 'tienda/categoria/:categoria', component: Categoria, canActivate: [authGuard] },
  { path: 'producto/:id', component: ProductoDetalle, canActivate: [authGuard] },
  { path: 'checkout', component: Checkout, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];