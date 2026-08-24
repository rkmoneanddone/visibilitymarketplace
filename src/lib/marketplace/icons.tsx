import {
  Camera,
  Globe2,
  MonitorSmartphone,
  Play,
  Rocket,
  Sparkles,
  Users,
} from "lucide-react";

function XPlatformIcon({
  size = 15,
}: {
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        display: "inline-grid",
        placeItems: "center",
        fontSize: size,
        lineHeight: 1,
      }}
    >
      𝕏
    </span>
  );
}

export function getTypeIcon(type: string) {
  const props = {
    size: 15,
    strokeWidth: 2,
  };

  switch (type) {
    case "YouTube":
      return <Play {...props} />;

    case "Instagram":
      return <Camera {...props} />;

    case "App":
      return <MonitorSmartphone {...props} />;

    case "Startup":
      return <Rocket {...props} />;

    case "Website":
      return <Globe2 {...props} />;

    case "Facebook":
      return <Users {...props} />;

    case "X":
      return <XPlatformIcon size={15} />;

    default:
      return <Sparkles {...props} />;
  }
}