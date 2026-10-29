import { SubmarineModel, WarehouseModel } from './WorldModels';

type Region = 'home' | 'polar' | 'ember';

/** Surface regions use the same faceted models and ink outlines as the bases. */
export function OceanSurfaceArt({ region = 'home' }: { region?: Region }) {
  const home = region === 'home';
  const polar = region === 'polar';
  const top = home ? '#87b9a0' : polar ? '#badad5' : '#a78c77';
  const side = home ? '#477f78' : polar ? '#618e9e' : '#675f62';
  return (
    <svg viewBox="0 0 560 330" aria-hidden="true">
      <ellipse
        cx="280"
        cy="250"
        rx="232"
        ry="60"
        fill="#092e42"
        opacity=".22"
      />
      <g fill="none" stroke="#9de5d5" strokeWidth="2" opacity=".24">
        <ellipse cx="280" cy="234" rx="248" ry="77" />
        <path d="M68 267q87 61 213 55m133-26q48-17 76-44M52 214l-20 4m452-30 32 6" />
      </g>
      <g stroke="#173f4f" strokeWidth="3" strokeLinejoin="round">
        <path
          d="m105 165 88-43 159-4 109 65-20 65-155 44-156-55Z"
          fill={side}
        />
        <path d="m286 230 175-47-20 65-155 44Z" fill="#244e61" />
        <path d="m105 165 88-43 159-4 109 65-175 47-156-55Z" fill={top} />
        <path
          d="m130 175 156 55 155-41"
          fill="none"
          stroke="#c7e4c7"
          opacity=".55"
        />
        <path
          d="m172 243 14-49m65 83 8-56m102 48 7-61m43 42 12-45"
          fill="none"
          opacity=".3"
        />
      </g>
      {home ? (
        <>
          <g transform="translate(300 183) scale(.66)">
            <WarehouseModel level={1} fraction={0} color="#93e8d0" />
          </g>
          <g stroke="#173f4f" strokeWidth="3" strokeLinejoin="round">
            <path d="m165 182 65 23-63 34-65-24Z" fill="#e0c78e" />
            <path d="m102 215 65 24v10l-65-24Z" fill="#ab956f" />
            <path d="m167 239 63-34v10l-63 34Z" fill="#887a65" />
            <path
              d="m120 213 63 22m-41-32 62 22m-47-28 61 21"
              stroke="#a58e69"
              strokeWidth="2"
            />
            <path
              d="M201 158V96"
              fill="none"
              stroke="#d5e9d9"
              strokeWidth="5"
            />
            <path d="m203 98 36 12-36 13Z" fill="#f6c665" />
          </g>
          <g
            className="ocean-port-submarine"
            transform="translate(355 260) scale(.7)"
          >
            <SubmarineModel
              level={1}
              loaded={false}
              color="#93e8d0"
              facingLeft
            />
          </g>
          <g fill="#b3d4ad" stroke="#244e54" strokeWidth="3">
            <path d="m143 153 12-44 22 42Z" />
            <path d="m385 162 16-53 28 58Z" />
          </g>
          <g
            fill="none"
            stroke="#c9ecdc"
            strokeWidth="3"
            strokeLinecap="round"
            opacity=".6"
          >
            <path d="m331 294 18 4m-5 8 25 2m68-48 18-5" />
          </g>
        </>
      ) : polar ? (
        <g stroke="#365c71" strokeWidth="3" strokeLinejoin="round">
          <path d="m150 175 70-115 74 131Z" fill="#d9eee4" />
          <path d="m220 60 9 111 65 20Z" fill="#83b5c3" />
          <path d="m263 191 69-137 78 129Z" fill="#e6f3e9" />
          <path d="m332 54 9 124 69 5Z" fill="#9cc6ce" />
          <path
            d="m185 118 35-58 31 55-29-10-19 21Z"
            fill="#f0f6ec"
            stroke="none"
          />
        </g>
      ) : (
        <g stroke="#3e4856" strokeWidth="3" strokeLinejoin="round">
          <path d="m160 190 65-107 66 107Z" fill="#8e8177" />
          <path d="m253 197 65-148 84 144Z" fill="#b09780" />
          <path d="m318 49 14 131 70 13Z" fill="#766a67" />
          <path d="m294 103 24-54 31 53-21-10-13 18Z" fill="#e6ad70" />
          <path
            d="m319 109-12 29 22 20-13 35"
            fill="none"
            stroke="#f6b66e"
            strokeWidth="5"
          />
        </g>
      )}
    </svg>
  );
}
