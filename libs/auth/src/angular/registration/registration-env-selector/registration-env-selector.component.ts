// FIXME: Update this file to be type safe and remove this and next line
// @ts-strict-ignore
import { CommonModule } from "@angular/common";
import { Component, EventEmitter, OnDestroy, OnInit, Output } from "@angular/core";
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from "@angular/forms";
import {
  Observable,
  Subject,
  firstValueFrom,
  from,
  of,
  pairwise,
  startWith,
  switchMap,
  takeUntil,
} from "rxjs";

import { CustomEnvironmentsDialogComponent } from "@bitwarden/angular/auth/custom-environments-dialog";
import { SelfHostedEnvConfigDialogComponent } from "@bitwarden/angular/auth/self-hosted-env-config-dialog";
import { JslibModule } from "@bitwarden/angular/jslib.module";
import { ClientType } from "@bitwarden/common/enums";
import {
  CustomEnvironment,
  CustomEnvironmentsService,
} from "@bitwarden/common/platform/abstractions/custom-environments.service";
import {
  EnvironmentService,
  Region,
  RegionConfig,
} from "@bitwarden/common/platform/abstractions/environment.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";
// This import has been flagged as unallowed for this class. It may be involved in a circular dependency loop.
// eslint-disable-next-line no-restricted-imports
import { DialogService, FormFieldModule, SelectModule, ToastService } from "@bitwarden/components";

/**
 * Component for selecting the environment to register with in the email verification registration flow.
 * Outputs the selected region to the parent component so it can respond as necessary.
 *
 * Instead of the compile-time cloud regions this presents the user's own saved self-hosted servers.
 */
// FIXME(https://bitwarden.atlassian.net/browse/CL-764): Migrate to OnPush
// eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection
@Component({
  selector: "auth-registration-env-selector",
  templateUrl: "registration-env-selector.component.html",
  imports: [CommonModule, JslibModule, ReactiveFormsModule, FormFieldModule, SelectModule],
})
export class RegistrationEnvSelectorComponent implements OnInit, OnDestroy {
  // FIXME(https://bitwarden.atlassian.net/browse/CL-903): Migrate to Signals
  // eslint-disable-next-line @angular-eslint/prefer-output-emitter-ref
  @Output() selectedRegionChange = new EventEmitter<
    RegionConfig | typeof Region.SelfHosted | null
  >();

  ServerEnvironmentType = Region;

  /** Sentinel select value for the free-text "other" self-hosted option. */
  readonly OTHER_VALUE = "__other_server__";
  /** Sentinel select value for opening the manage-servers dialog. */
  readonly MANAGE_VALUE = "__manage_servers__";
  private readonly CUSTOM_PREFIX = "custom:";

  formGroup = this.formBuilder.group({
    selectedEnv: [null as string | null, Validators.required],
  });

  get selectedEnv(): FormControl {
    return this.formGroup.get("selectedEnv") as FormControl;
  }

  customEnvironments$: Observable<CustomEnvironment[]> =
    this.customEnvironmentsService.customEnvironments$;

  private selectedEnvFromEnvId: string | null = null;

  hideEnvSelector = false;
  isDesktopOrBrowserExtension = false;

  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private environmentService: EnvironmentService,
    private customEnvironmentsService: CustomEnvironmentsService,
    private dialogService: DialogService,
    private i18nService: I18nService,
    private toastService: ToastService,
    private platformUtilsService: PlatformUtilsService,
  ) {
    const clientType = platformUtilsService.getClientType();
    this.isDesktopOrBrowserExtension =
      clientType === ClientType.Desktop || clientType === ClientType.Browser;

    this.hideEnvSelector = clientType === ClientType.Web && this.platformUtilsService.isSelfHost();
  }

  async ngOnInit() {
    if (this.hideEnvSelector) {
      return;
    }

    this.selectedEnvFromEnvId = await this.deriveSelectionFromEnv();
    this.selectedEnv.setValue(this.selectedEnvFromEnvId, { emitEvent: false });
    this.emitSelected(this.selectedEnvFromEnvId);

    this.listenForSelectedEnvChanges();
  }

  /** Maps an internal select value to the region shape the parent component consumes. */
  private emitSelected(value: string | null) {
    if (value === null) {
      this.selectedRegionChange.emit(null);
      return;
    }

    // Both a saved server and the "other" option are self-hosted from the parent's perspective.
    this.selectedRegionChange.emit(Region.SelfHosted);
  }

  /** Derives the select value that corresponds to the currently configured environment. */
  private async deriveSelectionFromEnv(): Promise<string | null> {
    const list = await this.customEnvironmentsService.getCustomEnvironments();
    const env = await firstValueFrom(this.environmentService.environment$);
    const urls = env?.getUrls();
    const base = urls?.base ?? urls?.webVault;
    const match = list.find((entry) => (entry.urls.base ?? entry.urls.webVault) === base);

    if (match) {
      return this.CUSTOM_PREFIX + match.id;
    }

    if (env?.getRegion() === Region.SelfHosted) {
      return this.OTHER_VALUE;
    }

    return null;
  }

  private listenForSelectedEnvChanges() {
    this.selectedEnv.valueChanges
      .pipe(
        startWith(null), // required so that first user choice is not ignored
        pairwise(),
        switchMap(([prev, value]: [string | null, string | null]) => {
          if (value === null) {
            this.selectedRegionChange.emit(null);
            return of(null);
          }

          if (value === this.MANAGE_VALUE) {
            return from(this.handleManage(prev));
          }

          if (value === this.OTHER_VALUE) {
            return from(this.handleOther(prev));
          }

          if (value.startsWith(this.CUSTOM_PREFIX)) {
            return from(this.handleCustom(value.substring(this.CUSTOM_PREFIX.length)));
          }

          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  private async handleManage(prev: string | null) {
    await CustomEnvironmentsDialogComponent.open(this.dialogService);
    const selection = await this.deriveSelectionFromEnv();
    this.selectedEnv.setValue(selection ?? prev, { emitEvent: false });
    this.emitSelected(this.selectedEnv.value);
  }

  private async handleOther(prev: string | null) {
    const result = await SelfHostedEnvConfigDialogComponent.open(this.dialogService);

    if (result === true) {
      this.toastService.showToast({
        variant: "success",
        title: null,
        message: this.i18nService.t("environmentSaved"),
      });
      const selection = await this.deriveSelectionFromEnv();
      this.selectedEnv.setValue(selection, { emitEvent: false });
      this.selectedRegionChange.emit(Region.SelfHosted);
      return;
    }

    // Reset to the previously selected value when the dialog was dismissed.
    this.selectedEnv.setValue(prev ?? this.selectedEnvFromEnvId, { emitEvent: false });
  }

  private async handleCustom(id: string) {
    const list = await this.customEnvironmentsService.getCustomEnvironments();
    const env = list.find((entry) => entry.id === id);

    if (!env) {
      this.selectedEnv.setValue(this.selectedEnvFromEnvId, { emitEvent: false });
      return;
    }

    await this.environmentService.setEnvironment(Region.SelfHosted, env.urls);
    this.selectedRegionChange.emit(Region.SelfHosted);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
