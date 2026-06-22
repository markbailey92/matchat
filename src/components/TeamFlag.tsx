import { teamFlagUrl } from "@/lib/teamFlags";

interface TeamFlagProps {
  teamName: string;
  className?: string;
}

export function TeamFlag({ teamName, className = "h-5 w-7" }: TeamFlagProps) {
  const src = teamFlagUrl(teamName);
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={28}
      height={20}
      className={`inline-block shrink-0 rounded-sm object-cover ${className}`}
    />
  );
}
