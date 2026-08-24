import {
  Camera,
  Globe2,
  MonitorSmartphone,
  Play,
  Rocket,
  Sparkles,
  Users,
} from "lucide-react";

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

    default:
      return <Sparkles {...props} />;
  }
}