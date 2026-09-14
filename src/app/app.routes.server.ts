import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * El build de CI prerrenderiza, asi que un descuido aqui no rompe una pantalla: rompe
 * el despliegue de todo el equipo.
 *
 * REGLA: toda ruta con parametro (`:id`) necesita RenderMode.Client o un
 * getPrerenderParams, porque el build no puede saber que ids existen. Las pantallas
 * detras de authGuard son dependientes del usuario y no ganan nada prerrenderizadas.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: 'personal/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: 'inventario/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: 'clientes/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: 'menu/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: 'menu/:id/editar',
    renderMode: RenderMode.Client,
  },
  {
    path: 'menu/combos/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: 'reservas/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: 'restaurante/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
