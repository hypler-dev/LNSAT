export const LNSAT_CORE_VERSION = "0.1.0";

export const LNSAT_PRODUCT_NAME = "LNSAT";

export type ProductLifecycleStatus =
  | "foundation"
  | "active_development"
  | "release_candidate"
  | "supported"
  | "maintenance";

export const currentProductLifecycleStatus: ProductLifecycleStatus =
  "active_development";
