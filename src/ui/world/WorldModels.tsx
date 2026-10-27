export function CrystalCluster({
  color,
  x,
  y,
  scale = 1,
}: {
  color: string;
  x: number;
  y: number;
  scale?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cy="15" rx="54" ry="17" fill={color} opacity=".15" />
      <path d="m-44-15 10-25 19 12 8 43-21-6Z" fill={color} />
      <path d="m-34-40 4 49 15-37Z" fill="#fff" opacity=".35" />
      <path d="m-18-43 18-42 23 32-4 65-35 6Z" fill={color} />
      <path d="M0-85 4 18l19-71Z" fill="#efffff" opacity=".65" />
      <path d="m-18-43 22 61-20 0Z" fill="#039dad" opacity=".5" />
      <path d="m22-16 18-33 20 19-10 44-29-3Z" fill={color} />
      <path d="m40-49 0 62 20-43Z" fill="#fff" opacity=".4" />
    </g>
  );
}
export function Reef({
  x,
  y,
  color,
  scale = 1,
  flip = false,
}: {
  x: number;
  y: number;
  color: string;
  scale?: number;
  flip?: boolean;
}) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`}
      fill="none"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M0 0Q-10-42 0-85M-4-32q-28-7-31-31m31 5q27-8 30-39M-1-76q-19-3-24-23"
        strokeWidth="15"
      />
      <path d="m-33-61-14-2m73-30 15-10m-66 6-13-3" strokeWidth="9" />
      <path d="M0-5q-6-45 0-72" stroke="#fff" opacity=".2" strokeWidth="4" />
    </g>
  );
}
export function MiningRig({
  active,
  level,
}: {
  active: boolean;
  level: number;
}) {
  return (
    <g stroke="#10384b" strokeWidth="3" strokeLinejoin="round">
      <ellipse
        cx="0"
        cy="18"
        rx="76"
        ry="22"
        fill="#052435"
        opacity=".45"
        stroke="none"
      />
      {level >= 2 && (
        <g>
          <path
            d="M-73 8-87 27h35M-12 9 7 27h23"
            fill="none"
            stroke="#b9d9cd"
            strokeWidth="8"
          />
          <path
            d="M-48-94-13-67-42-41-17-16"
            fill="none"
            stroke="#f6be56"
            strokeWidth="6"
          />
        </g>
      )}
      {level >= 3 && (
        <g>
          <rect x="-92" y="-70" width="27" height="58" rx="10" fill="#528c98" />
          <path
            d="M-87-56h17m-17 12h17m-17 12h17"
            stroke="#b5e8da"
            strokeWidth="4"
          />
          <path
            d="M-78-70v-16h25"
            fill="none"
            stroke="#e8ba57"
            strokeWidth="7"
          />
        </g>
      )}
      {level >= 4 && (
        <g>
          <path
            d="M-17-108 77-137v52"
            fill="none"
            stroke="#183e4d"
            strokeWidth="17"
          />
          <path
            d="M-17-108 77-137v52"
            fill="none"
            stroke="#f5cb68"
            strokeWidth="10"
          />
          <g className={active ? 'rig-drilling' : undefined}>
            <path d="M64-83h26v34L77-29 64-49Z" fill="#b7ddd6" />
            <path d="m65-72 23 9m-23 5 19 8" stroke="#527f8c" strokeWidth="5" />
          </g>
        </g>
      )}
      <path d="m-58-10 10-97 22-16 20 14-15 101Z" fill="#5d929d" />
      <path d="m-48-107 20-14-9 110-21 1Z" fill="#d1e7d9" />
      <path d="M-28-114 37-148 63-128 3-95Z" fill="#ffcf66" />
      <path d="m3-95 60-33v17L5-76Z" fill="#db8e36" />
      <path d="m38-146 19 5v72H36Z" fill="#dceee2" />
      <path d="M50-136v65" stroke="#6d9ba0" strokeWidth="6" />
      <g className={active ? 'rig-drilling' : undefined}>
        <path d="M25-73h45v30L47-10 25-43Z" fill="#6b929a" />
        <path
          d="m25-65 45 15m-42 0 31 11m-24 0 16 6"
          stroke="#dceee2"
          strokeWidth="7"
        />
      </g>
      {level >= 5 && (
        <g>
          <path d="M22-83h50v18H22Z" fill="#ffdf7b" />
          <path
            d="M29-74h36"
            stroke="#a8fff0"
            strokeWidth="6"
            className={active ? 'beacon-light' : undefined}
          />
          <path d="M-30-107 17-132" stroke="#effbdc" strokeWidth="7" />
          <circle cx="-26" cy="-91" r="15" fill="#174e61" />
          <circle
            cx="-26"
            cy="-91"
            r="8"
            fill="#9dffdf"
            className={active ? 'beacon-light' : undefined}
          />
        </g>
      )}
      <rect x="-67" y="-36" width="43" height="35" rx="10" fill="#fbbe49" />
      <rect
        x="-58"
        y="-28"
        width="25"
        height="15"
        rx="4"
        fill="#075e70"
        strokeWidth="2"
      />
      <path d="M-54-23h16" stroke="#b8ffdf" strokeWidth="3" />
      <path d="m-76 0 62-5 15 13-15 15-62-3Z" fill="#174e61" />
      <path d="m-72 2 56-3 9 9-9 8-56-2Z" fill="#80a7a7" />
      {[-60, -43, -26].map((x) => (
        <circle key={x} cx={x} cy="8" r="5" fill="#153e4e" stroke="none" />
      ))}
      <path d="M-64-43v-28" stroke="#b4e6de" strokeWidth="4" />
      <circle
        cx="-64"
        cy="-75"
        r="5"
        fill="#8ef6ce"
        stroke="none"
        className="beacon-light"
      />
    </g>
  );
}
export function RefineryModel({
  active,
  blocked,
  level,
}: {
  active: boolean;
  blocked: boolean;
  level: number;
}) {
  return (
    <g stroke="#103a4c" strokeWidth="3" strokeLinejoin="round">
      <ellipse
        cx="0"
        cy="36"
        rx="119"
        ry="32"
        fill="#042c3c"
        opacity=".4"
        stroke="none"
      />
      {level >= 2 && (
        <g>
          <rect
            x="-117"
            y="-143"
            width="33"
            height="118"
            rx="15"
            fill="#75a8ac"
          />
          <ellipse cx="-100" cy="-139" rx="16" ry="7" fill="#e0eddb" />
          <path d="M-116-113h31m-31 54h31" stroke="#f5c45e" strokeWidth="6" />
          <path d="M-101-122v46" stroke="#a2ffdf" strokeWidth="5" />
        </g>
      )}
      {level >= 3 && (
        <g>
          <path d="M51-154v-54h22v75" fill="#8aafb0" />
          <path d="M48-206h29m-26 18h22" stroke="#ffe39a" strokeWidth="7" />
          <path d="M83-157v-37h19v62" fill="#67909b" />
          <path d="M79-194h27" stroke="#f9d174" strokeWidth="7" />
        </g>
      )}
      <path d="M-80-5v64l18 5 5-66M58-2l5 66 18-5V-5" fill="#5b8b93" />
      <path d="m-71 23 141 0" stroke="#b0d9cf" strokeWidth="6" />
      <path d="m-110-14 110-32 110 32v34L0 51-110 20Z" fill="#e7a442" />
      <path d="M0 15v36l110-31v-34Z" fill="#c58133" />
      <path d="m-110-14 110-32 110 32L0 18Z" fill="#ffdb72" />
      <rect
        x="-89"
        y="-118"
        width="178"
        height="122"
        rx="32"
        fill="url(#shell)"
      />
      <path
        d="M-87-73v47q0 28 30 28H57q30 0 30-28V-60"
        fill="#91b5b0"
        opacity=".3"
        stroke="none"
      />
      <path d="M-65-122q0-71 65-76 65 5 65 76Z" fill="url(#glass-dome)" />
      <path
        d="M-55-126q0-58 50-62"
        fill="none"
        stroke="#e7fff3"
        opacity=".55"
        strokeWidth="7"
      />
      <ellipse cy="-122" rx="69" ry="13" fill="#e5eee0" />
      <path
        d="M-2-191v66m-49-41q15 20 48 20t53-20"
        fill="none"
        stroke="#d7f3df"
        opacity=".65"
      />
      <rect x="-65" y="-100" width="94" height="60" rx="16" fill="#144c60" />
      <rect
        x="-59"
        y="-94"
        width="82"
        height="45"
        rx="10"
        fill="url(#glass-dome)"
        stroke="none"
      />
      <path d="M-32-92v43M-5-92v43" stroke="#d0eee0" strokeWidth="4" />
      {level >= 4 && (
        <g>
          <path
            d="M-66-150q66 27 132 0"
            fill="none"
            stroke="#fbd877"
            strokeWidth="9"
          />
          <path
            d="M-51-174q51 18 102 0"
            fill="none"
            stroke="#d3ffe9"
            strokeWidth="5"
          />
          <rect x="-67" y="-96" width="98" height="51" rx="14" fill="#123e53" />
          <circle
            cx="-18"
            cy="-70"
            r="20"
            fill="#297c8b"
            stroke="#f3d580"
            strokeWidth="5"
          />
          <circle
            cx="-18"
            cy="-70"
            r="11"
            fill={active ? '#b2ffe0' : '#61b4ac'}
            className={active ? 'beacon-light' : undefined}
          />
          <path d="M-55-70h13m49 0h14" stroke="#9cf6d4" strokeWidth="4" />
        </g>
      )}
      {level >= 5 && (
        <g>
          <path
            d="M-67-173-15-220 42-190"
            fill="none"
            stroke="#edcb76"
            strokeWidth="6"
          />
          <circle cx="-15" cy="-220" r="11" fill="#b2ffe0" />
          <rect x="-111" y="-25" width="29" height="60" rx="8" fill="#e8d6a1" />
          <rect x="81" y="-25" width="29" height="60" rx="8" fill="#e8d6a1" />
          <path d="M-102-14v34M94-14v34" stroke="#2e9c9f" strokeWidth="8" />
          <path
            d="M-68 19 0 39 69 19"
            fill="none"
            stroke="#a5ffe1"
            strokeWidth="4"
          />
        </g>
      )}
      <rect x="43" y="-94" width="26" height="77" rx="8" fill="#f8bb4a" />
      <circle
        cx="56"
        cy="-77"
        r="5"
        fill={blocked ? '#ff8275' : '#b8ffb5'}
        stroke="none"
        className={active ? 'beacon-light' : undefined}
      />
      <path d="M51-58h10m-10 7h10m-10 7h10" stroke="#ad7535" strokeWidth="3" />
      <rect
        x="-45"
        y="-27"
        width="65"
        height="18"
        rx="6"
        fill="#16495b"
        stroke="none"
      />
      {[0, 1, 2, 3, 4].map((n) => (
        <rect
          key={n}
          x={-37 + n * 11}
          y={-22}
          width="6"
          height="7"
          rx="2"
          fill={active ? '#8ef7cb' : '#538c98'}
          className={active ? 'refinery-light' : undefined}
          style={{ animationDelay: `${n * 0.15}s` }}
          stroke="none"
        />
      ))}
      <path
        d="M-89-65h-24v44h-28"
        fill="none"
        stroke="#18485a"
        strokeWidth="19"
      />
      <path
        d="M-89-65h-24v44h-28"
        fill="none"
        stroke="#b8dad1"
        strokeWidth="12"
      />
      <path
        d="M78-125v-40h18v32"
        fill="none"
        stroke="#d4eee1"
        strokeWidth="10"
      />
      <path
        d="M11-202v-33m0 0 32 9-32 9"
        fill="#ff8a6a"
        stroke="#d0e8db"
        strokeWidth="3"
      />
      <path
        d="m-95 1 18 5m7 2 18 5m7 2 18 5"
        stroke="#916d36"
        strokeWidth="5"
      />
    </g>
  );
}
export function WarehouseModel({
  level,
  fraction,
  color,
}: {
  level: number;
  fraction: number;
  color: string;
}) {
  return (
    <g stroke="#10384b" strokeWidth="3" strokeLinejoin="round">
      <ellipse
        cy="35"
        rx="78"
        ry="25"
        fill="#062c3b"
        opacity=".4"
        stroke="none"
      />
      <path d="m-71-70 80-26 64 30V23L-5 51-71 20Z" fill="#dfe9da" />
      <path d="m-5-43 78-23V23L-5 51Z" fill="#86aaa7" />
      <path d="m-80-72 89-30 72 33-86 30Z" fill="#ffd06a" />
      <path d="m-5-39 86-30v13L-5-24Z" fill="#c48b39" />
      <path d="m-80-72 75 33v15l-75-34Z" fill="#f6ba4b" />
      <path d="m-57-41 39 16v48l-39-17Z" fill="#174b5b" />
      <path
        d="m-49-27 23 9v28l-23-9Z"
        fill={color}
        opacity={0.25 + 0.75 * fraction}
        stroke="none"
      />
      <path d="M16-24 58-38V9L16 24Z" fill="#103e50" />
      <path
        d={`M22 ${15 - fraction * 36} 52 ${5 - fraction * 36}V5L22 15Z`}
        fill={color}
        stroke="none"
      />
      <path d="M-61 17v13m49 3v12m72-25v12" stroke="#f5c45e" strokeWidth="7" />
      <path
        d="m-63-78 68 29 63-21"
        fill="none"
        stroke="#fff0aa"
        strokeWidth="4"
      />
      {level >= 2 && (
        <g>
          <path d="m-65-83 42-15 39 17v31l-41 15-40-17Z" fill="#658f9b" />
          <path d="m-65-83 40 17 41-15-39-17Z" fill="#beddd0" />
          <path
            d="M-25-66v31m-28-42v26m15-20v26M-9-64v23"
            fill="none"
            stroke="#e7bf64"
            strokeWidth="4"
          />
        </g>
      )}
      {level >= 3 && (
        <g>
          <path d="m-5-104 37-13 38 17v35L32-51-5-68Z" fill="#bd8244" />
          <path d="m-5-104 37 17 38-13-38-17Z" fill="#ffe399" />
          <path
            d="M32-87v36M9-97v29m10-24v29m28-25v28m12-32v28"
            stroke="#f5c66e"
          />
        </g>
      )}
      {level >= 4 && (
        <g>
          <path d="m-48-116 37-13 38 17v31l-38 14-37-16Z" fill="#478b92" />
          <path d="m-48-116 37 17 38-13-38-17Z" fill="#b7f1d9" />
          <path d="M-11-99v32m-25-42v23m12-18v23M5-99v23" stroke="#dfd5a2" />
          <path d="M-72-58v80M76-56v79" stroke="#f1cd79" strokeWidth="7" />
        </g>
      )}
      {level >= 5 && (
        <g>
          <path
            d="M-77 5v-149l111-36 45 20v110"
            fill="none"
            stroke="#163e50"
            strokeWidth="13"
          />
          <path
            d="M-77 5v-149l111-36 45 20v110"
            fill="none"
            stroke="#eac46c"
            strokeWidth="7"
          />
          <path
            d="m-73-131 105-34 43 18"
            fill="none"
            stroke="#9bdcc9"
            strokeWidth="4"
          />
          <path
            d="M23-173v29q0 13 12 8"
            fill="none"
            stroke="#e9eee0"
            strokeWidth="4"
          />
          <circle cx="-77" cy="-148" r="5" fill="#a8ffe0" stroke="none" />
        </g>
      )}
      <circle cx="-38" cy="-11" r="4" fill="#d9ffff" stroke="none" />
    </g>
  );
}
export function SubmarineModel({
  level,
  loaded,
  color,
  facingLeft,
}: {
  level: number;
  loaded: boolean;
  color: string;
  facingLeft: boolean;
}) {
  return (
    <g
      transform={`scale(${facingLeft ? -1 : 1} 1)`}
      stroke="#123c4b"
      strokeWidth="3"
      strokeLinejoin="round"
    >
      <ellipse
        cx="0"
        cy="34"
        rx="58"
        ry="10"
        fill="#042d41"
        opacity=".22"
        stroke="none"
      />
      {level >= 2 && (
        <g>
          <path d="M-49-15-56-42-19-25M-45 20-52 45-12 29" fill="#d8e6ce" />
          <path
            d="m-52-36 24 10m-19 64 24-9"
            stroke="#f3b94f"
            strokeWidth="5"
          />
        </g>
      )}
      {level >= 4 && (
        <g>
          <rect x="-64" y="-37" width="47" height="20" rx="9" fill="#78acae" />
          <path d="M-63-32h-15v10h15" fill="#a3ffe4" stroke="#4a949d" />
          <path d="M-43-36v18" stroke="#e7d6a0" strokeWidth="6" />
        </g>
      )}
      <path d="m-49-6-23-15v39l23-9" fill="#b9d9d3" />
      <path d="m-69-15-7 31" stroke="#82a8ab" strokeWidth="5" />
      <path
        d="M-31-25h57q40 0 42 27-2 29-42 29h-57q-29 0-30-28 1-28 30-28Z"
        fill="url(#sub-shell)"
      />
      <path
        d="M-52 12q10 22 35 17h45q29 0 37-18"
        fill="#d39839"
        stroke="none"
      />
      <path d="M-18-25v-15H5v15" fill="#e3e9d6" />
      <path d="M-5-40v-13h15" fill="none" stroke="#cbe9db" strokeWidth="5" />
      <circle cx="36" cy="1" r="21" fill="#e2ead8" />
      <circle cx="36" cy="1" r="15" fill="url(#glass-dome)" />
      <path d="M28-7q4-5 10-4" stroke="#ecfff3" strokeWidth="4" />
      <path d="M-35-11h23m-23 8h17" stroke="#aa8039" strokeWidth="3" />
      <path d="M-23 35H29" stroke="#c9e8dd" strokeWidth="5" />
      <circle cx="-36" cy="13" r="5" fill="#fdf4bd" stroke="none" />
      {level >= 3 && (
        <g>
          <rect x="-59" y="19" width="52" height="22" rx="10" fill="#5b929e" />
          <path d="M-55 24h-20v12h20" fill="#9fffe0" stroke="#38888f" />
          <path d="M-43 20v20M-22 20v20" stroke="#e9d697" strokeWidth="5" />
          <path
            d="M-48-19q19-8 38-4"
            fill="none"
            stroke="#fff0b6"
            strokeWidth="5"
          />
        </g>
      )}
      {level >= 5 && (
        <g>
          <path
            d="M12-23 23-32 56-24 70-8M12 26l14 11 32-11 12-13"
            fill="none"
            stroke="#e2eed8"
            strokeWidth="6"
          />
          <path d="M-20-42-30-58h20l13 18" fill="#f8cf70" />
          <path d="M-28-51h14" stroke="#a6ffe1" strokeWidth="4" />
          <circle cx="65" cy="21" r="6" fill="#d4fff0" />
          <path
            d="m71 21 39-14v29Z"
            fill="#bdffe6"
            opacity=".13"
            stroke="none"
          />
          <path
            d="M-7 31v13H9l8-10"
            fill="none"
            stroke="#c9e7d7"
            strokeWidth="4"
          />
        </g>
      )}
      {loaded && (
        <g transform="translate(-4 2)">
          <path d="m-9 3 6-13L7-5l5 16-18 2Z" fill={color} strokeWidth="2" />
          <path
            d="m-3-10 3 21 7-16"
            fill="#efffff"
            opacity=".5"
            stroke="none"
          />
        </g>
      )}
    </g>
  );
}
