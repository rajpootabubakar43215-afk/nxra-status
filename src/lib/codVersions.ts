export interface CodVersion {
  game: string;
  version: string;
  label: string;
}

export interface CodGroup {
  group: string;
  versions: CodVersion[];
}

export const COD_VERSIONS: CodGroup[] = [
  {
    group: "Call of Duty 1",
    versions: [
      { game: "cod", version: "1.1", label: "v1.1" },
      { game: "cod", version: "1.2", label: "v1.2" },
      { game: "cod", version: "1.3", label: "v1.3" },
      { game: "cod", version: "1.4", label: "v1.4" },
      { game: "cod", version: "1.5", label: "v1.5" },
    ],
  },
  {
    group: "COD: United Offensive",
    versions: [
      { game: "coduo", version: "1.41", label: "v1.41" },
      { game: "coduo", version: "1.51", label: "v1.51" },
    ],
  },
  {
    group: "Call of Duty 2",
    versions: [
      { game: "cod2", version: "1.0", label: "v1.0" },
      { game: "cod2", version: "1.2", label: "v1.2" },
      { game: "cod2", version: "1.3", label: "v1.3" },
      { game: "cod2", version: "1.4", label: "v1.4" },
    ],
  },
  {
    group: "Call of Duty 4",
    versions: [
      { game: "cod4", version: "1.0", label: "v1.0" },
      { game: "cod4", version: "1.7", label: "v1.7" },
      { game: "cod4", version: "1.8", label: "v1.8" },
    ],
  },
];

export const GAME_TITLE: Record<string, string> = {
  cod: "CALL OF DUTY",
  coduo: "UNITED OFFENSIVE",
  cod2: "CALL OF DUTY 2",
  cod4: "CALL OF DUTY 4",
};

export const DEFAULT_VERSION: CodVersion = { game: "cod", version: "1.1", label: "v1.1" };
