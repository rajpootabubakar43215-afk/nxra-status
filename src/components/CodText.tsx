import { parseCodString } from "@/lib/codColor";

interface Props {
  text: string;
  className?: string;
}

export const CodText = ({ text, className }: Props) => {
  const parts = parseCodString(text || "");
  return (
    <span className={className}>
      {parts.map((p, i) => (
        <span key={i} style={{ color: p.color }}>
          {p.text}
        </span>
      ))}
    </span>
  );
};
