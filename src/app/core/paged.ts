/** La envoltura que PagedModel<T> serializa. Es la misma en los diez modulos. */
export interface PageMetadata {
  size: number;
  number: number;
  total_elements: number;
  total_pages: number;
}

export interface Paged<T> {
  content: T[];
  page: PageMetadata;
}
