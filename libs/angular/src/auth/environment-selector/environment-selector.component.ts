import { CommonModule } from "@angular/common";
import { Component, OnDestroy } from "@angular/core";
import { Observable, Subject, combineLatest, map } from "rxjs";

import {
  CustomEnvironment,
  CustomEnvironmentsService,
} from "@bitwarden/common/platform/abstractions/custom-environments.service";
import {
  EnvironmentService,
  Region,
} from "@bitwarden/common/platform/abstractions/environment.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import {
  DialogService,
  IconModule,
  LinkModule,
  MenuModule,
  ToastService,
  TypographyModule,
} from "@bitwarden/components";
import { I18nPipe } from "@bitwarden/ui-common";

import { CustomEnvironmentsDialogComponent } from "../custom-environments-dialog";
import { SelfHostedEnvConfigDialogComponent } from "../self-hosted-env-config-dialog";

// FIXME(https://bitwarden.atlassian.net/browse/CL-764): Migrate to OnPush
// eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection
@Component({
  selector: "environment-selector",
  templateUrl: "environment-selector.component.html",
  standalone: true,
  imports: [CommonModule, I18nPipe, IconModule, LinkModule, MenuModule, TypographyModule],
})
export class EnvironmentSelectorComponent implements OnDestroy {
  protected ServerEnvironmentType = Region;
  protected customEnvironments$: Observable<CustomEnvironment[]> =
    this.customEnvironmentsService.customEnvironments$;

  /** Label shown on the trigger button for the currently selected environment. */
  protected displayLabel$: Observable<string> = combineLatest([
    this.customEnvironmentsService.customEnvironments$,
    this.environmentService.globalEnvironment$,
  ]).pipe(
    map(([list, env]) => {
      const urls = env?.getUrls();
      const base = urls?.base ?? urls?.webVault;
      const match = list.find((entry) => (entry.urls.base ?? entry.urls.webVault) === base);
      if (match) {
        return match.label;
      }
      if (env?.getRegion() === Region.SelfHosted) {
        return this.i18nService.t("otherServer");
      }
      return this.i18nService.t("noSavedServers");
    }),
  );

  /**
   * Tracks which environment is currently selected so the UI can show a checkmark.
   * `id` references a saved custom server; `isSelfHosted` covers the free-text "Other" option.
   */
  protected selectedEnv$: Observable<{ id?: string; isSelfHosted: boolean }> = combineLatest([
    this.customEnvironmentsService.customEnvironments$,
    this.environmentService.globalEnvironment$,
  ]).pipe(
    map(([list, env]) => {
      const urls = env?.getUrls();
      const base = urls?.base ?? urls?.webVault;
      const match = list.find((entry) => (entry.urls.base ?? entry.urls.webVault) === base);
      return {
        id: match?.id,
        isSelfHosted: env?.getRegion() === Region.SelfHosted && match == null,
      };
    }),
  );

  private destroy$ = new Subject<void>();

  constructor(
    public environmentService: EnvironmentService,
    private customEnvironmentsService: CustomEnvironmentsService,
    private dialogService: DialogService,
    private toastService: ToastService,
    private i18nService: I18nService,
  ) {}

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async selectCustom(env: CustomEnvironment) {
    await this.environmentService.setEnvironment(Region.SelfHosted, env.urls);
  }

  async openManage() {
    await CustomEnvironmentsDialogComponent.open(this.dialogService);
  }

  async toggleOther() {
    const dialogResult = await SelfHostedEnvConfigDialogComponent.open(this.dialogService);
    if (dialogResult) {
      this.toastService.showToast({
        variant: "success",
        title: "",
        message: this.i18nService.t("environmentSaved"),
      });
    }
  }
}
