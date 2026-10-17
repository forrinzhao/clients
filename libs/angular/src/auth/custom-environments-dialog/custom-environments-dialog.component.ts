import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
} from "@angular/forms";
import { Observable, firstValueFrom } from "rxjs";

import {
  CustomEnvironment,
  CustomEnvironmentsService,
} from "@bitwarden/common/platform/abstractions/custom-environments.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";
import {
  AsyncActionsModule,
  ButtonModule,
  DialogModule,
  DialogRef,
  DialogService,
  FormFieldModule,
  IconModule,
  TypographyModule,
} from "@bitwarden/components";

import { JslibModule } from "../../jslib.module";

function onlyHttpsValidator(): ValidatorFn {
  const i18nService = inject(I18nService);
  const platformUtilsService = inject(PlatformUtilsService);

  return (control: AbstractControl): ValidationErrors | null => {
    const url = control.value as string;
    if (url && !url.startsWith("https://") && !platformUtilsService.isDev()) {
      return {
        onlyHttpsAllowed: {
          message: i18nService.t("selfHostedEnvMustUseHttps"),
        },
      };
    }
    return null;
  };
}

/**
 * Dialog that lets the user manage their list of self-hosted servers.
 */
// FIXME(https://bitwarden.atlassian.net/browse/CL-764): Migrate to OnPush
// eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection
@Component({
  selector: "custom-environments-dialog",
  templateUrl: "custom-environments-dialog.component.html",
  imports: [
    CommonModule,
    JslibModule,
    DialogModule,
    ButtonModule,
    IconModule,
    TypographyModule,
    ReactiveFormsModule,
    FormFieldModule,
    AsyncActionsModule,
  ],
})
export class CustomEnvironmentsDialogComponent {
  /**
   * Opens the dialog.
   * @param dialogService - Dialog service.
   * @returns Promise that resolves to true if the dialog was confirmed, false otherwise.
   */
  static async open(dialogService: DialogService): Promise<boolean> {
    const dialogRef = dialogService.open<boolean>(CustomEnvironmentsDialogComponent, {
      disableClose: false,
    });

    const dialogResult = await firstValueFrom(dialogRef.closed);

    return dialogResult ?? false;
  }

  /** Live list of saved servers; updates automatically when the store changes. */
  servers$: Observable<CustomEnvironment[]> = this.customEnvironmentsService.customEnvironments$;

  editingId: string | null = null;

  formGroup = this.formBuilder.group({
    label: [""],
    baseUrl: ["", [onlyHttpsValidator()]],
  });

  get label(): FormControl {
    return this.formGroup.get("label") as FormControl;
  }

  get baseUrl(): FormControl {
    return this.formGroup.get("baseUrl") as FormControl;
  }

  constructor(
    private dialogRef: DialogRef<boolean>,
    private formBuilder: FormBuilder,
    private customEnvironmentsService: CustomEnvironmentsService,
  ) {}

  save = async () => {
    this.formGroup.markAllAsTouched();
    if (this.formGroup.invalid) {
      return;
    }

    const label = (this.label.value ?? "").trim();
    const baseUrl = (this.baseUrl.value ?? "").trim();
    if (!label || !baseUrl) {
      return;
    }

    const id = this.editingId ?? crypto.randomUUID();
    await this.customEnvironmentsService.upsertCustomEnvironment({
      id,
      label,
      urls: { base: baseUrl },
    });
    this.resetForm();
  };

  edit(server: CustomEnvironment) {
    this.editingId = server.id;
    this.label.setValue(server.label);
    this.baseUrl.setValue(server.urls.base ?? server.urls.webVault ?? "");
  }

  async remove(server: CustomEnvironment) {
    await this.customEnvironmentsService.deleteCustomEnvironment(server.id);
    if (this.editingId === server.id) {
      this.resetForm();
    }
  }

  resetForm() {
    this.editingId = null;
    this.formGroup.reset({ label: "", baseUrl: "" });
  }

  async cancel() {
    await this.dialogRef.close(false);
  }

  async close() {
    await this.dialogRef.close(true);
  }
}
