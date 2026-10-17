import { Observable } from "rxjs";

import { Urls } from "./environment.service";

/**
 * A user-managed self-hosted server entry.
 *
 * Unlike the compile-time cloud regions, these are created, edited and removed
 * by the end user at runtime and persisted in local application state.
 */
export interface CustomEnvironment {
  /** Stable unique identifier for this entry. */
  id: string;
  /** User supplied display name / identifier shown in the server selector. */
  label: string;
  /** Server URLs. Usually only `base` is required; the others are derived. */
  urls: Urls;
}

export abstract class CustomEnvironmentsService {
  /** Observable stream of the saved custom environments. */
  abstract customEnvironments$: Observable<CustomEnvironment[]>;

  /** Returns the current list of saved custom environments. */
  abstract getCustomEnvironments(): Promise<CustomEnvironment[]>;

  /** Inserts or updates a custom environment (matched by `id`). */
  abstract upsertCustomEnvironment(env: CustomEnvironment): Promise<void>;

  /** Removes the custom environment with the given id. */
  abstract deleteCustomEnvironment(id: string): Promise<void>;
}
