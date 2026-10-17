import { Observable, firstValueFrom, map } from "rxjs";

import {
  CustomEnvironmentsService,
  CustomEnvironment,
} from "../abstractions/custom-environments.service";
import { StateProvider, KeyDefinition, ENVIRONMENT_DISK, GlobalState } from "../state";

export const CUSTOM_ENVIRONMENTS_KEY = new KeyDefinition<CustomEnvironment[]>(
  ENVIRONMENT_DISK,
  "customEnvironments",
  {
    deserializer: (obj) => obj as CustomEnvironment[],
  },
);

export class DefaultCustomEnvironmentsService implements CustomEnvironmentsService {
  private state: GlobalState<CustomEnvironment[] | null>;
  customEnvironments$: Observable<CustomEnvironment[]>;

  constructor(private stateProvider: StateProvider) {
    this.state = this.stateProvider.getGlobal(CUSTOM_ENVIRONMENTS_KEY);
    this.customEnvironments$ = this.state.state$.pipe(map((value) => value ?? []));
  }

  async getCustomEnvironments(): Promise<CustomEnvironment[]> {
    return (await firstValueFrom(this.state.state$)) ?? [];
  }

  async upsertCustomEnvironment(env: CustomEnvironment): Promise<void> {
    const list = await this.getCustomEnvironments();
    const index = list.findIndex((existing) => existing.id === env.id);
    if (index >= 0) {
      list[index] = env;
    } else {
      list.push(env);
    }
    await this.state.update(() => list);
  }

  async deleteCustomEnvironment(id: string): Promise<void> {
    const list = (await this.getCustomEnvironments()).filter((existing) => existing.id !== id);
    await this.state.update(() => list);
  }
}
