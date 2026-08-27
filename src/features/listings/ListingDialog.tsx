import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  ImagePlus,
  Rocket,
  Sparkles,
} from "lucide-react";

import {
  requiresPlatformHandle,
  resolvePlatformIdentity,
  type SocialPlatformKey,
} from "../../lib/marketplace/platformIdentity";

import {
  marketplaceConfig,
} from "../../config/marketplace";

import {
  optimizeImage,
} from "../../lib/images/optimizeImage";

import {
  initialCategories,
  initialSubcategories,
} from "../../config/categories";

import {
  initialListingTypes,
} from "../../config/listingTypes";

import {
  getPromotionTargets,
} from "../../lib/marketplace/targets";

import type {
  Listing,
} from "../../types/marketplace";

import {
  emptyListingForm,
  type ListingFormData,
} from "./listingForm";

import "./listing-dialog.css";

type ListingDialogMode =
  | "create"
  | "edit"
  | "admin-edit";

type ListingDialogProps = {
  open: boolean;
  mode: ListingDialogMode;

  listing?: Listing;

  onClose: () => void;

  onSubmit: (
    data: ListingFormData,
  ) => Promise<void>;
};

export function ListingDialog({
  open,
  mode,
  listing,
  onClose,
  onSubmit,
}: ListingDialogProps) {
  const [form, setForm] =
    useState<ListingFormData>(
      emptyListingForm,
    );

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const handleRequired =
    requiresPlatformHandle(
      form.listingTypeId,
      form.targetKind,
    );

  const supportsPlatformIdentity =
    ["youtube", "instagram", "facebook", "x"]
      .includes(form.listingTypeId);



  useEffect(() => {
    if (!open) {
      return;
    }

    if (listing) {
      setForm({
        listingTypeId:
          listing.listingTypeId,

        platformKey:
          listing.platformKey,

        targetKind:
          listing.targetKind,
categoryId:
          listing.categoryId,

        subcategoryId:
          listing.subcategoryId ?? "",

        title:
          listing.title,

        handle:
          listing.handle ?? "",

        platformUrl:
          listing.platformUrl ?? "",

        shortDescription:
          listing.shortDescription,

        externalUrl:
          listing.externalUrl,

        websiteUrl:
          listing.websiteUrl ?? "",

        downloadUrl:
          listing.downloadUrl ?? "",

        launchDate:
          listing.launchDate ?? "",

        featuredImageFile: null,
      });
    } else {
      setForm({
        ...emptyListingForm,
      });
    }

    setError(null);
  }, [open, listing]);

  const targetOptions = useMemo(
    () =>
      getPromotionTargets(
        form.listingTypeId,
      ),
    [form.listingTypeId],
  );

  const categoryOptions = useMemo(
    () =>
      initialCategories
        .filter(
          (category) =>
            category.enabled,
        )
        .sort(
          (a, b) =>
            a.sortOrder - b.sortOrder,
        ),
    [],
  );

  const subcategoryOptions = useMemo(
    () =>
      initialSubcategories
        .filter(
          (subcategory) =>
            subcategory.enabled &&
            subcategory.categoryId ===
            form.categoryId,
        )
        .sort(
          (a, b) =>
            a.sortOrder - b.sortOrder,
        ),
    [form.categoryId],
  );

  const isApp =
    form.listingTypeId === "app";

  const isStartup =
    form.listingTypeId ===
    "startup";

  const isWebsite =
    form.listingTypeId ===
    "website";

  const listingType =
    initialListingTypes.find(
      (type) =>
        type.id ===
        form.listingTypeId ||
        type.key ===
        form.listingTypeId,
    );

  const freeListing =
    marketplaceConfig.pricing
      .freeListingEnabled &&
    (listingType?.freeListingAllowance ??
      0) > 0;

  function updateField<
    K extends keyof ListingFormData,
  >(
    key: K,
    value: ListingFormData[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleListingTypeChange(
    listingTypeId: string,
  ) {
    const targets =
      getPromotionTargets(
        listingTypeId,
      );

    setForm((current) => ({
      ...current,

      listingTypeId,

      platformKey:
        [
          "youtube",
          "facebook",
          "instagram",
          "x",
        ].includes(listingTypeId)
          ? listingTypeId
          : undefined,

      targetKind:
        targets[0]?.id ?? "other",

      externalUrl: "",
      platformUrl: "",
      handle: "",
      websiteUrl: "",
      downloadUrl: "",
      launchDate: "",
    }));
  }

  async function handleSubmit(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    if (!form.externalUrl.trim()) {
      setError(
        "Please enter the main link.",
      );
      return;
    }

    if (!form.title.trim()) {
      setError(
        "Please enter a title.",
      );
      return;
    }

    if (!form.categoryId) {
      setError(
        "Please select a category.",
      );
      return;
    }

    if (
      isApp &&
      !form.downloadUrl?.trim()
    ) {
      setError(
        "Please enter the app download or store link.",
      );
      return;
    }

    let normalizedHandle =
      form.handle?.trim() ?? "";

    let normalizedPlatformUrl =
      form.platformUrl?.trim() ?? "";

    if (
      supportsPlatformIdentity &&
      normalizedHandle
    ) {
      const identity =
        resolvePlatformIdentity(
          form.listingTypeId as SocialPlatformKey,
          normalizedHandle,
        );

      if (!identity) {
        setError(
          "Please enter a valid profile or channel.",
        );
        return;
      }

      normalizedHandle =
        identity.handle;

      normalizedPlatformUrl =
        identity.url;
    }

    if (
      handleRequired &&
      !normalizedHandle
    ) {
      setError(
        "Please enter the channel or profile handle.",
      );
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await onSubmit({
        ...form,

        title:
          form.title.trim(),

        handle:
          normalizedHandle,

        platformUrl:
          normalizedPlatformUrl,

        externalUrl:
          form.externalUrl.trim(),

        shortDescription:
          form.shortDescription.trim(),

        websiteUrl:
          form.websiteUrl?.trim(),

        downloadUrl:
          form.downloadUrl?.trim(),

      });

      onClose();
    } catch {
      setError(
        "Unable to save right now. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return null;
  }

  const heading =
    mode === "create"
      ? "Add something worth discovering"
      : mode === "admin-edit"
        ? "Edit listing"
        : "Edit your listing";

  const mainLinkLabel =
    isWebsite
      ? "Website link"
      : isApp
        ? "App / product page"
        : form.listingTypeId === "youtube"
          ? form.targetKind === "video"
            ? "YouTube video link"
            : "YouTube channel link"
          : [
            "facebook",
            "instagram",
            "x",
          ].includes(
            form.listingTypeId,
          )
            ? "Profile link"
            : isStartup
              ? "Startup / product link"
              : "Main link";

  return (
    <div
      className="listing-dialog-overlay"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget &&
          !saving
        ) {
          onClose();
        }
      }}
    >
      <section
        className="listing-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={heading}
      >
        <header className="listing-dialog-header">
          <div className="listing-dialog-heading">
            <span className="listing-heading-icon">
              <Rocket size={17} />
            </span>

            <div>
              <p className="eyebrow">
                GET DISCOVERED
              </p>

              <h2>{heading}</h2>
            </div>
          </div>

          <button
            type="button"
            className="listing-dialog-close"
            disabled={saving}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="listing-status-strip">
          <span
            className={
              freeListing
                ? "listing-status-badge free"
                : "listing-status-badge paid"
            }
          >
            {freeListing
              ? "FREE LISTING"
              : "PAID LISTING"}
          </span>

          <span className="listing-status-copy">
            <Sparkles size={13} />
            Put it on the visibility board.
          </span>

          <span className="listing-push-note">
            Push Up{" "}
            {
              marketplaceConfig.pricing
                .boardVisibilityLabel
            }
          </span>
        </div>

        <form
          className="listing-form"
          onSubmit={handleSubmit}
        >
          <div className="listing-form-row">
            <label>
              Promote

              <select
                value={
                  form.listingTypeId
                }
                onChange={(event) =>
                  handleListingTypeChange(
                    event.target.value,
                  )
                }
              >
                {initialListingTypes
                  .filter(
                    (type) =>
                      type.enabled,
                  )
                  .sort(
                    (a, b) =>
                      a.sortOrder -
                      b.sortOrder,
                  )
                  .map((type) => (
                    <option
                      key={type.id}
                      value={type.id}
                    >
                      {type.name}
                    </option>
                  ))}
              </select>
            </label>

            <label>
              Type

              <select
                value={
                  form.targetKind
                }
                onChange={(event) =>
                  updateField(
                    "targetKind",
                    event.target
                      .value as ListingFormData["targetKind"],
                  )
                }
              >
                {targetOptions.map(
                  (target) => (
                    <option
                      key={target.id}
                      value={target.id}
                    >
                      {target.label}
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>
<label>
            {mainLinkLabel} *

            <input
              type="text"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={form.externalUrl}
              onChange={(event) =>
                updateField(
                  "externalUrl",
                  event.target.value,
                )
              }
              placeholder="Paste link or URL"
              required
            />
          </label>

          <div className="listing-form-row title-image-row">
            <label>
              Title *

              <input
                type="text"
                value={form.title}
                onChange={(event) =>
                  updateField(
                    "title",
                    event.target.value,
                  )
                }
                maxLength={120}
                placeholder="Name people should see"
                required
              />
            </label>

            <label className="listing-image-field">
              Logo / image · max 5 MB

              <span className="listing-file-control">
                <ImagePlus size={15} />

                <span>
                  {form.featuredImageFile
                    ? form
                      .featuredImageFile
                      .name
                    : "Choose image"}
                </span>

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={async (event) => {
                    const file =
                      event.target.files?.[0] ?? null;

                    if (!file) {
                      updateField(
                        "featuredImageFile",
                        null,
                      );
                      return;
                    }

                    try {
                      setError(null);

                      const result =
                        await optimizeImage(
                          file,
                          {
                            maxWidth: 800,
                            maxHeight: 800,
                            quality: 0.78,
                            maxInputBytes:
                              5 * 1024 * 1024,
                            maxOutputBytes:
                              180 * 1024,
                          },
                        );

                      updateField(
                        "featuredImageFile",
                        result.file,
                      );
                    } catch (error) {
                      event.target.value = "";

                      updateField(
                        "featuredImageFile",
                        null,
                      );

                      setError(
                        error instanceof Error
                          ? error.message
                          : "Unable to process image.",
                      );
                    }
                  }}
                />
              </span>
            </label>
          </div>

          <div className="listing-form-row">
            <label>
              Category *

              <select
                value={
                  form.categoryId
                }
                onChange={(event) => {
                  updateField(
                    "categoryId",
                    event.target.value,
                  );

                  updateField(
                    "subcategoryId",
                    "",
                  );
                }}
                required
              >
                <option value="">
                  Select
                </option>

                {categoryOptions.map(
                  (category) => (
                    <option
                      key={
                        category.id
                      }
                      value={
                        category.id
                      }
                    >
                      {
                        category.name
                      }
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              Subcategory

              <select
                value={
                  form.subcategoryId ??
                  ""
                }
                disabled={
                  !form.categoryId ||
                  subcategoryOptions.length ===
                  0
                }
                onChange={(event) =>
                  updateField(
                    "subcategoryId",
                    event.target.value,
                  )
                }
              >
                <option value="">
                  {form.categoryId
                    ? "Optional"
                    : "Select category first"}
                </option>

                {subcategoryOptions.map(
                  (subcategory) => (
                    <option
                      key={
                        subcategory.id
                      }
                      value={
                        subcategory.id
                      }
                    >
                      {
                        subcategory.name
                      }
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>

          {(isApp ||
            isStartup) && (
              <div className="listing-form-row">
                <label>
                  Launch date

                  <input
                    type="date"
                    value={
                      form.launchDate ??
                      ""
                    }
                    onChange={(event) =>
                      updateField(
                        "launchDate",
                        event.target.value,
                      )
                    }
                  />
                </label>

                {isApp ? (
                  <label>
                    Download / Store link *

                    <input
                      type="url"
                      value={
                        form.downloadUrl ??
                        ""
                      }
                      onChange={(event) =>
                        updateField(
                          "downloadUrl",
                          event.target
                            .value,
                        )
                      }
                      placeholder="Store / download URL"
                    />
                  </label>
                ) : (
                  <label>
                    Website

                    <input
                      type="url"
                      value={
                        form.websiteUrl ??
                        ""
                      }
                      onChange={(event) =>
                        updateField(
                          "websiteUrl",
                          event.target
                            .value,
                        )
                      }
                      placeholder="https://..."
                    />
                  </label>
                )}
              </div>
            )}

          {isApp && (
            <label>
              Website
              <input
                type="url"
                value={
                  form.websiteUrl ??
                  ""
                }
                onChange={(event) =>
                  updateField(
                    "websiteUrl",
                    event.target.value,
                  )
                }
                placeholder="Optional product website"
              />
            </label>
          )}

          <div className="listing-form-row listing-last-row">
            {supportsPlatformIdentity && (
              <label>
                Channel / profile{" "}
                {handleRequired ? "*" : ""}

                <input
                  type="text"
                  value={form.handle ?? ""}
                  onChange={(event) =>
                    updateField(
                      "handle",
                      event.target.value,
                    )
                  }
                  placeholder="@name or profile URL"
                  required={handleRequired}
                />
              </label>
            )}

            <label>
              Short pitch
              <input
                type="text"
                value={
                  form.shortDescription
                }
                onChange={(event) =>
                  updateField(
                    "shortDescription",
                    event.target.value,
                  )
                }
                maxLength={180}
                placeholder="Why should people discover it?"
              />
            </label>
          </div>

          {error && (
            <p className="listing-form-error">
              {error}
            </p>
          )}

          <footer className="listing-form-actions">
            <span className="listing-submit-note">
              You can edit this later.
            </span>

            <div>
              <button
                type="button"
                className="listing-cancel-button"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="listing-form-primary"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : mode === "create"
                    ? "Add to board"
                    : "Save changes"}
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}
