import { initialCategories, initialSubcategories } from "../../config/categories";
import { initialListingTypes } from "../../config/listingTypes";

export function getListingTypeName(listingTypeId: string) {
  return (
    initialListingTypes.find(
      (type) => type.id === listingTypeId || type.key === listingTypeId,
    )?.name ?? listingTypeId
  );
}

export function getCategoryName(categoryId: string) {
  return (
    initialCategories.find((category) => category.id === categoryId)?.name ??
    categoryId
  );
}

export function getSubcategoryName(
  categoryId: string,
  subcategoryId?: string,
) {
  if (!subcategoryId) {
    return "";
  }
return (
    initialSubcategories.find(
      (subcategory) =>
        subcategory.categoryId === categoryId &&
        subcategory.id === subcategoryId,
    )?.name ?? subcategoryId
  );
}