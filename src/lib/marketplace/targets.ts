import type {
  PromotionTargetKind,
} from "../../types/marketplace";

export interface PromotionTargetOption {
  id: PromotionTargetKind;
  label: string;
}

const youtubeTargets: PromotionTargetOption[] = [
  {
    id: "channel",
    label: "YouTube Channel",
  },
  {
    id: "video",
    label: "YouTube Video",
  },
];

export function getPromotionTargets(
  listingTypeId: string,
): PromotionTargetOption[] {
  switch (listingTypeId) {
    case "youtube":
      return youtubeTargets;

    case "app":
      return [
        {
          id: "app",
          label: "App",
        },
      ];

    case "website":
      return [
        {
          id: "website",
          label: "Website",
        },
      ];

    case "startup":
      return [
        {
          id: "startup",
          label: "Startup",
        },
      ];

    case "facebook":
    case "instagram":
    case "x":
      return [
        {
          id: "profile",
          label:
            listingTypeId === "x"
              ? "X Profile"
              : "Profile",
        },
      ];

    default:
      return [
        {
          id: "other",
          label: "Other",
        },
      ];
  }
}