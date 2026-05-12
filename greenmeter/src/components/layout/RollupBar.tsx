"use client";

export interface RollupLevel {
  id: string;
  label: string;
  color: string;
  parent: string | null;
}

interface RollupBarProps {
  levels: RollupLevel[];
  activeLevel: string;
  onSetLevel: (id: string) => void;
}

export function RollupBar({ levels, activeLevel, onSetLevel }: RollupBarProps) {
  return (
    <div className="rollup-bar">
      <span className="rb-label">Viewing at:</span>
      {levels.map((level) => (
        <span key={level.id} style={{ display: "contents" }}>
          <span
            className={`rb-item ${level.id === activeLevel ? "active" : "inactive"}`}
            onClick={() => onSetLevel(level.id)}
          >
            <div className="rb-dot" style={{ background: level.color }} />
            {level.label}
          </span>
          {level.parent && <span className="rb-sep">›</span>}
        </span>
      ))}
    </div>
  );
}
